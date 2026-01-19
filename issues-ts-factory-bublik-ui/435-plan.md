# Plan for Issue #435: Add button to run meta-categorization

## Overview

This document outlines the plan to implement a button on the import page that allows users to manually trigger meta-categorization. Currently, users can view meta-categorization events in the import log, but there's no direct way to trigger this process from the UI.

## Current State

### Import Page Structure
- **Location**: `/apps/bublik/src/pages/import-page/import-page.tsx`
- **Components**:
  - `ImportLogProvider`: Provides context for displaying import logs
  - `ImportEventsTableContainer`: Displays import events in a table with filters
  - `ImportRunFormContainer`: Modal form for importing runs

### Meta-categorization Implementation
- **Facility Type**: Defined as `Facility.MetaCaterigozation = 'meta_categorization'` in `/libs/shared/types/src/lib/run-import.ts`
- **Log Events**: Meta-categorization events are displayed in the import event table alongside other facility events (ImportRuns, AddTags, Celery)
- **Existing Pattern**: 
  - Import runs use a mutation (`importRuns`) that triggers a celery task
  - The task returns a `celery_task_id` which can be tracked
  - Events are displayed with status badges (SUCCESS, FAILURE, STARTED)

## Proposed Solution

### Approach

Add a button to the import page that triggers a meta-categorization task. The button should:

1. **Placement**: In the import page toolbar area, next to the filter form (within `ImportEventsTableContainer`)
2. **Trigger**: Call a new API mutation endpoint for running meta-categorization
3. **Feedback**: Show toast notifications for success/failure
4. **Tracking**: The triggered task should appear in the import event table for monitoring

### Implementation Strategy

1. **Add API endpoint** for triggering meta-categorization
2. **Add mutation hook** to the bublikAPI
3. **Add button component** to the import page toolbar
4. **Handle task response** and provide user feedback

## Files to Modify

### 1. `/libs/services/bublik-api/src/lib/endpoints/import/import-log-endpoints.ts`

**Purpose**: Add a new mutation endpoint for triggering meta-categorization

**Changes**:
```typescript
// Add to importLogEventsEndpoint object
runMetaCategorization: build.mutation<
  { celery_task_id: string },
  void
>({
  query: () => ({
    url: withApiV2('/session_import/meta_categorization'),
    method: 'POST',
    body: {}
  }),
  invalidatesTags: [BUBLIK_TAG.importEvents]
})
```

**Notes**:
- The endpoint URL may need verification with backend team
- Follows the same pattern as `importRuns` mutation
- Returns a celery_task_id for tracking the task

### 2. `/libs/services/bublik-api/src/lib/bublikAPI.ts`

**Purpose**: Export the new mutation hook

**Changes**:
```typescript
// In the export statement section
useRunMetaCategorizationMutation,

// In the destructured exports from bublikAPI
useRunMetaCategorizationMutation,
```

### 3. `/apps/bublik/src/pages/import-page/import-page.tsx`

**Purpose**: Add the button component and hook integration

**Current Code**:
```typescript
export const ImportPage = () => {
	useTabTitleWithPrefix('Import - Bublik');

	return (
		<div className="p-2 overflow-hidden h-full">
			<div className="flex flex-col gap-1 h-full">
				<ImportLogProvider>
					<ImportEventsTableContainer>
						<ImportRunFormContainer />
					</ImportEventsTableContainer>
				</ImportLogProvider>
			</div>
		</div>
	);
};
```

**Modified Code**:
```typescript
import { ButtonTw, Icon, toast } from '@/shared/tailwind-ui';
import { useRunMetaCategorizationMutation } from '@/services/bublik-api';

export const ImportPage = () => {
	useTabTitleWithPrefix('Import - Bublik');
	const [runMetaCategorization] = useRunMetaCategorizationMutation();

	const handleRunMetaCategorization = async () => {
		const promise = runMetaCategorization().unwrap();
		
		toast.promise(promise, {
			loading: 'Running meta-categorization...',
			success: 'Meta-categorization started successfully',
			error: 'Failed to start meta-categorization'
		});

		await promise;
	};

	return (
		<div className="p-2 overflow-hidden h-full">
			<div className="flex flex-col gap-1 h-full">
				<ImportLogProvider>
					<ImportEventsTableContainer
						toolbar={
							<ButtonTw
								variant="primary"
								size="md"
								onClick={handleRunMetaCategorization}
							>
								<Icon name="Tag" size={20} className="mr-1.5" />
								<span>Run Meta-Categorization</span>
							</ButtonTw>
						}
					>
						<ImportRunFormContainer />
					</ImportEventsTableContainer>
				</ImportLogProvider>
			</div>
		</div>
	);
};
```

### 4. `/libs/bublik/features/run-import/src/lib/import-events-table/import-event-table.container.tsx`

**Purpose**: Add support for a toolbar prop to display the button

**Changes**:
Add a `toolbar` prop to the component and render it in the header area:

```typescript
interface ImportEventsTableContainerProps extends PropsWithChildren {
	toolbar?: React.ReactNode;
}

export const ImportEventsTableContainer = (props: ImportEventsTableContainerProps) => {
	const { query, setQuery, onResetClick } = useEventFilters();
	const { pagination, setPagination } = useImportLogPagination();
	const { expanded, setExpanded } = useImportLogExpanded();
	const { data, isLoading, error } = useGetImportEventLogQuery(/* ... */);
	const [isScrolled, setIsScrolled] = useState(false);
	const containerRef = useRef<HTMLDivElement>(null);

	// ... existing useEffect for scroll handler ...

	return (
		<>
			<div className="px-6 py-4 bg-white rounded-t-xl">
				<div className="flex flex-wrap items-center justify-between gap-4">
					<ImportRunFilterForm
						key={JSON.stringify(query)}
						onFiltersChange={setQuery}
						defaultValues={query}
						onResetClick={onResetClick}
					/>
					{props.toolbar}
				</div>
			</div>
			{/* ... rest of the component remains the same ... */}
		</>
	);
};
```

### 5. `/libs/bublik/features/run-import/src/lib/import-events-table/index.ts` (if exists, create if not)

**Purpose**: Ensure exports include the modified container

**Changes**: Export `ImportEventsTableContainer` with the new props

## Code Changes Summary

### Backend API Endpoint (Verification Needed)

**Endpoint**: `POST /api/v2/session_import/meta_categorization`

**Request**: Empty body `{}`

**Response**: 
```typescript
{
  "celery_task_id": "string"
}
```

**Note**: The actual endpoint URL and request/response format should be verified with the backend team. The implementation assumes it follows the same pattern as the import runs endpoint.

### Frontend Changes

1. **New API Mutation**: `runMetaCategorization`
2. **New Button Component**: In the import page toolbar
3. **Enhanced Container**: Support for custom toolbar in `ImportEventsTableContainer`
4. **User Feedback**: Toast notifications for success/failure states

## Implementation Approach

### Step-by-Step Implementation

**Step 1**: Add API endpoint
- Create the mutation in `import-log-endpoints.ts`
- Export the hook from `bublikAPI.ts`

**Step 2**: Modify container component
- Add `toolbar` prop to `ImportEventsTableContainer`
- Render toolbar in the header alongside filters

**Step 3**: Add button to import page
- Import necessary components and hooks
- Create button with appropriate icon and label
- Implement click handler with toast notifications
- Pass button as toolbar prop to container

**Step 4**: Test the integration
- Verify button appears in correct location
- Test API call is triggered on click
- Verify toast notifications appear
- Check that task appears in import event table

### Design Considerations

**Button Style**:
- Use `variant="primary"` to make it prominent
- Use `Icon` component with "Tag" or similar icon
- Position on the right side of the filter bar for easy access

**User Experience**:
- Show loading state on button while mutation is in progress
- Provide clear feedback via toast notifications
- The triggered task should be visible in the import event table below

**Icon Selection**:
- Consider using `Icon name="Tag"` or `Icon name="TagLabel"` for meta-categorization
- Verify available icons in the shared icons library

**Accessibility**:
- Ensure button has appropriate aria-label if needed
- Keyboard navigable
- Loading state should be announced to screen readers

## Tests to Add

### 1. API Endpoint Tests

**File**: `/libs/services/bublik-api/src/lib/endpoints/import/import-log-endpoints.spec.ts` (or create new test file)

```typescript
describe('runMetaCategorization', () => {
  it('should call the correct endpoint', async () => {
    const { result } = renderHook(() => useRunMetaCategorizationMutation());
    
    await act(async () => {
      await result.current[0]().unwrap();
    });
    
    expect(apiMock).toHaveBeenCalledWith(
      expect.objectContaining({
        url: '/api/v2/session_import/meta_categorization',
        method: 'POST'
      })
    );
  });

  it('should return celery_task_id on success', async () => {
    const { result } = renderHook(() => useRunMetaCategorizationMutation());
    
    await act(async () => {
      const response = await result.current[0]().unwrap();
      expect(response).toHaveProperty('celery_task_id');
    });
  });
});
```

### 2. Component Integration Tests

**File**: Create `/apps/bublik/src/pages/import-page/import-page.spec.tsx`

```typescript
describe('ImportPage', () => {
  it('should render the Run Meta-Categorization button', () => {
    render(<ImportPage />);
    
    const button = screen.getByRole('button', { name: /run meta-categorization/i });
    expect(button).toBeInTheDocument();
  });

  it('should call runMetaCategorization mutation when button is clicked', async () => {
    render(<ImportPage />);
    
    const button = screen.getByRole('button', { name: /run meta-categorization/i });
    fireEvent.click(button);
    
    await waitFor(() => {
      expect(mockRunMetaCategorization).toHaveBeenCalled();
    });
  });

  it('should show success toast on successful meta-categorization', async () => {
    render(<ImportPage />);
    
    const button = screen.getByRole('button', { name: /run meta-categorization/i });
    fireEvent.click(button);
    
    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith('Meta-categorization started successfully');
    });
  });
});
```

### 3. Container Component Tests

**File**: Update `/libs/bublik/features/run-import/src/lib/import-events-table/import-event-table.container.spec.tsx` (or create)

```typescript
describe('ImportEventsTableContainer', () => {
  it('should render toolbar prop when provided', () => {
    const toolbar = <button>Custom Button</button>;
    render(<ImportEventsTableContainer toolbar={toolbar} />);
    
    expect(screen.getByText('Custom Button')).toBeInTheDocument();
  });

  it('should position toolbar in header area', () => {
    const toolbar = <button data-testid="test-toolbar">Toolbar</button>;
    render(<ImportEventsTableContainer toolbar={toolbar} />);
    
    const toolbarElement = screen.getByTestId('test-toolbar');
    const headerElement = toolbarElement.closest('.rounded-t-xl');
    expect(headerElement).toBeInTheDocument();
  });
});
```

## Edge Cases to Consider

1. **API Endpoint Not Available**: What if the backend doesn't have this endpoint yet?
   - Solution: Add conditional rendering or feature flag
   - Document the dependency on backend endpoint

2. **User Without Permissions**: What if the user doesn't have permission to run meta-categorization?
   - Solution: The API should return 403/403 error
   - Show appropriate error message in toast

3. **Task Already Running**: What if meta-categorization is already in progress?
   - Solution: Consider disabling button while task is running
   - Check current events for STARTED meta_categorization tasks

4. **Network Errors**: How to handle network failures?
   - Solution: Toast notifications already handle errors via `toast.promise`
   - Ensure error messages are user-friendly

5. **Rate Limiting**: What if there's a rate limit on the API?
   - Solution: Show rate limit error in toast if returned by API
   - Consider debouncing the button click

## Future Enhancements

1. **Batch Meta-Categorization**: Allow selecting specific projects to categorize
   - Add project selection dropdown to the button area
   - Pass selected project(s) to the API

2. **Progress Tracking**: Show progress indicator while meta-categorization runs
   - Poll for task status
   - Show progress bar or percentage

3. **History**: Show history of meta-categorization runs
   - Filter by MetaCategorization facility
   - Display summary of last run

4. **Auto-trigger**: Option to auto-trigger meta-categorization after import
   - Add checkbox in import form
   - Chain meta-categorization after import completes

5. **Scheduled Runs**: Allow scheduling meta-categorization at specific times
   - Add scheduling UI
   - Integrate with backend scheduling system

## Dependencies

### Backend
- New API endpoint: `POST /api/v2/session_import/meta_categorization`
- Endpoint should return a celery_task_id for task tracking

### Frontend Libraries
- All required libraries are already in use:
  - `@reduxjs/toolkit/query` for API mutations
  - `@radix-ui/react-toast` for toast notifications
  - Existing UI components from `@/shared/tailwind-ui`

## Risk Assessment

### Low Risk
- Changes are isolated to import page and related components
- Follows existing patterns for mutations and buttons
- No breaking changes to existing functionality

### Medium Risk
- Backend endpoint URL may need adjustment
- Permission handling may need refinement

### Mitigation
- Thorough testing of API integration
- Mock backend for frontend testing
- Feature flag to enable/disable button if endpoint not ready
- Comprehensive error handling and user feedback

## Rollback Plan

If issues arise during implementation:

1. **Frontend Only**: Can rollback button changes without affecting existing import functionality
2. **API Changes**: Can stub the mutation to return success without calling backend
3. **Container Changes**: Toolbar prop is optional, can revert to previous implementation

## Summary

The implementation adds a button to the import page that allows users to trigger meta-categorization. The solution:

- **Minimal Impact**: Changes are localized to import page and API endpoints
- **Follows Patterns**: Uses existing mutation and notification patterns
- **User-Friendly**: Clear feedback through toast notifications
- **Well-Tested**: Comprehensive unit and integration tests
- **Extensible**: Foundation for future enhancements like batch processing

The total changes involve:
- 5 files modified/created
- ~50 lines of new code
- Follow existing code style and patterns
- No breaking changes to existing functionality
