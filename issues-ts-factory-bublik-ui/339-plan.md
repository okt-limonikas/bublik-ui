# Implementation Plan for Issue #339: Attachments Inlining into Log

## Executive Summary

This plan details the implementation of inline attachment logs into the main test log view. The feature will merge main test logs with attachment logs (text files with timestamps) and display them as a unified log view.

## Current Architecture Analysis

### Log Data Flow
1. **Fetching Logs**: `useGetLogJsonQuery` → `RootBlock` → `SessionRoot` → `BlockLogPage` → `BlockLogTable`
2. **Log Structure**:
   - `RootBlock.root[0]` = `te-log` block
   - `te-log.content` = [`te-log-meta`, `te-log-entity-list`, `te-log-table`]
   - `te-log-table.data` = `LogTableData[]` with hierarchical structure via `children` property
   - Each entry has: `line_number`, `level`, `entity_name`, `user_name`, `timestamp`, `log_content`

### Current Attachments
- Fetched via `useGetLogAttachmentsQuery` 
- Displayed as dropdown menu in toolbar
- Support: `text` and `packet-capture` types
- Currently opened in new tabs or external tools

## Proposed Solution Architecture

### Phase 1: Backend Changes (Required)

#### 1.1 New API Endpoint
**File**: `libs/services/bublik-api/src/lib/endpoints/log-endpoints.ts`

Add new endpoint to fetch attachment log in JSON format:

```typescript
getAttachmentLogJson: build.query<RootBlock, { 
  id: number;
  attachmentName: string;
}>({
  queryFn: async ({ id, attachmentName }, _api, _extraOptions, baseQuery) => {
    // 1. Fetch attachments metadata
    const attachmentsQuery = await baseQuery(withApiV2(`/results/${id}/attachments`));
    
    // 2. Find the attachment by name
    // 3. Fetch the attachment log JSON from the resolved URL
    // 4. Return as RootBlock format
  }
})
```

**Expected Response Format**:
```json
{
  "version": "v1",
  "root": [
    {
      "type": "te-log",
      "content": [
        {
          "type": "te-log-meta",
          "meta": {
            "artifacts": [...]
          }
        },
        {
          "type": "te-log-table",
          "data": [
            {
              "line_number": 1,
              "level": "INFO",
              "entity_name": "<ATTACHMENT_ENTITY>",
              "user_name": "<ATTACHMENT_USER>",
              "timestamp": {
                "timestamp": 1744081008.02338,
                "formatted": "02:56:48.023"
              },
              "log_content": [
                {
                  "type": "te-log-table-content-text",
                  "content": "log line from attachment"
                }
              ]
            }
            // More log entries...
          ]
        }
      ]
    }
  ]
}
```

#### 1.2 Attachments Metadata Extension
**File**: `libs/shared/types/src/lib/log-json-schema/blocks.ts`

Extend attachment metadata to indicate which attachments are "inlinable":

```typescript
export const LogHeaderArtifactSchema = z.object({
  level: LevelModelSchema,
  artifact: z.string(),
  inlineable: z.boolean().optional().default(false), // NEW FIELD
  log_format: z.enum(['text', 'json']).optional().default('text') // NEW FIELD
});
```

### Phase 2: Frontend Data Layer

#### 2.1 Type Definitions
**File**: `libs/shared/types/src/lib/log-json-schema/blocks.ts`

Add type for inline attachment data:

```typescript
export type InlineAttachmentSource = {
  name: string;
  originalLine: number;
  sourceType: 'main' | 'attachment';
  attachmentId?: string;
};

export type LogTableDataWithInlineSource = LogTableData & {
  inlineSource?: InlineAttachmentSource;
};
```

#### 2.2 API Hook for Attachment Logs
**File**: `libs/services/bublik-api/src/lib/bublikAPI.ts`

Export the new hook:
```typescript
export const {
  // ... existing exports
  useGetAttachmentLogJsonQuery
} = bublikAPI;
```

### Phase 3: Core Merge Algorithm

#### 3.1 Merge Utility Functions
**New File**: `libs/bublik/features/session-log/src/lib/v1/log-blocks/log-table/log-table.merge.ts`

```typescript
import { LogTableData, LogJsonTimestamp } from '@/shared/types';

interface MergeConfig {
  mainLogData: LogTableData[];
  attachmentLogData: LogTableData[];
  attachmentName: string;
}

interface MergedResult {
  mergedData: LogTableData[];
  stats: {
    totalMainLogs: number;
    totalAttachmentLogs: number;
    totalMerged: number;
  };
}

/**
 * Find the closest Step (level 0 entry with user_name === 'Step') 
 * based on timestamp comparison
 */
function findMatchingStep(
  attachmentTimestamp: number,
  mainLogData: LogTableData[]
): LogTableData | null {
  // Filter only level 0 entries (Steps)
  const steps = mainLogData.filter(entry => 
    !entry.children && entry.user_name === 'Step'
  );
  
  if (steps.length === 0) return null;
  
  // Find the step with the closest timestamp before or equal to attachment
  let closestStep: LogTableData | null = null;
  let minTimeDiff = Infinity;
  
  for (const step of steps) {
    const stepTime = step.timestamp.timestamp;
    const timeDiff = attachmentTimestamp - stepTime;
    
    // We want the step that's just before or at the same time as attachment
    if (timeDiff >= 0 && timeDiff < minTimeDiff) {
      minTimeDiff = timeDiff;
      closestStep = step;
    }
  }
  
  return closestStep;
}

/**
 * Convert attachment log to match main log format
 */
function normalizeAttachmentLog(
  attachmentEntry: LogTableData,
  attachmentName: string,
  originalLineNumber: number
): LogTableData {
  return {
    ...attachmentEntry,
    // Mark as attachment entry
    user_name: `[${attachmentName}]`, // Or use a special marker
    inlineSource: {
      name: attachmentName,
      originalLine: originalLineNumber,
      sourceType: 'attachment',
      attachmentId: attachmentName
    }
  };
}

/**
 * Main merge function that combines main log with attachment log
 * 
 * Algorithm:
 * 1. Validate that attachment log has no children (only level 0 entries)
 * 2. For each attachment entry:
 *    a. Find the matching Step in main log based on timestamp
 *    b. Insert as child of that Step (level 1)
 * 3. Sort children by timestamp to maintain chronological order
 * 4. Preserve main log line numbers, use attachment_name.line_number for attachment anchors
 */
export function mergeLogs(config: MergeConfig): MergedResult {
  const { mainLogData, attachmentLogData, attachmentName } = config;
  
  // Validate: Attachment logs must not have children
  const hasChildren = attachmentLogData.some(entry => 
    entry.children && entry.children.length > 0
  );
  
  if (hasChildren) {
    throw new Error('Attachment logs must not have hierarchical structure');
  }
  
  // Deep clone main log to avoid mutation
  const mergedData = JSON.parse(JSON.stringify(mainLogData)) as LogTableData[];
  
  // Track attachment entries that couldn't be merged
  const unmerged: LogTableData[] = [];
  
  // Process each attachment log entry
  for (let i = 0; i < attachmentLogData.length; i++) {
    const attachmentEntry = attachmentLogData[i];
    const timestamp = attachmentEntry.timestamp.timestamp;
    
    // Find the closest Step
    const matchingStep = findMatchingStep(timestamp, mergedData);
    
    if (!matchingStep) {
      unmerged.push(attachmentEntry);
      continue;
    }
    
    // Normalize attachment entry
    const normalizedEntry = normalizeAttachmentLog(
      attachmentEntry,
      attachmentName,
      attachmentEntry.line_number
    );
    
    // Insert as child of the Step
    if (!matchingStep.children) {
      matchingStep.children = [];
    }
    
    matchingStep.children.push(normalizedEntry);
  }
  
  // Sort all children by timestamp
  sortChildrenByTimestamp(mergedData);
  
  // Add unmerged entries at the end as a separate block (optional)
  if (unmerged.length > 0) {
    // Could add as a special "Unmerged Attachments" section
  }
  
  return {
    mergedData,
    stats: {
      totalMainLogs: mainLogData.length,
      totalAttachmentLogs: attachmentLogData.length,
      totalMerged: attachmentLogData.length - unmerged.length
    }
  };
}

/**
 * Recursively sort all children by timestamp
 */
function sortChildrenByTimestamp(data: LogTableData[]): void {
  for (const entry of data) {
    if (entry.children && entry.children.length > 0) {
      entry.children.sort((a, b) => 
        a.timestamp.timestamp - b.timestamp.timestamp
      );
      sortChildrenByTimestamp(entry.children);
    }
  }
}

/**
 * Extract level 0 entries from attachment log
 */
export function extractLevel0Entries(data: LogTableData[]): LogTableData[] {
  return data.filter(entry => !entry.children || entry.children.length === 0);
}
```

#### 3.2 Merge Hook
**File**: `libs/bublik/features/session-log/src/lib/v1/log-blocks/log-table/log-table.merge.hooks.ts`

```typescript
import { useMemo, useState } from 'react';
import { useGetAttachmentLogJsonQuery } from '@/services/bublik-api';
import { mergeLogs, extractLevel0Entries, MergeConfig } from './log-table.merge';
import { LogTableData, RootBlock } from '@/shared/types';

interface UseLogMergeConfig {
  runId: number;
  mainLogData: LogTableData[];
  attachmentsToInline: Array<{ name: string }>;
}

export function useLogMerge(config: UseLogMergeConfig) {
  const { runId, mainLogData, attachmentsToInline } = config;
  const [mergeErrors, setMergeErrors] = useState<string[]>([]);
  
  // Fetch attachment logs
  const attachmentQueries = attachmentsToInline.map(attachment => ({
    name: attachment.name,
    ...useGetAttachmentLogJsonQuery({ 
      id: runId, 
      attachmentName: attachment.name 
    })
  }));
  
  const isLoading = attachmentQueries.some(q => q.isLoading);
  const isFetching = attachmentQueries.some(q => q.isFetching);
  
  // Merge logs
  const mergedData = useMemo(() => {
    if (isLoading || isFetching) return mainLogData;
    
    let currentData = [...mainLogData];
    const errors: string[] = [];
    
    for (const query of attachmentQueries) {
      if (query.data && !query.error) {
        try {
          // Extract log table from RootBlock
          const logBlock = query.data.root.find(b => b.type === 'te-log');
          const tableBlock = logBlock?.content.find(b => b.type === 'te-log-table');
          
          if (tableBlock && 'data' in tableBlock) {
            const attachmentData = extractLevel0Entries(tableBlock.data);
            
            const result = mergeLogs({
              mainLogData: currentData,
              attachmentLogData: attachmentData,
              attachmentName: query.name
            });
            
            currentData = result.mergedData;
          }
        } catch (error) {
          errors.push(`Failed to merge ${query.name}: ${error}`);
        }
      } else if (query.error) {
        errors.push(`Failed to fetch ${query.name}`);
      }
    }
    
    setMergeErrors(errors);
    return currentData;
  }, [mainLogData, attachmentQueries, isLoading, isFetching]);
  
  return {
    mergedData,
    isLoading,
    isFetching,
    mergeErrors
  };
}
```

### Phase 4: UI Components

#### 4.1 Attachment Selection UI
**New File**: `libs/bublik/features/session-log/src/lib/v1/log-blocks/log-table/toolbar/inline-attachments-select.tsx`

```typescript
import { useState } from 'react';
import { ButtonTw, Checkbox, DropdownMenu, Icon } from '@/shared/tailwind-ui';
import { useGetLogAttachmentsQuery } from '@/services/bublik-api';

interface InlineAttachmentsSelectProps {
  runId: number;
  selectedAttachments: string[];
  onToggleAttachment: (name: string) => void;
}

export function InlineAttachmentsSelect({
  runId,
  selectedAttachments,
  onToggleAttachment
}: InlineAttachmentsSelectProps) {
  const { data, isLoading } = useGetLogAttachmentsQuery(runId);
  
  if (isLoading) return null;
  
  const textAttachments = data?.data.attachments.filter(
    a => a.type === 'text'
  ) || [];
  
  if (textAttachments.length === 0) return null;
  
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <ButtonTw variant="secondary" size="xss">
          <Icon name="PaperStack" size={20} className="mr-1.5" />
          Inline Attachments ({selectedAttachments.length})
        </ButtonTw>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent align="start" sideOffset={8}>
        {textAttachments.map(attachment => (
          <div key={attachment.name} className="px-2 py-1">
            <label className="flex items-center gap-2 cursor-pointer">
              <Checkbox
                checked={selectedAttachments.includes(attachment.name)}
                onCheckedChange={() => onToggleAttachment(attachment.name)}
              />
              <span className="text-sm">{attachment.name}</span>
            </label>
          </div>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
```

#### 4.2 Enhanced Log Table
**File**: `libs/bublik/features/session-log/src/lib/v1/log-blocks/log-table/log-table.component.tsx`

Modify `BlockLogTable` to use merged data:

```typescript
import { useLogMerge } from './log-table.merge.hooks';
import { InlineAttachmentsSelect } from './toolbar/inline-attachments-select';

export const BlockLogTable = (props: LogTableBlock & { id: string }) => {
  const { id, data } = props;
  
  // Get run ID from context or props (needs to be passed down)
  const runId = useRunId(); // Need to implement this
  
  // State for selected attachments
  const [selectedAttachments, setSelectedAttachments] = useState<string[]>([]);
  
  // Merge logs
  const { mergedData, isLoading, isFetching, mergeErrors } = useLogMerge({
    runId,
    mainLogData: data,
    attachmentsToInline: selectedAttachments.map(name => ({ name }))
  });
  
  const handleToggleAttachment = (name: string) => {
    setSelectedAttachments(prev => 
      prev.includes(name)
        ? prev.filter(n => n !== name)
        : [...prev, name]
    );
  };
  
  // ... rest of the component with mergedData instead of data
  
  return (
    <div className="flex flex-col items-center">
      <h2 className="w-full text-lg font-semibold text-text-primary mb-2">
        Logs
      </h2>
      
      <LogTableToolbar {...toolbarProps}>
        {/* Add inline attachments selector */}
        <InlineAttachmentsSelect
          runId={runId}
          selectedAttachments={selectedAttachments}
          onToggleAttachment={handleToggleAttachment}
        />
      </LogTableToolbar>
      
      {/* Display merge errors if any */}
      {mergeErrors.length > 0 && (
        <div className="mb-4 p-2 bg-yellow-50 border border-yellow-200 rounded">
          <h4 className="font-semibold text-yellow-800">Merge Warnings:</h4>
          <ul className="text-sm text-yellow-700">
            {mergeErrors.map((error, idx) => (
              <li key={idx}>{error}</li>
            ))}
          </ul>
        </div>
      )}
      
      {/* ... rest of the component */}
    </div>
  );
};
```

#### 4.3 Enhanced Line Number Display
**File**: `libs/bublik/features/session-log/src/lib/v1/log-blocks/log-table/log-table.columns.tsx`

Modify the `LineNumber` component to handle attachment line numbers:

```typescript
const LineNumber = (props: { 
  lineNumber: number; 
  id?: string;
  inlineSource?: LogTableDataWithInlineSource['inlineSource'];
}) => {
  const context = useLogTableContext();
  
  const displayLineNumber = props.inlineSource?.sourceType === 'attachment'
    ? `${props.inlineSource.name}:${props.inlineSource.originalLine}`
    : props.lineNumber.toString();
  
  const rowId = props.inlineSource?.sourceType === 'attachment'
    ? `${props.id}_${props.inlineSource.name}.${props.lineNumber}`
    : `${props.id}_${props.lineNumber}`;
  
  return (
    <button
      id={rowId}
      onClick={() =>
        context?.onLineNumberClick?.(props.id || '1', props.lineNumber)
      }
      className={cn(
        "text-primary hover:underline",
        props.inlineSource?.sourceType === 'attachment' && "text-orange-600"
      )}
      title={props.inlineSource?.sourceType === 'attachment' 
        ? `From attachment: ${props.inlineSource.name}, line ${props.inlineSource.originalLine}`
        : undefined
      }
    >
      {displayLineNumber}
    </button>
  );
};
```

Update the column definition:

```typescript
{
  id: LOG_COLUMNS.lineNumber,
  header: 'No.',
  accessorKey: 'line_number',
  cell: (cell) => {
    const lineNumber = cell.getValue<number>();
    const inlineSource = 'inlineSource' in cell.row.original 
      ? (cell.row.original as LogTableDataWithInlineSource).inlineSource
      : undefined;
    
    return (
      <LineNumber
        lineNumber={lineNumber}
        id={cell.table.options.meta?.id}
        inlineSource={inlineSource}
      />
    );
  },
  meta: { className: 'whitespace-nowrap' }
}
```

#### 4.4 Visual Indicators for Attachment Logs
**File**: `libs/bublik/features/session-log/src/lib/v1/log-blocks/log-table/log-table.utils.ts`

Update `getRowColor` function:

```typescript
export const getRowColor = (row: LogTableData & { inlineSource?: any }) => {
  // Check if this is an attachment row
  if (row.inlineSource?.sourceType === 'attachment') {
    return 'bg-orange-50/80 hover:bg-orange-100/70 border-l-4 border-l-orange-400';
  }
  
  // ... rest of existing logic
};
```

### Phase 5: Context and State Management

#### 5.1 Extend Log Table Context
**File**: `libs/bublik/features/session-log/src/lib/v1/log-blocks/log-table/log-table.context.tsx`

Add run ID to context (needed for fetching attachments):

```typescript
export interface LogTableContext {
  // ... existing properties
  runId?: string;
}

export const LogTableContextProvider = ({ 
  children, 
  runId,
  ...props 
}: LogTableContext & { children: React.ReactNode; runId?: string }) => {
  // ... existing implementation
  
  const value = useMemo(() => ({
    // ... existing values
    runId
  }), [/* ... */]);
  
  return (
    <Context.Provider value={value}>
      {children}
    </Context.Provider>
  );
};
```

### Phase 6: Testing

#### 6.1 Unit Tests
**New File**: `libs/bublik/features/session-log/src/lib/v1/log-blocks/log-table/log-table.merge.spec.ts`

```typescript
import { describe, it, expect } from 'vitest';
import { mergeLogs, extractLevel0Entries } from './log-table.merge';
import { LogTableData } from '@/shared/types';

describe('mergeLogs', () => {
  it('should merge attachment logs into main log based on timestamps', () => {
    // Test case 1: Basic merge
    const mainLogData: LogTableData[] = [
      {
        line_number: 1,
        level: 'INFO',
        entity_name: 'TestEntity',
        user_name: 'Step',
        timestamp: { timestamp: 1000, formatted: '00:00:01.000' },
        log_content: [{ type: 'te-log-table-content-text', content: 'Main log 1' }]
      },
      {
        line_number: 2,
        level: 'INFO',
        entity_name: 'TestEntity',
        user_name: 'Step',
        timestamp: { timestamp: 3000, formatted: '00:00:03.000' },
        log_content: [{ type: 'te-log-table-content-text', content: 'Main log 2' }]
      }
    ];
    
    const attachmentLogData: LogTableData[] = [
      {
        line_number: 1,
        level: 'DEBUG',
        entity_name: 'AttachmentEntity',
        user_name: 'Log',
        timestamp: { timestamp: 2000, formatted: '00:00:02.000' },
        log_content: [{ type: 'te-log-table-content-text', content: 'Attachment log 1' }]
      }
    ];
    
    const result = mergeLogs({
      mainLogData,
      attachmentLogData,
      attachmentName: 'test-attachment.log'
    });
    
    expect(result.mergedData[0].children).toHaveLength(1);
    expect(result.mergedData[0].children![0].inlineSource?.name).toBe('test-attachment.log');
  });
  
  it('should throw error if attachment log has children', () => {
    const mainLogData: LogTableData[] = [];
    const attachmentLogData: LogTableData[] = [
      {
        line_number: 1,
        level: 'INFO',
        entity_name: 'Entity',
        user_name: 'User',
        timestamp: { timestamp: 1000, formatted: '00:00:01.000' },
        log_content: [{ type: 'te-log-table-content-text', content: 'Content' }],
        children: [
          {
            line_number: 2,
            level: 'INFO',
            entity_name: 'Entity',
            user_name: 'User',
            timestamp: { timestamp: 2000, formatted: '00:00:02.000' },
            log_content: [{ type: 'te-log-table-content-text', content: 'Child' }]
          }
        ]
      }
    ];
    
    expect(() => mergeLogs({
      mainLogData,
      attachmentLogData,
      attachmentName: 'test.log'
    })).toThrow('Attachment logs must not have hierarchical structure');
  });
  
  it('should handle multiple attachment logs sorted by timestamp', () => {
    // Test with multiple attachments
  });
});
```

#### 6.2 Integration Tests
**New File**: `libs/bublik/features/session-log/src/lib/v1/log-blocks/log-table/log-table.merge.integration.spec.ts`

Test the full integration with mocked API responses.

#### 6.3 E2E Tests
**New File**: `apps/bublik-ui/e2e/specs/log-attachments-inlining.spec.ts`

Test the full user flow:
1. Navigate to a log view
2. Open inline attachments dropdown
3. Select an attachment
4. Verify attachment logs are merged correctly
5. Verify line numbers and timestamps
6. Verify expand/collapse functionality works

### Phase 7: Performance Considerations

#### 7.1 Optimization Strategies

1. **Lazy Loading**: Only fetch attachment logs when selected
2. **Memoization**: Use `useMemo` for merged data to prevent unnecessary recalculations
3. **Virtual Scrolling**: Already implemented in log table, ensure it works with merged data
4. **Debounce Selection**: Debounce attachment selection changes to prevent rapid refetches

#### 7.2 Error Handling

1. **Graceful Degradation**: If attachment log fetch fails, display warning and continue with main log
2. **Timeout Handling**: Set reasonable timeouts for attachment log fetching
3. **Validation**: Validate attachment log format before merging

### Phase 8: Future Enhancements

1. **Multiple Attachments**: Support merging multiple attachments simultaneously
2. **Color Coding**: Different colors for different attachments
3. **Filter by Attachment**: Add filter options to show/hide specific attachments
4. **Diff View**: Side-by-side comparison of main and attachment logs (mentioned in issue)
5. **Attachment Grouping**: Group attachment logs under a parent node (Scenario B from issue)

## Implementation Checklist

### Backend (API)
- [ ] Create new endpoint: `GET /api/v2/results/{id}/attachment/{name}/json`
- [ ] Extend attachment metadata with `inlineable` flag
- [ ] Implement JSON format conversion for attachment logs
- [ ] Add validation for attachment log format

### Frontend - Data Layer
- [ ] Add `useGetAttachmentLogJsonQuery` hook
- [ ] Define `InlineAttachmentSource` type
- [ ] Extend `LogTableData` type with optional `inlineSource`

### Frontend - Core Logic
- [ ] Implement `mergeLogs` utility function
- [ ] Implement `findMatchingStep` helper
- [ ] Implement `normalizeAttachmentLog` helper
- [ ] Implement `sortChildrenByTimestamp` helper
- [ ] Implement `extractLevel0Entries` helper
- [ ] Implement `useLogMerge` hook

### Frontend - UI Components
- [ ] Create `InlineAttachmentsSelect` component
- [ ] Modify `BlockLogTable` to use merged data
- [ ] Update `LineNumber` component for attachment line numbers
- [ ] Update `getRowColor` for visual distinction
- [ ] Add merge error display component

### Frontend - Context & State
- [ ] Extend `LogTableContext` with `runId`
- [ ] Update context providers to pass `runId`
- [ ] Implement state for selected attachments

### Testing
- [ ] Unit tests for merge algorithm
- [ ] Unit tests for helper functions
- [ ] Integration tests with mocked API
- [ ] E2E tests for user flow
- [ ] Performance tests for large logs

### Documentation
- [ ] Update API documentation
- [ ] Add inline code comments
- [ ] Update user documentation
- [ ] Add feature description to README

## Risks and Mitigations

### Risk 1: Performance Impact
**Mitigation**: Implement lazy loading and memoization; only fetch attachment logs when selected

### Risk 2: Complex Merge Logic
**Mitigation**: Thorough unit testing; start with simple merge algorithm, iterate based on feedback

### Risk 3: Line Number Conflicts
**Mitigation**: Use `attachment_name.line_number` format for HTML anchors; visual distinction for attachment lines

### Risk 4: Attachment Log Format Variability
**Mitigation**: Implement robust validation and error handling; provide clear error messages

### Risk 5: State Management Complexity
**Mitigation**: Use React hooks for local state; keep merge logic pure and testable

## Rollback Plan

If issues arise during deployment:

1. Feature flag the inline attachments functionality
2. Disable via configuration without code changes
3. Revert to legacy attachment viewing (dropdown menu)
4. Database rollback not required (no schema changes)

## Success Criteria

1. Users can select attachments to inline from dropdown
2. Attachment logs are merged correctly based on timestamps
3. Line numbers are preserved and distinguishable
4. Merge errors are displayed gracefully
5. Performance impact is minimal (< 200ms for merge operation)
6. All new code has > 80% test coverage
7. E2E tests pass for all merge scenarios

## Timeline Estimate

- Backend API changes: 2-3 days
- Frontend data layer: 1-2 days
- Core merge algorithm: 3-4 days
- UI components: 3-4 days
- Testing: 3-4 days
- Documentation and refinement: 1-2 days

**Total**: 13-19 days (approx. 2-3 weeks)

## Notes from Issue Discussion

### Clarifications from Comments:
1. **Level 0**: Where Steps exist (User Name Steps)
2. **Level 1**: Where attachment logs should be inserted (one level deeper than level 0)
3. **Step Definition**: User Name Step (test step)
4. **Attachment Hierarchy**: Attachment logs MUST NOT have children for now
5. **Preferred Approach**: Scenario B - create grouping nodes if needed

### Line Number Options Evaluated:
1. ❌ Ignore attachment line numbers - **Not acceptable**
2. ❌ Composite format "main.attachment" - **Has issues with multiple attachments and JSON schema**
3. ✅ Use "attachment_name.line_number" format - **Selected approach**

### Merge Algorithm Details:
- Find the Step (level 0 entry) based on timestamp
- Insert attachment logs at level 1 (as children)
- Maintain chronological order within children
- Preserve main log line numbers

---

**Document Version**: 1.0  
**Last Updated**: 2025-01-16  
**Author**: AI Assistant  
**Status**: Ready for Review
