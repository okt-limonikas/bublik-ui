# Plan to Fix Issue #285: Folding Logs May Not Work Correctly from the Second Page

## Issue Summary
Log folding (expand/collapse functionality) fails when logs are split across multiple pages. The expanded state is initialized only on the first page and persists across page changes, but row IDs on different pages have different line numbers, causing the expanded state to reference non-existent rows.

## Root Cause Analysis

### How Log Folding Works
1. **Row ID Generation**: Row IDs are generated using `getRowIdCreator(id)` which creates IDs in the format `{tableId}_{line_number}`
   - `tableId`: block index (e.g., "0", "1")
   - `line_number`: the line number from the log (unique across all pages)

2. **Expanded State Initialization**: The `useLogTableExpandedState` hook calls `getInitialExpandedState(id, data, 1)` which:
   - Creates a map of row IDs to be expanded based on depth and MI (measurement) descendants
   - This happens only once when the component mounts
   - Uses the current `data` at mount time

3. **Pagination**: 
   - Pagination is managed by `LogTablePaginationContext`
   - When page changes, the `data` prop changes because API returns different pages
   - Line numbers are different on each page (e.g., page 1: lines 1-100, page 2: lines 101-200)

### The Problem
1. On page 1, expanded state is initialized with row IDs like `{"0_100": true, "0_200": true}`
2. When user navigates to page 2, the data changes to show lines 101-200
3. The expanded state still contains row IDs from page 1 (e.g., `"0_100": true`)
4. Row ID `"0_100"` doesn't exist on page 2 (which has lines 101-200)
5. TanStack Table's expand logic checks expanded state and tries to expand non-existent rows
6. Folding/unfolding buttons don't work correctly because the expanded state is out of sync

### Code Flow
```typescript
// log-table.hooks.ts - Expanded state is initialized once
export const useLogTableExpandedState = ({ id, data }: UseLogTableExpandedState) => {
  const [expanded, setExpanded] = useState<ExpandedState>(
    getInitialExpandedState(id, data, 1)  // Only runs on mount
  );
  return { expanded, setExpanded };
};

// log-table.component.tsx - Data changes on page navigation but expanded state doesn't
const { setExpanded, expanded } = useLogTableExpandedState({ id, data });
// data prop changes when page changes, but expanded state stays the same
```

## Files to Modify

### Primary Files
1. **`libs/bublik/features/session-log/src/lib/v1/log-blocks/log-table/log-table.hooks.ts`**
   - Modify `useLogTableExpandedState` hook
   - Add logic to reset expanded state when data changes

2. **`libs/bublik/features/session-log/src/lib/v1/log-blocks/log-table/log-table.component.tsx`**
   - May need minor adjustments if we need to pass pagination state to the expanded state hook

### Optional Files (if needed for testing)
3. **`libs/bublik/features/session-log/src/lib/v1/log-blocks/log-table/log-table.hooks.spec.ts`** (create if doesn't exist)
   - Add unit tests for the fix

## Code Changes Needed

### Option 1: Reset Expanded State on Data Change (RECOMMENDED)

**Rationale**: When page changes, the rows are completely different, so it makes sense to reset the expanded state. This is the simplest and most reliable solution.

**Implementation**:

```typescript
// In log-table.hooks.ts
export const useLogTableExpandedState = ({ id, data }: UseLogTableExpandedState) => {
  const [expanded, setExpanded] = useState<ExpandedState>({});
  
  // Reset expanded state when data changes (indicating page change)
  useEffect(() => {
    setExpanded(getInitialExpandedState(id, data, 1));
  }, [id, data]); // Add data as a dependency

  return { expanded, setExpanded };
};
```

**Pros**:
- Simple implementation
- Ensures expanded state is always in sync with current page
- No stale state issues
- Clear behavior for users

**Cons**:
- User loses expanded state when navigating between pages

---

### Option 2: Reset Expanded State on Pagination Change

If we want to be more explicit about when the state resets:

```typescript
// In log-table.hooks.ts
export const useLogTableExpandedState = ({
  id, 
  data,
  pageIndex  // Add pageIndex parameter
}: UseLogTableExpandedState & { pageIndex?: number }) => {
  const [expanded, setExpanded] = useState<ExpandedState>(
    getInitialExpandedState(id, data, 1)
  );
  
  // Reset expanded state when page index changes
  useEffect(() => {
    setExpanded(getInitialExpandedState(id, data, 1));
  }, [pageIndex, id]); // Only reset on page change, not every data update
  
  return { expanded, setExpanded };
};
```

**Pros**:
- More explicit about when reset happens
- Doesn't reset if data changes for other reasons (though unlikely)
- Preserves state for other data changes

**Cons**:
- Requires passing pageIndex from parent component
- Slightly more complex

---

### Option 3: Smart Expanded State Management (Advanced)

Only expand rows that exist in the current data:

```typescript
// In log-table.hooks.ts
export const useLogTableExpandedState = ({ id, data }: UseLogTableExpandedState) => {
  const [expanded, setExpanded] = useState<ExpandedState>({});
  
  // Filter expanded state to only include rows that exist in current data
  const validExpandedState = useMemo(() => {
    const rowIdCreator = getRowIdCreator(id);
    const allRowIds = new Set(flatten(data).map(row => rowIdCreator(row)));
    
    return Object.fromEntries(
      Object.entries(expanded)
        .filter(([rowId]) => allRowIds.has(rowId))
    );
  }, [id, data, expanded]);
  
  return { expanded: validExpandedState, setExpanded };
};
```

**Pros**:
- Preserves user's expanded state across pages when possible
- More sophisticated approach

**Cons**:
- More complex logic
- May still be confusing if expanded state doesn't match visible rows
- Performance overhead with useMemo on every render

---

## Recommended Implementation Approach

We recommend **Option 1** (Reset Expanded State on Data Change) for the following reasons:

1. **Simplicity**: Easy to implement and maintain
2. **Reliability**: No edge cases or complex state management
3. **User Expectation**: When page changes, users expect a fresh view
4. **Performance**: Minimal performance overhead

### Implementation Steps

1. **Add useEffect import** to `log-table.hooks.ts`
2. **Modify `useLogTableExpandedState`** hook to reset expanded state when data changes
3. **Test the fix** with paginated logs
4. **Add unit tests** if needed

### Code Changes

```typescript
// In libs/bublik/features/session-log/src/lib/v1/log-blocks/log-table/log-table.hooks.ts

// Import useEffect at the top
import { useCallback, useEffect, useMemo, useState } from 'react';

// Modify the useLogTableExpandedState hook
export const useLogTableExpandedState = ({
  id,
  data
}: UseLogTableExpandedState) => {
  const [expanded, setExpanded] = useState<ExpandedState>(
    getInitialExpandedState(id, data, 1)
  );

  // Reset expanded state when data changes (e.g., when page changes)
  useEffect(() => {
    setExpanded(getInitialExpandedState(id, data, 1));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, data]);

  return { expanded, setExpanded };
};
```

### Alternative: Using useMemo to avoid double rendering

If we want to avoid the double rendering caused by useEffect + setState:

```typescript
// In libs/bublik/features/session-log/src/lib/v1/log-blocks/log-table/log-table.hooks.ts

export const useLogTableExpandedState = ({
  id,
  data
}: UseLogTableExpandedState) => {
  const expanded = useMemo(
    () => getInitialExpandedState(id, data, 1),
    [id, data]
  );
  
  const [manualExpanded, setManualExpanded] = useState<ExpandedState>(expanded);
  
  // Sync expanded state when data changes
  useEffect(() => {
    setManualExpanded(expanded);
  }, [expanded]);

  const setExpanded = useCallback((updater: Updater<ExpandedState>) => {
    setManualExpanded(updater);
  }, []);

  return { expanded: manualExpanded, setExpanded };
};
```

**Note**: This approach preserves user's manual expand/collapse changes while also resetting on page change. However, the simple Option 1 is likely sufficient.

## Testing Strategy

### Manual Testing
1. Create a test run with logs that span multiple pages
2. Navigate to page 1 and expand some rows
3. Navigate to page 2
4. Verify that:
   - Rows on page 2 can be expanded/collapsed correctly
   - The expand/collapse buttons work properly
   - No console errors related to row IDs
5. Navigate back to page 1
6. Verify that expanded state was reset (rows are collapsed to default state)

### Unit Tests (Optional but Recommended)

```typescript
// In libs/bublik/features/session-log/src/lib/v1/log-blocks/log-table/log-table.hooks.spec.ts

describe('useLogTableExpandedState with pagination', () => {
  it('should reset expanded state when data changes', () => {
    const { result } = renderHook(
      ({ id, data }) => useLogTableExpandedState({ id, data }),
      {
        initialProps: {
          id: '0',
          data: mockDataPage1 // Data from page 1
        }
      }
    );

    // Initial expanded state is set
    expect(Object.keys(result.current.expanded).length).toBeGreaterThan(0);

    // Change data (simulating page change)
    rerender({ id: '0', data: mockDataPage2 });

    // Expanded state should be reset based on new data
    const expandedKeys = Object.keys(result.current.expanded);
    const rowIdsInPage2 = mockDataPage2.map(row => `0_${row.line_number}`);
    
    expandedKeys.forEach(key => {
      expect(rowIdsInPage2).toContain(key);
    });
  });

  it('should handle data changes correctly', () => {
    const { result, rerender } = renderHook(
      ({ id, data }) => useLogTableExpandedState({ id, data }),
      {
        initialProps: {
          id: '0',
          data: mockDataPage1
        }
      }
    );

    // Manually expand a row
    act(() => {
      result.current.setExpanded({ '0_100': true });
    });

    // Change data
    rerender({ id: '0', data: mockDataPage2 });

    // Expanded state should be reset based on new data
    expect(result.current.expanded).not.toEqual({ '0_100': true });
  });
});
```

## Edge Cases to Consider

1. **Empty Pages**: Ensure expanded state is handled correctly when a page has no data
2. **Single Page**: Ensure the fix doesn't break behavior for logs with only one page
3. **Large Datasets**: Verify performance with large amounts of log data
4. **Deep Nesting**: Ensure the fix works with deeply nested log entries
5. **Filter Changes**: If filters are applied that change the data, expanded state should reset appropriately

## Migration Notes

This fix changes the behavior slightly: expanded state will now be reset when navigating between pages. This is actually the correct behavior and aligns with user expectations.

## Rollback Plan

If issues arise, the change can be easily reverted by removing the useEffect from `useLogTableExpandedState`.

## Future Enhancements

Consider adding these enhancements in future iterations:
1. **Persist Expanded State per Page**: Use a map to store expanded state for each page
2. **URL State**: Store expanded state in URL so it's shareable
3. **Smart Expand Remembering**: Remember which rows were expanded and try to expand similar rows on other pages
4. **Configuration**: Add a user setting to choose whether to reset or preserve expanded state across pages

## Summary

The fix is straightforward: reset the expanded state whenever the data prop changes, which happens when the user navigates to a different page of logs. This ensures that the expanded state is always in sync with the currently visible rows, fixing the folding/collapse functionality issue on second and subsequent pages.
