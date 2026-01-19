# Plan for Issue #313: Make sidebar help contextually relevant to current page

## Problem Summary

When users are already on a page (e.g., `/runs/49048` - Run Details page), the help dialog in the sidebar shows generic instructions on how to GET to that page rather than describing what's actually displayed on the page. This makes the help unhelpful.

### Current Behavior
- User is on `/runs/49048` (Run Details page)
- User clicks help icon on the "Run" menu item in sidebar
- Dialog shows: "Go to the Runs page" → "Select the run you want to view"
- User is already there, so this information is useless

### Expected Behavior
- Help dialog should describe what content is available on the current page
- Should explain the data fields, buttons, and navigation options available on the page
- Should be context-aware and adapt to the actual page content

## Root Cause Analysis

1. **Static Dialog Content**: The `RunDetailsDialog` component (and others like `LogDialog`, `ResultMeasurementsDialog`) contains static content that describes how to navigate to the page, not what's on it.

2. **No Context Awareness**: The dialog components don't access the current page's data or route state to provide contextual information.

3. **Architecture**: The sidebar navigation is configured in `main-nav.tsx` with hardcoded `dialogContent` components that don't change based on the current route or page data.

4. **Missing Integration**: The API data available for each page (e.g., `RunDetailsAPIResponse`) is not exposed to the help dialog system.

## Files to Modify

### 1. Primary Implementation Files

#### `/libs/bublik/features/sidebar/src/lib/main-nav/instruction-dialog.tsx`
- **Purpose**: Contains all dialog content components
- **Changes**: 
  - Create new context-aware dialog components
  - Keep existing components for pages where they make sense
  - Add new components that fetch and display page-specific data

#### `/libs/bublik/features/sidebar/src/lib/main-nav/main-nav.tsx`
- **Purpose**: Defines sidebar navigation structure
- **Changes**:
  - Update `Run` menu item to use new context-aware dialog
  - Update `Log` menu item to use new context-aware dialog
  - Update `Result` menu item to use context-aware dialog
  - Potentially update other items as needed

### 2. Supporting Files (New Components)

#### `/libs/bublik/features/sidebar/src/lib/main-nav/contextual-help/run-details-help.tsx` (NEW)
- **Purpose**: Context-aware help for Run Details page
- **Content**: 
  - Fetches `RunDetailsAPIResponse` using existing API hook
  - Displays information about what's on the page:
    - Run identifier and main package
    - Start/finish time and duration
    - Status and conclusion reason
    - Available buttons (Copy ID, Diff, Report, Log, etc.)
    - Branches, revisions, labels, tags sections

#### `/libs/bublik/features/sidebar/src/lib/main-nav/contextual-help/log-help.tsx` (NEW)
- **Purpose**: Context-aware help for Log page
- **Content**: Describes log viewing modes and available actions

#### `/libs/bublik/features/sidebar/src/lib/main-nav/contextual-help/result-help.tsx` (NEW)
- **Purpose**: Context-aware help for Result/Measurements page
- **Content**: Describes measurement viewing modes and charts

### 3. Utility Files

#### `/libs/bublik/features/sidebar/src/lib/main-nav/contextual-help/` (NEW DIRECTORY)
- **Purpose**: Organize contextual help components

#### `/libs/bublik/features/sidebar/src/lib/main-nav/contextual-help/index.ts` (NEW)
- **Purpose**: Export all contextual help components

## Implementation Approach

### Phase 1: Create Infrastructure

1. **Create contextual help directory structure**
   ```bash
   mkdir -p libs/bublik/features/sidebar/src/lib/main-nav/contextual-help
   ```

2. **Create base components**
   - Create `run-details-help.tsx` component that:
     - Uses `useParams` to get `runId`
     - Uses `bublikAPI.useGetRunDetailsQuery(runId)` to fetch data
     - Displays a formatted explanation of the page content
     - Handles loading and error states gracefully

### Phase 2: Update Run Details Help

3. **Implement `RunDetailsHelp` component**
   ```tsx
   // Key features:
   - Fetches run details data
   - Shows step-by-step explanation:
     * Step 1: Overview of what the page shows
     * Step 2: Information fields (ID, package, times, status, etc.)
     * Step 3: Available actions and buttons
     * Step 4: Tags and categorization
   - Reuses existing images where applicable
   - Falls back to generic help if data not available
   ```

4. **Update `main-nav.tsx`**
   - Replace `<RunDetailsDialog />` with `<RunDetailsHelp />` in the Run menu item
   - Keep the "Report" subitem with its existing dialog (it's already contextual)

### Phase 3: Extend to Other Pages

5. **Implement `LogHelp` component**
   - Describe log viewing modes (Tree+info+log, Tree+log, Info+log, Log)
   - Explain how to navigate within logs
   - Highlight key features

6. **Implement `ResultHelp` component**
   - Describe measurement viewing modes
   - Explain chart types and data tables
   - Highlight interactive features

7. **Update navigation configuration**
   - Replace static dialogs with context-aware components for Log and Result

### Phase 4: Testing and Refinement

8. **Test all pages**
   - Run Details page (/runs/:runId)
   - Run Report page (/runs/:runId/report)
   - Log page (/log/:runId)
   - Result page (/runs/:runId/results/:resultId/measurements)
   - Verify help is contextually relevant

9. **Handle edge cases**
   - Loading states
   - Error states
   - Empty data states
   - Different view modes (full vs collapsed)

10. **Update documentation**
    - Add comments explaining the new architecture
    - Document how to add contextual help for new pages

## Code Changes - Detailed Design

### New Component: `RunDetailsHelp.tsx`

```tsx
export function RunDetailsHelp() {
  const { runId } = useParams<{ runId: string }>();
  const { data, isLoading, isError } = bublikAPI.useGetRunDetailsQuery(
    runId ? Number(runId) : ''
  );

  if (isLoading) {
    return <InstructionDialogLoading />;
  }

  if (isError || !data) {
    // Fallback to generic help
    return <RunDetailsDialog />;
  }

  const steps = [
    {
      title: 'Run Information',
      description: `This page shows details for run ${data.id} from package ${data.main_package}. The run started at ${formatDateTime(data.start)} and finished at ${formatDateTime(data.finish)} with a duration of ${data.duration}.`,
      image: existingImage // or create new image showing highlighted info section
    },
    {
      title: 'Status and Conclusion',
      description: `The run has a status of "${data.status}" and concluded as "${data.conclusion}"${data.conclusion_reason ? ` with reason: ${data.conclusion_reason}` : '.'} You can see the status badge at the top of the info section.`,
      image: existingImage
    },
    {
      title: 'Available Actions',
      description: 'From this page you can: Copy the run ID for comparison, Mark as compromised, Compare with other runs, View the run report, Go to the log, and Toggle between full and collapsed view modes.',
      image: existingImage
    },
    {
      title: 'Tags and Categorization',
      description: `The run is organized by branches (${data.branches.join(', ')}), revisions, labels (${data.labels.join(', ')}), and tags (${[...data.important_tags, ...data.relevant_tags].join(', ')}). These help filter and group related runs.`,
      image: existingImage
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

### Updated `main-nav.tsx` Configuration

```tsx
import { RunDetailsHelp } from './contextual-help/run-details-help';

const mainMenu: SidebarItem[] = [
  // ... other items
  {
    label: 'Run',
    to: '/runs',
    icon: <Icon name="PieChart" />,
    pattern: [{ path: '/runs/:runId' }],
    whenMatched: true,
    dialogContent: <RunDetailsHelp />, // Changed from <RunDetailsDialog />
    subitems: [
      {
        label: 'Details',
        icon: <Icon name="Paper" className="w-6 h-6" />,
        to: '/runs',
        whenMatched: true,
        dialogContent: <RunDetailsHelp />, // Changed from <RunDetailsDialog />
        pattern: { path: '/runs/:runId' }
      },
      {
        label: 'Report',
        icon: <Icon name="LineChart" />,
        to: '/runs',
        whenMatched: true,
        dialogContent: <RunReportDialog />, // Keep as is - already contextual
        pattern: { path: '/runs/:runId/report' }
      }
    ]
  },
  // ... other items
];
```

## Tests to Add/Update

### Unit Tests

1. **Test `RunDetailsHelp` component**
   - Test loading state displays correctly
   - Test error state falls back to generic help
   - Test successful data fetch displays contextual steps
   - Test formatting of run information in descriptions

2. **Test navigation configuration**
   - Verify `Run` menu item uses correct dialog component
   - Verify pattern matching works for different run URLs

### Integration Tests

3. **Test help dialog on actual pages**
   - Navigate to `/runs/49048`
   - Click help icon on "Run" menu item
   - Verify dialog shows run-specific information
   - Verify dialog doesn't show "how to get there" instructions

4. **Test edge cases**
   - Test with invalid run ID
   - Test with loading state
   - Test with different view modes

### E2E Tests (if applicable)

5. **Test user workflow**
   - User navigates to run details page
   - User clicks help icon
   - User sees relevant information about current page
   - User can navigate through help steps

## Benefits

1. **Improved User Experience**: Help becomes actually useful when users are already on a page
2. **Better Onboarding**: New users can learn about page features without leaving the page
3. **Context Awareness**: Help adapts to the actual page content and data
4. **Scalability**: Pattern can be applied to other pages (Log, Result, History, etc.)
5. **Reuses Existing Infrastructure**: Leverages existing API hooks and components

## Potential Challenges and Mitigations

### Challenge 1: Data Fetching in Dialog Component
- **Issue**: Dialog components are defined statically in navigation config
- **Solution**: Use React hooks to fetch data; handle loading/error states gracefully

### Challenge 2: Dialog Content Complexity
- **Issue**: Run details page has many fields and features
- **Solution**: Organize into logical steps; use progressive disclosure in dialog

### Challenge 3: Keeping Content in Sync
- **Issue**: Page layout changes may make help content outdated
- **Solution**: Use generic descriptions that focus on purpose rather than exact layout; regular reviews

### Challenge 4: Performance
- **Issue**: Fetching data for dialog might impact performance
- **Solution**: Data is likely already cached from page load; dialog opens on user action so no impact on initial page load

## Success Criteria

1. ✅ When on Run Details page, help describes page content, not how to get there
2. ✅ Help dialog shows run-specific information (ID, status, etc.)
3. ✅ Loading and error states are handled gracefully
4. ✅ Same approach works for Log and Result pages
5. ✅ No breaking changes to existing functionality
6. ✅ Tests pass for new components
7. ✅ Help is more useful for users already on pages

## Timeline Estimate

- **Phase 1**: 1-2 hours (Create infrastructure)
- **Phase 2**: 3-4 hours (Update Run Details Help)
- **Phase 3**: 4-6 hours (Extend to other pages)
- **Phase 4**: 2-3 hours (Testing and refinement)
- **Total**: 10-15 hours

## Future Enhancements

1. **Add contextual help for more pages**: Dashboard, History, etc.
2. **Interactive help**: Allow users to click elements on page to learn about them
3. **Help analytics**: Track which help dialogs are most used to improve content
4. **Customizable help**: Allow users to dismiss help they've seen before
5. **Help content management**: Store help content in markdown files for easier editing

## Related Issues

- This fix will improve UX for all users viewing run details, logs, and results
- May reduce support requests asking "what does this page show?"
- Aligns with product goal of making the UI more intuitive and helpful
