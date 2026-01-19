# Implementation Plan for Issue #450: Add button to refresh run page cache in case of a UI error

## Issue Summary
The issue requests adding a button to refresh the run page cache in case of a UI error. When the run page displays an error (e.g., network issues, server errors, or corrupted cache), users should have an option to manually refresh/refresh the cached data.

## Root Cause Analysis

### Current Error Handling
The run page displays errors in two main components:

1. **RunTableError Component** (`libs/bublik/features/run/src/lib/run-table/run-table.component.tsx` lines 45-69)
   - Displays error information with icon, title, and description
   - Currently has no user action to retry/refresh
   - Shows errors from `useGetRunTableByRunIdQuery` and `useGetMultipleRunsByRunIdsQuery`

2. **RunDetailsError Component** (`libs/bublik/features/run-details/src/lib/run-details.component.tsx` lines 35-59)
   - Displays error information for run details
   - Shows errors from `useGetRunDetailsQuery` and `useGetRunCommentQuery`

### Current Data Fetching & Caching

The run page uses Redux Toolkit Query (RTK Query) with the following caching configuration:

1. **API Cache Configuration** (`libs/services/bublik-api/src/lib/bublikAPI.ts` line 93)
   - `keepUnusedDataFor: getMinutes(15)` - Cache is kept for 15 minutes

2. **Run Table Endpoint** (`libs/services/bublik-api/src/lib/endpoints/run-endpoints.ts` lines 168-181)
   - `getRunTableByRunIdQuery`: Uses `keepUnusedDataFor: getMinutes(5)` and provides `BUBLIK_TAG.Run`
   - Cache: 'no-cache' in query options (bypasses browser cache)

3. **Run Details Endpoint** (`libs/services/bublik-api/src/lib/endpoints/run-endpoints.ts` lines 261-269)
   - `getRunDetailsQuery`: Provides `BUBLIK_TAG.RunDetails` tag with specific runId
   - Cache: 'reload' in query options

### Problem
When a UI error occurs (network failure, server error, stale cache), the error components only display the error message without providing users a way to retry the request. Users have to manually refresh the browser page, which is not optimal UX.

## Implementation Approach

### Approach 1: Refetch Method (Recommended)
Use the `refetch` method provided by RTK Query hooks to trigger a new request. This approach:
- Is the standard RTK Query pattern
- Preserves existing cache logic
- Provides fine-grained control over what to refresh

### Approach 2: Tag Invalidation
Use `bublikAPI.util.invalidateTags()` to invalidate and refetch cached data (similar to history refresh). This approach:
- Invalidates all queries with matching tags
- Works well for global refresh scenarios
- Pattern already used in `useHistoryRefresh` hook

**Decision:** Use Approach 1 (Refetch Method) for better precision and following RTK Query best practices, while also considering tag invalidation as an alternative.

## Files to Modify

### 1. Core Component Updates

#### File: `libs/bublik/features/run/src/lib/run-table/run-table.component.tsx`

**Changes:**
- Add `refetch` prop to `RunTableError` component (line 45)
- Add a refresh button in the error UI that calls the refetch function
- Follow the pattern from `HistoryRefresh` component with animated icon

```typescript
export interface RunTableErrorProps {
  error: unknown;
  onRefresh?: () => void;  // NEW
}

export const RunTableError = ({ error = {}, onRefresh }: RunTableErrorProps) => {
  const { description, status, title } = getErrorMessage(error);

  return (
    <div className="mx-auto mt-72">
      <div className="flex items-center gap-4">
        <Icon
          name="TriangleExclamationMark"
          size={48}
          className="text-text-unexpected"
        />
        <div className="">
          <h1 className="text-2xl font-semibold">
            {status} {title}
          </h1>
          <p>{description}</p>
          {onRefresh && (  // NEW
            <div className="mt-4">
              <Tooltip content="Retry loading the data">
                <ButtonTw variant="primary" size="xs" onClick={onRefresh}>
                  <Icon name="Refresh" size={18} className="mr-1.5" />
                  Refresh
                </ButtonTw>
              </Tooltip>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
```

#### File: `libs/bublik/features/run/src/lib/run-table/run-table.container.tsx`

**Changes:**
- Extract the `refetch` method from RTK Query hooks
- Pass `refetch` to `RunTableError` component

```typescript
export const RunTableContainer = ({ runId }: RunTableContainerProps) => {
  useRunPageName({ runId });
  const { globalRequirements } = useGlobalRequirements();

  const { data, isLoading, error, isFetching, refetch } = Array.isArray(runId)
    ? bublikAPI.useGetMultipleRunsByRunIdsQuery(
        runId.map((id) => ({ runId: id, requirements: globalRequirements }))
      )
    : bublikAPI.useGetRunTableByRunIdQuery({
        runId,
        requirements: globalRequirements
      });

  const detailsQuery = useGetRunDetailsQuery(getSingleRunId(runId));

  // ... existing state management code ...

  if (error || detailsQuery.error) {
    return (
      <RunTableError 
        error={error || detailsQuery.error} 
        onRefresh={refetch}  // NEW
      />
    );
  }

  // ... rest of the component ...
};
```

#### File: `libs/bublik/features/run-details/src/lib/run-details.component.tsx`

**Changes:**
- Add `refetch` prop to `RunDetailsError` component
- Add a refresh button in the error UI

```typescript
export interface RunDetailsErrorProps {
  error?: unknown;
  onRefresh?: () => void;  // NEW
}

export const RunDetailsError = ({ error = {}, onRefresh }: RunDetailsErrorProps) => {
  const { description, status, title } = getErrorMessage(error);

  return (
    <div className="flex items-center justify-center flex-grow p-4">
      <div className="flex items-center gap-4">
        <Icon
          name="TriangleExclamationMark"
          size={48}
          className="text-text-unexpected"
        />
        <div className="flex flex-col gap-0.5">
          <h2 className="text-2xl font-bold">
            {status} {title}
          </h2>
          <p className="text-lg">{description}</p>
          {onRefresh && (  // NEW
            <div className="mt-2">
              <Tooltip content="Retry loading the run details">
                <ButtonTw variant="primary" size="xs" onClick={onRefresh}>
                  <Icon name="Refresh" size={18} className="mr-1.5" />
                  Refresh
                </ButtonTw>
              </Tooltip>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
```

#### File: `libs/bublik/features/run-details/src/lib/run-details.container.tsx`

**Changes:**
- Extract `refetch` from query hooks
- Pass `refetch` to `RunDetailsError` component

```typescript
function RunDetailsContainer(props: InfoContainerProps) {
  const { runId, isFullMode } = props;
  const { data, isLoading, isFetching, error, refetch } = useGetRunDetailsQuery(
    props.runId
  );
  const {
    data: commentData,
    isLoading: commentIsLoading,
    error: commentError,
    isFetching: commentIsFetching,
    refetch: refetchComment  // NEW
  } = bublikAPI.useGetRunCommentQuery({ runId: Number(runId) });

  const handleRefresh = () => {  // NEW
    refetch();
    refetchComment();
  };

  if (error || commentError) {
    return (
      <RunDetailsError 
        error={error || commentError} 
        onRefresh={handleRefresh}  // NEW
      />
    );
  }

  // ... rest of the component ...
}
```

### 2. Optional Enhancement: Create Reusable Refresh Button Component

#### File: `libs/shared/tailwind-ui/src/lib/refresh-button/refresh-button.component.tsx` (NEW)

**Purpose:** Reusable refresh button component with animation

```typescript
import { FC } from 'react';
import { motion, useAnimation } from 'framer-motion';

import { ButtonTw, Icon } from '..';

interface RefreshButtonProps {
  onRefreshClick?: () => void;
  variant?: 'primary' | 'secondary' | 'outline';
  size?: 'xs' | 'xss' | 'sm' | 'md';
  label?: string;
  iconSize?: number;
}

export const RefreshButton: FC<RefreshButtonProps> = ({
  onRefreshClick,
  variant = 'primary',
  size = 'xs',
  label = 'Refresh',
  iconSize = 18
}) => {
  const controls = useAnimation();

  const handleClick = async () => {
    if (onRefreshClick) {
      onRefreshClick();
    }

    await controls.start({
      rotate: [0, 360],
      transition: {
        duration: 0.4,
        stiffness: 500,
        damping: 90,
        type: 'spring'
      }
    });
  };

  return (
    <ButtonTw variant={variant} size={size} onClick={handleClick}>
      <motion.div animate={controls} className="mr-1.5">
        <Icon name="Refresh" size={iconSize} />
      </motion.div>
      <span>{label}</span>
    </ButtonTw>
  );
};
```

### 3. Optional Enhancement: Run Page Header Refresh

#### File: `apps/bublik/src/pages/run-page/run-page.tsx`

**Changes:**
- Add a refresh button in the page header (near other action buttons)

```typescript
const RunHeader = ({ runId }: RunHeaderProps) => {
  const [isModeFull, setIsModeFull] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // ... existing code ...

  const handlePageRefresh = async () => {
    setIsRefreshing(true);
    // Invalidate run-related tags to refresh all data
    dispatch(bublikAPI.util.invalidateTags([
      BUBLIK_TAG.Run, 
      BUBLIK_TAG.RunDetails
    ]));
    // Reset after a short delay
    setTimeout(() => setIsRefreshing(false), 500);
  };

  return (
    <header className="flex flex-col bg-white rounded">
      <CardHeader label="Info">
        <div className="flex h-full gap-3">
          {/* ... existing buttons ... */}
          <Tooltip content="Refresh page data">
            <ButtonTw 
              variant="secondary" 
              size="xss" 
              onClick={handlePageRefresh}
              disabled={isRefreshing}
            >
              <motion.div animate={isRefreshing ? spinAnimation : {}}>
                <Icon name="Refresh" size={16} className="mr-1 text-primary" />
              </motion.div>
              Refresh
            </ButtonTw>
          </Tooltip>
        </div>
      </CardHeader>
      {/* ... rest of component ... */}
    </header>
  );
};
```

## Tests to Add or Update

### 1. Component Tests

#### File: `libs/bublik/features/run/src/lib/run-table/run-table.component.spec.tsx` (NEW)

**Test Cases:**
- `RunTableError should display error information`
- `RunTableError should render refresh button when onRefresh is provided`
- `RunTableError should not render refresh button when onRefresh is not provided`
- `RunTableError should call onRefresh when refresh button is clicked`

```typescript
import { render, screen, fireEvent } from '@testing-library/react';
import { RunTableError } from './run-table.component';

describe('RunTableError', () => {
  const mockError = {
    status: 500,
    data: { error: 'Internal Server Error' }
  };

  it('should display error information', () => {
    render(<RunTableError error={mockError} />);
    expect(screen.getByText(/500/i)).toBeInTheDocument();
  });

  it('should render refresh button when onRefresh is provided', () => {
    const mockRefresh = jest.fn();
    render(<RunTableError error={mockError} onRefresh={mockRefresh} />);
    expect(screen.getByText('Refresh')).toBeInTheDocument();
  });

  it('should call onRefresh when refresh button is clicked', () => {
    const mockRefresh = jest.fn();
    render(<RunTableError error={mockError} onRefresh={mockRefresh} />);
    
    const refreshButton = screen.getByText('Refresh');
    fireEvent.click(refreshButton);
    
    expect(mockRefresh).toHaveBeenCalledTimes(1);
  });
});
```

#### File: `libs/bublik/features/run-details/src/lib/run-details.component.spec.tsx` (NEW)

**Test Cases:**
- `RunDetailsError should display error information`
- `RunDetailsError should render refresh button when onRefresh is provided`
- `RunDetailsError should call onRefresh when refresh button is clicked`

### 2. Integration Tests

#### File: `apps/bublik/src/pages/run-page/run-page.spec.tsx` (NEW)

**Test Cases:**
- `RunPage should handle error state and show refresh button`
- `RunPage should refetch data when refresh button is clicked in error state`

### 3. Storybook Updates

#### File: `apps/bublik/src/pages/run-page/run-page.stories.tsx`

**Add new stories:**
```typescript
export const WithError = {
  args: {},
  parameters: {
    msw: {
      handlers: [
        rest.get('/api/v2/runs/:runId/stats', (req, res, ctx) => {
          return res(ctx.status(500), ctx.json({ error: 'Server Error' }));
        })
      ]
    }
  }
} satisfies Story;
```

#### File: `libs/bublik/features/run/src/lib/run-table/run-table.component.stories.tsx`

**Add stories for error states:**
```typescript
export const WithRefreshButton = {
  args: {
    error: { status: 500, data: { message: 'Server Error' } },
    onRefresh: action('refresh')
  }
};

export const WithoutRefreshButton = {
  args: {
    error: { status: 500, data: { message: 'Server Error' } }
  }
};
```

## Implementation Steps

### Phase 1: Core Error Component Updates (Priority: High)
1. Update `RunTableError` component to accept and use `onRefresh` prop
2. Update `RunTableContainer` to pass `refetch` method
3. Update `RunDetailsError` component to accept and use `onRefresh` prop
4. Update `RunDetailsContainer` to pass `refetch` method

### Phase 2: Testing (Priority: High)
1. Write unit tests for updated error components
2. Write integration tests for containers
3. Update Storybook stories to showcase error states

### Phase 3: Optional Enhancements (Priority: Medium)
1. Create reusable `RefreshButton` component with animation
2. Add refresh button to run page header
3. Consider adding loading animation when refreshing

### Phase 4: Documentation (Priority: Low)
1. Update component documentation
2. Add comments explaining the refresh mechanism
3. Consider adding user-facing documentation if needed

## Considerations and Edge Cases

### 1. Concurrent Refreshes
- **Issue:** User clicks refresh multiple times rapidly
- **Solution:** Disable button while refresh is in progress using `isFetching` state

### 2. Stale Cache After Refresh
- **Issue:** Data may still be stale after refresh if server returns old data
- **Solution:** Use `cache: 'reload'` option in query config (already present in `getRunDetailsQuery`)

### 3. Mixed Error States
- **Issue:** Both run table and details might have errors
- **Solution:** Each component independently handles its own refresh

### 4. Network Errors vs. Server Errors
- **Issue:** Different error types might require different handling
- **Solution:** Use generic refresh approach for all errors, as refetch will work for both cases

### 5. Accessibility
- **Issue:** Ensure refresh button is accessible
- **Solution:** Add proper ARIA labels, keyboard support, and screen reader announcements

## Success Criteria

1. ✓ When a UI error occurs on the run page, a refresh button is displayed
2. ✓ Clicking the refresh button triggers a refetch of the data
3. ✓ The refresh button shows loading state during refetch
4. ✓ Upon successful refetch, the error state is cleared and data is displayed
5. ✓ Components have proper test coverage
6. ✓ Implementation follows existing code patterns and conventions
7. ✓ No breaking changes to existing functionality

## Risk Assessment

### Low Risk
- Adding optional `onRefresh` prop to error components (backwards compatible)
- Passing refetch method from existing RTK Query hooks

### Medium Risk
- Changes to container logic for error handling
- Need to ensure refetch is properly propagated

### Mitigation
- Use TypeScript to ensure type safety
- Write comprehensive tests
- Follow existing patterns (e.g., `HistoryRefresh`)
- Consider optional props to maintain backwards compatibility

## References

- Redux Toolkit Query Documentation: https://redux-toolkit.js.org/rtk-query/usage/queries#refetching
- Existing refresh pattern: `libs/bublik/features/history/src/lib/history-refresh/`
- Error handling pattern: Current `RunTableError` and `RunDetailsError` components
- Animation pattern: `HistoryRefresh` component uses Framer Motion for icon rotation

## Additional Notes

- The implementation uses RTK Query's built-in `refetch` method which is the recommended approach
- For a more comprehensive refresh, consider using tag invalidation as an alternative
- The `RefreshButton` component is optional - the existing `ButtonTw` with `Icon` can be used directly
- Ensure the refresh button has appropriate feedback (loading state, disabled during fetch)
- Consider adding tooltip to explain what the refresh button does

## Estimated Effort

- Phase 1 (Core Updates): 2-3 hours
- Phase 2 (Testing): 2-3 hours
- Phase 3 (Optional Enhancements): 2-4 hours
- Phase 4 (Documentation): 1 hour

**Total Estimated Effort:** 7-11 hours (without optional enhancements)
