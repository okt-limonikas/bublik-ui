# Plan for Issue #357: Make sidebar help contextually relevant to current view

## Problem Summary

When users are already on a view (e.g., Run Details, Log, or Result pages), the help dialog in the sidebar shows generic instructions on how to GET to that page rather than describing what's actually displayed on the page. This makes the help unhelpful for users who are already there.

### Current Behavior
- User is on `/runs/49048` (Run Details page)
- User clicks help icon (question mark) on the "Run" menu item in sidebar
- Dialog shows: "Go to the Runs page" → "Select the run you want to view"
- User is already there, so this information is useless

### Expected Behavior
- Help dialog should describe what content is available on the current page
- Should explain the data fields, buttons, and navigation options available on the page
- Should be context-aware and adapt to the actual page content
- When on a Run page, explain what the run shows and what actions are available
- When on a Log page, explain the log viewing modes and features
- When on a Result page, explain the measurements and charting capabilities

## Root Cause Analysis

1. **Static Dialog Content**: The `RunDetailsDialog`, `LogDialog`, and `ResultMeasurementsDialog` components in `instruction-dialog.tsx` contain static content that describes how to navigate to the page, not what's on it.

2. **No Context Awareness**: The dialog components don't access the current page's data or route state to provide contextual information.

3. **Architecture**: The sidebar navigation is configured in `main-nav.tsx` with hardcoded `dialogContent` components that don't change based on the current route or page data.

4. **Missing Integration**: The API data available for each page (e.g., `RunDetailsAPIResponse`, `ResultInfoAPIResponse`) is not exposed to the help dialog system.

## Current Implementation Analysis

### Key Files Identified

1. **`/libs/bublik/features/sidebar/src/lib/main-nav/main-nav.tsx`**
   - Defines sidebar navigation structure
   - Contains hardcoded `dialogContent` for each menu item
   - Lines 71-94: Run menu item with RunDetailsDialog
   - Lines 96-145: Log menu item with LogDialog
   - Lines 197-252: Result menu item with ResultMeasurementsDialog

2. **`/libs/bublik/features/sidebar/src/lib/main-nav/instruction-dialog.tsx`**
   - Contains all dialog content components
   - Lines 101-120: RunDetailsDialog - static "how to get there" instructions
   - Lines 143-167: LogDialog - static instructions
   - Lines 242-266: ResultMeasurementsDialog - static instructions

3. **`/libs/bublik/features/sidebar/src/lib/nav-link/nav-link.tsx`**
   - Implements NavLink component that renders menu items
   - Lines 111-259: NavLink component
   - Lines 200-210: Renders help button with question mark icon
   - Lines 245-256: Dialog rendering logic

4. **API Hooks Available**
   - `useGetRunDetailsQuery(runId)` - Returns `RunDetailsAPIResponse`
   - `useGetTreeByRunIdQuery(runId)` - Returns tree data for logs
   - `useGetResultInfoQuery(resultId)` - Returns `ResultInfoAPIResponse`

5. **Type Definitions**
   - `RunDetailsAPIResponse`: Contains id, main_package, start, finish, duration, status, conclusion, conclusion_reason, branches, labels, tags, etc.
   - `ResultInfoAPIResponse`: Contains result information
   - `TreeDataAPIResponse`: Contains log tree structure

6. **Route Parameter Access**
   - Components can use `useParams()` hook to access route parameters
   - Run page: `runId` parameter
   - Log page: `runId` parameter
   - Result page: `runId` and `resultId` parameters

## Files to Modify

### 1. Primary Implementation Files

#### `/libs/bublik/features/sidebar/src/lib/main-nav/instruction-dialog.tsx`
- **Purpose**: Contains all dialog content components
- **Changes**: 
  - Create new context-aware dialog components
  - Keep existing components for pages where they make sense
  - Add new components that fetch and display page-specific data
  - Reuse existing images where applicable

#### `/libs/bublik/features/sidebar/src/lib/main-nav/main-nav.tsx`
- **Purpose**: Defines sidebar navigation structure
- **Changes**:
  - Update `Run` menu item to use new context-aware dialog
  - Update `Log` menu item to use new context-aware dialog
  - Update `Result` menu item to use context-aware dialog
  - Keep RunReportDialog as-is (it's already contextual)

### 2. New Files to Create

#### `/libs/bublik/features/sidebar/src/lib/main-nav/contextual-help/` (NEW DIRECTORY)
- **Purpose**: Organize contextual help components

#### `/libs/bublik/features/sidebar/src/lib/main-nav/contextual-help/run-details-help.tsx` (NEW)
- **Purpose**: Context-aware help for Run Details page
- **Content**: 
  - Uses `useParams` to get `runId`
  - Uses `useGetRunDetailsQuery(runId)` to fetch data
  - Displays a formatted explanation of the page content
  - Handles loading and error states gracefully

#### `/libs/bublik/features/sidebar/src/lib/main-nav/contextual-help/log-help.tsx` (NEW)
- **Purpose**: Context-aware help for Log page
- **Content**: 
  - Uses `useParams` to get `runId`
  - Uses `useGetRunDetailsQuery(runId)` to get basic run info
  - Describes log viewing modes and available actions

#### `/libs/bublik/features/sidebar/src/lib/main-nav/contextual-help/result-help.tsx` (NEW)
- **Purpose**: Context-aware help for Result/Measurements page
- **Content**: 
  - Uses `useParams` to get `runId` and `resultId`
  - Uses `useGetResultInfoQuery(resultId)` to fetch result data
  - Describes measurement viewing modes and charts

#### `/libs/bublik/features/sidebar/src/lib/main-nav/contextual-help/index.ts` (NEW)
- **Purpose**: Export all contextual help components

## Implementation Approach

### Phase 1: Create Infrastructure

1. **Create contextual help directory structure**
   ```bash
   mkdir -p libs/bublik/features/sidebar/src/lib/main-nav/contextual-help
   ```

2. **Create base component: RunDetailsHelp**
   ```tsx
   // Key features:
   - Uses useParams to get runId
   - Uses useGetRunDetailsQuery(runId) to fetch data
   - Displays a formatted explanation of the page content
   - Handles loading and error states gracefully
   - Shows step-by-step explanation of:
     * Overview of what the page shows
     * Information fields (ID, package, times, status, etc.)
     * Available actions and buttons
     * Tags and categorization
   ```

### Phase 2: Update Run Details Help

3. **Implement RunDetailsHelp component**
   ```tsx
   export function RunDetailsHelp() {
     const { runId } = useParams<{ runId: string }>();
     const { data, isLoading, isError } = useGetRunDetailsQuery(
       runId ? Number(runId) : skipToken
     );

     if (isLoading) {
       return <LoadingState />;
     }

     if (isError || !data) {
       // Fallback to generic help if data not available
       return <RunDetailsDialog />;
     }

     const steps = [
       {
         title: 'Run Information',
         description: `This page shows details for run ${data.id} from package ${data.main_package}. The run started at ${data.start} and finished at ${data.finish} with a duration of ${data.duration}.`,
         // image: existing or new image
       },
       {
         title: 'Status and Conclusion',
         description: `The run has a status of "${data.status}" and concluded as "${data.conclusion}"${data.conclusion_reason ? ` with reason: ${data.conclusion_reason}` : '.'}`,
         // image: existing or new image
       },
       {
         title: 'Available Actions',
         description: 'From this page you can: Copy the run ID for comparison, Mark as compromised, Compare with other runs, View the run report, Go to the log, and Toggle between full and collapsed view modes.',
         // image: existing or new image
       },
       {
         title: 'Tags and Categorization',
         description: `The run is organized by branches (${data.branches.join(', ')}), revisions, labels (${data.labels.join(', ')}), and tags.`,
         // image: existing or new image
       }
     ];

     return (
       <InstructionDialog
         dialogTitle={`Run Details: ${data.id}`}
         dialogDescription="Learn about the information displayed on this page."
         steps={steps}
       />
     );
   }
   ```

4. **Update main-nav.tsx**
   ```tsx
   import { RunDetailsHelp } from './contextual-help/run-details-help';

   const mainMenu: SidebarItem[] = [
     // ...
     {
       label: 'Run',
       to: '/runs',
       icon: <Icon name="PieChart" />,
       pattern: [{ path: '/runs/:runId' }],
       whenMatched: true,
       dialogContent: <RunDetailsHelp />, // Changed from RunDetailsDialog
       subitems: [
         {
           label: 'Details',
           icon: <Icon name="Paper" className="w-6 h-6" />,
           to: '/runs',
           whenMatched: true,
           dialogContent: <RunDetailsHelp />, // Changed from RunDetailsDialog
           pattern: { path: '/runs/:runId' }
         },
         {
           label: 'Report',
           icon: <Icon name="LineChart" />,
           to: '/runs',
           whenMatched: true,
           pattern: { path: '/runs/:runId/report' },
           dialogContent: <RunReportDialog /> // Keep as is - already contextual
         }
       ]
     },
     // ...
   ];
   ```

### Phase 3: Extend to Log Page

5. **Implement LogHelp component**
   ```tsx
   export function LogHelp() {
     const { runId } = useParams<{ runId: string }>();
     const { data: details, isLoading, isError } = useGetRunDetailsQuery(
       runId ? Number(runId) : skipToken
     );

     if (isLoading) {
       return <LoadingState />;
     }

     if (isError || !details) {
       return <LogDialog />; // Fallback to generic help
     }

     const steps = [
       {
         title: 'Log Information',
         description: `This page shows the log for run ${details.id} (${details.main_package}). You can view the log in different modes: Tree+info+log, Tree+log, Info+log, or Log only.`,
         // image: existing or new image
       },
       {
         title: 'Navigation',
         description: 'Use the tree view on the left to navigate through test results. Click on any test to see its log. Use the info panel to view run details.',
         // image: existing or new image
       },
       {
         title: 'Available Actions',
         description: 'From this page you can: Toggle view modes, Navigate to the run details page, Copy short URL, and more.',
         // image: existing or new image
       }
     ];

     return (
       <InstructionDialog
         dialogTitle={`Log: ${details.main_package}`}
         dialogDescription="Learn about viewing and navigating logs."
         steps={steps}
       />
     );
   }
   ```

6. **Update main-nav.tsx for Log**
   ```tsx
   import { LogHelp } from './contextual-help/log-help';

   {
     label: 'Log',
     icon: <Icon name="Paper" size={28} />,
     to: '/log',
     pattern: { path: '/log/:runId' },
     whenMatched: true,
     dialogContent: <LogHelp />, // Changed from LogDialog
     subitems: [
       {
         label: 'Tree+info+log',
         icon: <Icon name="LayoutLogHeaderSidebar" />,
         to: '/log',
         whenMatched: true,
         dialogContent: <LogHelp />, // Changed from LogDialog
         pattern: {
           path: '/log/:runId',
           search: { mode: LogPageMode.TreeAndInfoAndLog }
         }
       },
       // ... other log subitems with same dialogContent
     ]
   }
   ```

### Phase 4: Extend to Result Page

7. **Implement ResultHelp component**
   ```tsx
   export function ResultHelp() {
     const { runId, resultId } = useParams<MeasurementsRouterParams>();
     const { data, isLoading, isError } = useGetResultInfoQuery(
       resultId ?? skipToken
     );

     if (isLoading) {
       return <LoadingState />;
     }

     if (isError || !data) {
       return <ResultMeasurementsDialog />; // Fallback to generic help
     }

     const steps = [
       {
         title: 'Result Measurements',
         description: `This page shows measurements for ${data.result.name}. You can view the data in different modes: Charts + Tables, Charts || Tables, Measurement Tables, or Stacked Charts.`,
         // image: existing or new image
       },
       {
         title: 'Chart Types',
         description: 'Charts display measurement data with various visualization options. Use the legend to filter series.',
         // image: existing or new image
       },
       {
         title: 'Available Actions',
         description: 'From this page you can: Toggle view modes, Navigate to log, Navigate to history, and more.',
         // image: existing or new image
       }
     ];

     return (
       <InstructionDialog
         dialogTitle={`Result: ${data.result.name}`}
         dialogDescription="Learn about viewing result measurements."
         steps={steps}
       />
     );
   }
   ```

8. **Update main-nav.tsx for Result**
   ```tsx
   import { ResultHelp } from './contextual-help/result-help';

   {
     label: 'Result',
     to: '/runs/:runId/results/:resultId/measurements',
     icon: <Icon name="LineGraph" />,
     whenMatched: true,
     dialogContent: <ResultHelp />, // Changed from ResultMeasurementsDialog
     pattern: {
       path: '/runs/:runId/results/:resultId/measurements',
       search: { mode: MeasurementsMode.Default }
     },
     subitems: [
       {
         label: 'Charts + Tables',
         icon: <Icon name="LineChart" />,
         to: '/runs',
         whenMatched: true,
         dialogContent: <ResultHelp />, // Changed from ResultMeasurementsDialog
         pattern: {
           path: '/runs/:runId/results/:resultId/measurements',
           search: { mode: MeasurementsMode.Default }
         }
       },
       // ... other result subitems with same dialogContent
     ]
   }
   ```

### Phase 5: Create Export Index

9. **Create index.ts in contextual-help directory**
   ```tsx
   export { RunDetailsHelp } from './run-details-help';
   export { LogHelp } from './log-help';
   export { ResultHelp } from './result-help';
   ```

### Phase 6: Handle Edge Cases

10. **Create Loading State Component**
   - Create a simple loading state that displays when data is being fetched
   - Could reuse existing loading patterns from the codebase

11. **Handle Error States**
   - Gracefully fall back to generic help dialogs when data is unavailable
   - Display appropriate error messages

## Code Changes - Detailed Design

### Component: RunDetailsHelp.tsx

```tsx
/* SPDX-License-Identifier: Apache-2.0 */
/* SPDX-FileCopyrightText: 2021-2023 OKTET Labs Ltd. */
import { skipToken } from '@reduxjs/toolkit/query';
import { useParams } from 'react-router-dom';

import { InstructionDialog } from '@/shared/tailwind-ui';
import { useGetRunDetailsQuery } from '@/services/bublik-api';

// Import existing images where applicable
import runSidebar from '../images/runs/go-to-run-details.webp';

export function RunDetailsHelp() {
  const { runId } = useParams<{ runId: string }>();
  const { data, isLoading, isError } = useGetRunDetailsQuery(
    runId ? Number(runId) : skipToken
  );

  if (isLoading) {
    return (
      <InstructionDialog
        dialogTitle="Run Details"
        dialogDescription="Loading run information..."
        steps={[
          {
            title: 'Loading...',
            description: 'Please wait while we fetch the run details.',
            image: null
          }
        ]}
      />
    );
  }

  if (isError || !data) {
    // Import fallback dialog
    const { RunDetailsDialog } = require('../instruction-dialog');
    return <RunDetailsDialog />;
  }

  const steps = [
    {
      title: 'Run Information',
      description: `This page shows details for run ${data.id} from package ${data.main_package}. The run started at ${data.start} and finished at ${data.finish} with a duration of ${data.duration}.`,
      image: runSidebar
    },
    {
      title: 'Status and Conclusion',
      description: `The run has a status of "${data.status}" and concluded as "${data.conclusion}"${data.conclusion_reason ? ` with reason: ${data.conclusion_reason}` : '.'} You can see the status badge at the top of the info section.`,
      image: runSidebar // Reuse existing image or create new one
    },
    {
      title: 'Available Actions',
      description: 'From this page you can: Copy the run ID for comparison, Mark as compromised, Compare with other runs, View the run report, Go to the log, and Toggle between full and collapsed view modes.',
      image: runSidebar // Reuse existing image or create new one
    },
    {
      title: 'Tags and Categorization',
      description: `The run is organized by branches (${data.branches.join(', ') || 'none'}), revisions (${data.revisions.length > 0 ? data.revisions.length + ' items' : 'none'}), labels (${data.labels.join(', ') || 'none'}), and tags (${[...data.important_tags, ...data.relevant_tags].join(', ') || 'none'}). These help filter and group related runs.`,
      image: runSidebar // Reuse existing image or create new one
    }
  ];

  return (
    <InstructionDialog
      dialogTitle={`Run Details: ${data.id}`}
      dialogDescription="Learn about the information displayed on this page."
      steps={steps}
    />
  );
}
```

### Component: LogHelp.tsx

```tsx
/* SPDX-License-Identifier: Apache-2.0 */
/* SPDX-FileCopyrightText: 2021-2023 OKTET Labs Ltd. */
import { skipToken } from '@reduxjs/toolkit/query';
import { useParams } from 'react-router-dom';

import { InstructionDialog } from '@/shared/tailwind-ui';
import { useGetRunDetailsQuery } from '@/services/bublik-api';

// Import existing images where applicable
import logLinkFromRunDetails from '../images/log/log-from-run.webp';

export function LogHelp() {
  const { runId } = useParams<{ runId: string }>();
  const { data: details, isLoading, isError } = useGetRunDetailsQuery(
    runId ? Number(runId) : skipToken
  );

  if (isLoading) {
    return (
      <InstructionDialog
        dialogTitle="Log"
        dialogDescription="Loading log information..."
        steps={[
          {
            title: 'Loading...',
            description: 'Please wait while we fetch the log details.',
            image: null
          }
        ]}
      />
    );
  }

  if (isError || !details) {
    const { LogDialog } = require('../instruction-dialog');
    return <LogDialog />;
  }

  const steps = [
    {
      title: 'Log Information',
      description: `This page shows the log for run ${details.id} (${details.main_package}). The run started at ${details.start} and had a duration of ${details.duration}. You can view the log in different modes: Tree+info+log, Tree+log, Info+log, or Log only.`,
      image: logLinkFromRunDetails
    },
    {
      title: 'Navigation',
      description: 'Use the tree view on the left to navigate through test results. Click on any test to see its log. The info panel shows run details including status, conclusion, and metadata.',
      image: logLinkFromRunDetails
    },
    {
      title: 'Available Actions',
      description: 'From this page you can: Toggle between different view modes, Navigate back to the run details page, Copy short URL to share this log, and View attachments if available.',
      image: logLinkFromRunDetails
    }
  ];

  return (
    <InstructionDialog
      dialogTitle={`Log: ${details.main_package}`}
      dialogDescription="Learn about viewing and navigating logs."
      steps={steps}
    />
  );
}
```

### Component: ResultHelp.tsx

```tsx
/* SPDX-License-Identifier: Apache-2.0 */
/* SPDX-FileCopyrightText: 2021-2023 OKTET Labs Ltd. */
import { skipToken } from '@reduxjs/toolkit/query';
import { useParams } from 'react-router-dom';

import { InstructionDialog } from '@/shared/tailwind-ui';
import { useGetResultInfoQuery } from '@/services/bublik-api';
import { MeasurementsRouterParams } from '@/shared/types';

// Import existing images where applicable
import resultLinkFromLog from '../images/result/result-from-log.webp';

export function ResultHelp() {
  const { runId, resultId } = useParams<MeasurementsRouterParams>();
  const { data, isLoading, isError } = useGetResultInfoQuery(
    resultId ?? skipToken
  );

  if (isLoading) {
    return (
      <InstructionDialog
        dialogTitle="Result"
        dialogDescription="Loading result information..."
        steps={[
          {
            title: 'Loading...',
            description: 'Please wait while we fetch the result details.',
            image: null
          }
        ]}
      />
    );
  }

  if (isError || !data) {
    const { ResultMeasurementsDialog } = require('../instruction-dialog');
    return <ResultMeasurementsDialog />;
  }

  const steps = [
    {
      title: 'Result Measurements',
      description: `This page shows measurements for ${data.result.name}. The result is part of run ${runId}. You can view the data in different modes: Charts + Tables, Charts || Tables, Measurement Tables, or Stacked Charts.`,
      image: resultLinkFromLog
    },
    {
      title: 'Chart Types',
      description: 'Charts display measurement data with various visualization options including line charts, bar charts, and more. Use the legend to filter or highlight specific data series.',
      image: resultLinkFromLog
    },
    {
      title: 'Available Actions',
      description: 'From this page you can: Toggle between different view modes, Navigate to the log for this result, Navigate to history, and Export data if available.',
      image: resultLinkFromLog
    }
  ];

  return (
    <InstructionDialog
      dialogTitle={`Result: ${data.result.name}`}
      dialogDescription="Learn about viewing result measurements."
      steps={steps}
    />
  );
}
```

## Tests to Add/Update

### Unit Tests

Since there are currently no tests for the sidebar feature, we should add:

1. **Test RunDetailsHelp component**
   - Test loading state displays correctly
   - Test error state falls back to generic help
   - Test successful data fetch displays contextual steps
   - Test formatting of run information in descriptions

2. **Test LogHelp component**
   - Test loading state displays correctly
   - Test error state falls back to generic help
   - Test successful data fetch displays contextual steps
   - Test formatting of log information

3. **Test ResultHelp component**
   - Test loading state displays correctly
   - Test error state falls back to generic help
   - Test successful data fetch displays contextual steps
   - Test formatting of result information

### Test File Structure

Create test files:
- `/libs/bublik/features/sidebar/src/lib/main-nav/contextual-help/run-details-help.test.tsx`
- `/libs/bublik/features/sidebar/src/lib/main-nav/contextual-help/log-help.test.tsx`
- `/libs/bublik/features/sidebar/src/lib/main-nav/contextual-help/result-help.test.tsx`

### Example Test Structure

```tsx
import { render, screen } from '@testing-library/react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { RunDetailsHelp } from './run-details-help';
import { store } from '@/store';
import { Provider } from 'react-redux';

describe('RunDetailsHelp', () => {
  it('shows loading state', () => {
    render(
      <Provider store={store}>
        <BrowserRouter>
          <Routes>
            <Route path="/runs/:runId" element={<RunDetailsHelp />} />
          </Routes>
        </BrowserRouter>
      </Provider>
    );
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('displays contextual information when data is loaded', async () => {
    // Mock API response
    // Test that specific run information is displayed
  });

  it('falls back to generic help on error', async () => {
    // Mock API error
    // Test that generic help is displayed
  });
});
```

### Integration Tests

4. **Test help dialog on actual pages**
   - Navigate to `/runs/49048`
   - Click help icon on "Run" menu item
   - Verify dialog shows run-specific information
   - Verify dialog doesn't show "how to get there" instructions

5. **Test edge cases**
   - Test with invalid run ID
   - Test with loading state
   - Test with different view modes

## Benefits

1. **Improved User Experience**: Help becomes actually useful when users are already on a page
2. **Better Onboarding**: New users can learn about page features without leaving the page
3. **Context Awareness**: Help adapts to the actual page content and data
4. **Scalability**: Pattern can be applied to other pages (History, Dashboard, etc.)
5. **Reuses Existing Infrastructure**: Leverages existing API hooks and components

## Potential Challenges and Mitigations

### Challenge 1: Data Fetching in Dialog Component
- **Issue**: Dialog components are defined statically in navigation config
- **Solution**: Use React hooks to fetch data; handle loading/error states gracefully
- **Mitigation**: The dialog is only rendered when user clicks the help button, so no impact on initial page load performance

### Challenge 2: Dialog Content Complexity
- **Issue**: Run details page has many fields and features
- **Solution**: Organize into logical steps; use progressive disclosure in dialog
- **Mitigation**: Focus on the most important and frequently used features

### Challenge 3: Keeping Content in Sync
- **Issue**: Page layout changes may make help content outdated
- **Solution**: Use generic descriptions that focus on purpose rather than exact layout
- **Mitigation**: Regular reviews and updates to help content

### Challenge 4: Performance
- **Issue**: Fetching data for dialog might impact performance
- **Solution**: Data is likely already cached from page load; dialog opens on user action so no impact on initial page load
- **Mitigation**: The useGetRunDetailsQuery hook will use cached data if available

### Challenge 5: Route Parameter Access
- **Issue**: Dialog components need to access route parameters (runId, resultId)
- **Solution**: Use React Router's `useParams()` hook within the dialog components
- **Mitigation**: This is a standard pattern already used throughout the codebase

## Success Criteria

1. ✅ When on Run Details page, help describes page content, not how to get there
2. ✅ Help dialog shows run-specific information (ID, status, package, etc.)
3. ✅ Loading and error states are handled gracefully
4. ✅ Same approach works for Log and Result pages
5. ✅ No breaking changes to existing functionality
6. ✅ Tests pass for new components
7. ✅ Help is more useful for users already on pages

## Timeline Estimate

- **Phase 1**: 1-2 hours (Create infrastructure)
- **Phase 2**: 3-4 hours (Update Run Details Help)
- **Phase 3**: 2-3 hours (Update Log Help)
- **Phase 4**: 2-3 hours (Update Result Help)
- **Phase 5**: 1-2 hours (Create export index and finalize)
- **Phase 6**: 2-3 hours (Handle edge cases and refine)
- **Testing**: 3-4 hours (Write tests and verify)
- **Total**: 14-21 hours

## Future Enhancements

1. **Add contextual help for more pages**: Dashboard, History, Compare, Multiple Runs
2. **Interactive help**: Allow users to click elements on page to learn about them
3. **Help analytics**: Track which help dialogs are most used to improve content
4. **Customizable help**: Allow users to dismiss help they've seen before
5. **Help content management**: Store help content in markdown files for easier editing
6. **Screen reader optimization**: Ensure help dialogs are accessible
7. **Localization**: Prepare help content for internationalization

## Related Issues

- Issue #313: Similar issue that was previously planned but not fully implemented
- This fix will improve UX for all users viewing run details, logs, and results
- May reduce support requests asking "what does this page show?"
- Aligns with product goal of making the UI more intuitive and helpful

## Implementation Checklist

- [ ] Create contextual-help directory structure
- [ ] Implement RunDetailsHelp component
- [ ] Implement LogHelp component
- [ ] Implement ResultHelp component
- [ ] Create index.ts to export components
- [ ] Update main-nav.tsx to use new components
- [ ] Add loading state handling
- [ ] Add error state handling
- [ ] Write unit tests for RunDetailsHelp
- [ ] Write unit tests for LogHelp
- [ ] Write unit tests for ResultHelp
- [ ] Perform manual testing on each page
- [ ] Verify fallback to generic help works
- [ ] Update documentation/comments
- [ ] Code review and finalization

## Images to Consider Creating

While we can reuse many existing images, consider creating new images that highlight:
- Run details page with info panel highlighted
- Log page with tree and log sections highlighted
- Result page with charts and tables highlighted
- Available action buttons highlighted on each page

These images would make the help more visual and easier to understand.
