# Plan to Fix Issue #319: Changing configs should drop all caches

## Issue Summary

When configuration changes occur (create, edit, delete, activate/deactivate), only the `BUBLIK_TAG.Config` cache is invalidated. However, configurations (especially global and report configs) can affect how other data is processed, displayed, and filtered. This means that cached data from runs, history, dashboard, logs, and other areas may become stale and inconsistent after config changes.

## Root Cause Analysis

The issue is located in the config mutation endpoints:
- **File**: `libs/services/bublik-api/src/lib/endpoints/configs-endpoints.ts`
- **Lines 196, 205, 212**: The `invalidatesTags` configurations

### Current Behavior

Config mutations only invalidate the `BUBLIK_TAG.Config` tag:
```typescript
// Line 196 - createConfig
invalidatesTags: [BUBLIK_TAG.Config]

// Line 205 - editConfigById
invalidatesTags: [BUBLIK_TAG.Config]

// Line 212 - deleteConfigById
invalidatesTags: [BUBLIK_TAG.Config]
```

### The Problem

Configs influence various aspects of the application:

1. **Global configs** (per_conf, etc.) affect:
   - Run data display and filtering
   - Dashboard aggregations
   - History queries
   - Log presentation
   - Performance check timeouts
   - Result calculations

2. **Report configs** affect:
   - Run report generation
   - Data aggregations in reports
   - Measurements display

3. **Project-scoped configs** affect:
   - Project-specific run displays
   - Project-specific history
   - Project-specific dashboards

When these configs change, the cached data that depends on them becomes stale but is not automatically refreshed, leading to:
- Inconsistent data display
- Outdated information shown to users
- Users seeing results based on old config values

## Solution

Update the `invalidatesTags` arrays in config mutations to include all cache tags that might be affected by config changes.

### Implementation Details

#### Files to Modify

1. **Primary file**: `libs/services/bublik-api/src/lib/endpoints/configs-endpoints.ts`

#### Code Changes Needed

##### Change 1: Update `createConfig` mutation invalidatesTags (Line 196)

Replace:
```typescript
invalidatesTags: [BUBLIK_TAG.Config]
```

With:
```typescript
invalidatesTags: [
  BUBLIK_TAG.Config,
  BUBLIK_TAG.DashboardData,
  BUBLIK_TAG.HistoryData,
  BUBLIK_TAG.LogData,
  BUBLIK_TAG.Run,
  BUBLIK_TAG.SessionList,
  BUBLIK_TAG.RunCompromiseStatus,
  BUBLIK_TAG.RunExternalRefs,
  BUBLIK_TAG.RunDetails,
  'run-comment'  // Custom tag from run-endpoints
]
```

##### Change 2: Update `editConfigById` mutation invalidatesTags (Line 205)

Replace:
```typescript
invalidatesTags: [BUBLIK_TAG.Config]
```

With:
```typescript
invalidatesTags: [
  BUBLIK_TAG.Config,
  BUBLIK_TAG.DashboardData,
  BUBLIK_TAG.HistoryData,
  BUBLIK_TAG.LogData,
  BUBLIK_TAG.Run,
  BUBLIK_TAG.SessionList,
  BUBLIK_TAG.RunCompromiseStatus,
  BUBLIK_TAG.RunExternalRefs,
  BUBLIK_TAG.RunDetails,
  'run-comment'
]
```

##### Change 3: Update `deleteConfigById` mutation invalidatesTags (Line 212)

Replace:
```typescript
invalidatesTags: [BUBLIK_TAG.Config]
```

With:
```typescript
invalidatesTags: [
  BUBLIK_TAG.Config,
  BUBLIK_TAG.DashboardData,
  BUBLIK_TAG.HistoryData,
  BUBLIK_TAG.LogData,
  BUBLIK_TAG.Run,
  BUBLIK_TAG.SessionList,
  BUBLIK_TAG.RunCompromiseStatus,
  BUBLIK_TAG.RunExternalRefs,
  BUBLIK_TAG.RunDetails,
  'run-comment'
]
```

#### Implementation Approach

1. **Comprehensive invalidation**: Invalidate all major data caches that might be affected by config changes. This ensures that any data that depends on configuration settings is refreshed.

2. **Tag-based invalidation**: Use RTK Query's tag-based invalidation system, which automatically refetches queries that provide the invalidated tags.

3. **Performance consideration**: While invalidating many tags might trigger multiple refetches, this is necessary for data consistency. The API requests are batched by RTK Query, and data refetching only happens when components are mounted/active.

## Testing Strategy

### Create Integration Tests

Create a new test file: `libs/services/bublik-api/src/lib/endpoints/configs-endpoints.spec.ts`

#### Test Cases to Implement

1. **Test: createConfig invalidates all expected tags**
   - Setup: Create a mock store with bublikAPI
   - Action: Trigger `createConfig` mutation
   - Expected: All relevant cache tags are invalidated
   - Verify: Use `api.util.selectInvalidatedBy` to check invalidated tags

2. **Test: editConfigById invalidates all expected tags**
   - Setup: Create a mock store with bublikAPI
   - Action: Trigger `editConfigById` mutation
   - Expected: All relevant cache tags are invalidated
   - Verify: Check that queries for runs, history, dashboard, etc. would be refetched

3. **Test: deleteConfigById invalidates all expected tags**
   - Setup: Create a mock store with bublikAPI
   - Action: Trigger `deleteConfigById` mutation
   - Expected: All relevant cache tags are invalidated
   - Verify: Confirm cache invalidation behavior

### Test Data Structure

```typescript
import { setupApiStore } from './test-utils';
import { bublikAPI } from '../bublikAPI';

describe('Config mutations cache invalidation', () => {
  let store: ReturnType<typeof setupApiStore>;

  beforeEach(() => {
    store = setupApiStore(bublikAPI);
  });

  test('createConfig invalidates all expected tags', async () => {
    // Pre-populate cache with some data
    store.dispatch(bublikAPI.endpoints.getRunsTablePage.initiate({}));
    store.dispatch(bublikAPI.endpoints.getHistoryLinear.initiate({}));
    
    // Wait for data to be cached
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Trigger config mutation
    store.dispatch(bublikAPI.endpoints.createConfig.initiate({
      type: 'global',
      name: 'test-config',
      content: {},
      is_active: true
    }));
    
    // Verify all expected tags are invalidated
    const invalidatedTags = bublikAPI.util.selectInvalidatedBy(
      store.getState(),
      []
    );
    
    // Check that relevant tags are in the invalidated list
    expect(invalidatedTags).toContainEqual({ type: 'Config' });
    expect(invalidatedTags).toContainEqual({ type: 'DashboardData' });
    expect(invalidatedTags).toContainEqual({ type: 'HistoryData' });
    expect(invalidatedTags).toContainEqual({ type: 'LogData' });
    expect(invalidatedTags).toContainEqual({ type: 'run' });
    // ... other tags
  });
});
```

### Add Test Utilities (if needed)

If test utilities for setting up API store don't exist, create:
- **File**: `libs/services/bublik-api/src/lib/endpoints/test-utils.ts`
- **Purpose**: Helper functions to setup store with API for testing cache invalidation

## Tags Explanation

Here's why each tag should be invalidated:

| Tag | Reason |
|-----|--------|
| `BUBLIK_TAG.Config` | Direct cache for configs - primary target |
| `BUBLIK_TAG.DashboardData` | Dashboard aggregations may depend on config settings |
| `BUBLIK_TAG.HistoryData` | History queries may be filtered by config-based criteria |
| `BUBLIK_TAG.LogData` | Log presentation and folding may be affected by config |
| `BUBLIK_TAG.Run` | Run display, stats, and filtering depend on configs |
| `BUBLIK_TAG.SessionList` | Session data may be affected by config changes |
| `BUBLIK_TAG.RunCompromiseStatus` | Compromised status checks may use config settings |
| `BUBLIK_TAG.RunExternalRefs` | External references may be configured |
| `BUBLIK_TAG.RunDetails` | Run details display depends on config |
| `'run-comment'` | Comments may be displayed based on config settings |

Tags NOT invalidated (and why):
- `BUBLIK_TAG.User` - User data is independent of configs
- `BUBLIK_TAG.AdminUsersTable` - Admin user management is independent of configs
- `BUBLIK_TAG.importEvents` - Import events are historical records, not affected by current configs
- `BUBLIK_TAG.Project` - Project definitions are independent of configs (though configs may reference projects)
- `BUBLIK_TAG.DeployInfo` - Deployment info is static

## Expected Behavior After Fix

### Scenario 1: User creates a new global config
1. User creates config "new-per-conf" with specific filter settings
2. All caches are invalidated
3. Next time user navigates to any page (runs, history, dashboard), fresh data is fetched
4. Data reflects the new config settings

### Scenario 2: User edits an existing report config
1. User changes aggregation settings in report config
2. All caches are invalidated
3. When viewing reports, they reflect updated aggregation logic
4. Historical data is recalculated with new settings

### Scenario 3: User activates/deactivates a config
1. User marks a config as active/inactive
2. All caches are invalidated
3. Active config changes are reflected across the application
4. Data filtering/display uses the newly active config

## Implementation Checklist

- [ ] Update `invalidatesTags` in `createConfig` mutation (Line 196)
- [ ] Update `invalidatesTags` in `editConfigById` mutation (Line 205)
- [ ] Update `invalidatesTags` in `deleteConfigById` mutation (Line 212)
- [ ] Create test file `configs-endpoints.spec.ts`
- [ ] Implement test utilities if needed (`test-utils.ts`)
- [ ] Add integration test for `createConfig` cache invalidation
- [ ] Add integration test for `editConfigById` cache invalidation
- [ ] Add integration test for `deleteConfigById` cache invalidation
- [ ] Run existing tests to ensure no regressions
- [ ] Manually test config changes in the application
- [ ] Verify that data refreshes after config mutations
- [ ] Check for any performance issues during cache invalidation

## Risk Assessment

**Low Risk**: The change only adds more tags to the `invalidatesTags` arrays. This is a safe operation that:
- Doesn't change the business logic of config mutations
- Only affects cache invalidation behavior
- Ensures data consistency by forcing refetches
- Uses RTK Query's built-in tag invalidation mechanism

**Potential Issues**:
1. **Performance**: Multiple refetches may occur simultaneously
   - **Mitigation**: RTK Query batches requests automatically. The refetches only happen for queries that are currently being used (active queries).
   
2. **User Experience**: Users might see loading states after config changes
   - **Mitigation**: This is expected behavior and ensures data consistency. Users will be shown accurate data.

3. **Over-invalidation**: Some tags may not need to be invalidated for certain config changes
   - **Mitigation**: Better to over-invalidate than under-invalidate. The cost of an extra API call is lower than the cost of showing stale data.

## Performance Considerations

1. **Batching**: RTK Query automatically batches concurrent requests, so multiple cache invalidations won't result in separate network requests.

2. **Active queries only**: Invalidation only triggers refetches for queries that are currently active (have components subscribed to them). This minimizes unnecessary network traffic.

3. **Cache time**: The API already sets reasonable `keepUnusedDataFor` times (15 minutes by default), so stale data naturally expires.

4. **Debouncing**: Consider adding debouncing if rapid config edits are common, but for now, immediate invalidation is safer for data consistency.

## Alternative Approaches Considered

### Option 1: Selective Invalidation Based on Config Type
Invalidate only tags that are relevant to the specific config type (global vs report vs project-scoped).

**Pros**:
- More targeted invalidation
- Fewer unnecessary refetches

**Cons**:
- More complex implementation
- Requires knowledge of which tags each config type affects
- Risk of missing some dependencies
- Harder to maintain as new config types are added

**Decision**: Not chosen due to complexity and maintenance overhead.

### Option 2: Full Cache Clear
Instead of invalidating specific tags, clear all caches.

**Pros**:
- Simplest implementation
- Guarantees no stale data

**Cons**:
- Very aggressive - affects even data that couldn't possibly be affected
- Would require reloading static data like user info, deploy info, etc.
- Poor user experience

**Decision**: Not chosen as it's too aggressive.

### Option 3: Backend Signals
Have the backend signal which caches need to be invalidated after config changes.

**Pros**:
- Most accurate - backend knows exactly what's affected

**Cons**:
- Requires backend changes
- Increases API complexity
- More round-trips
- Tightly couples frontend and backend logic

**Decision**: Not chosen as it requires backend changes and adds complexity.

### Option 4: Comprehensive Tag Invalidation (Chosen)
Invalidate all data-related cache tags that might be affected by config changes.

**Pros**:
- Ensures data consistency
- Simple to implement
- No backend changes required
- Easy to understand and maintain
- Uses RTK Query's built-in mechanism

**Cons**:
- May trigger some unnecessary refetches (but only for active queries)
- Less targeted than selective invalidation

**Decision**: This is the chosen approach as it provides the best balance of simplicity, correctness, and performance.

## References

- Redux Toolkit Query documentation on tag invalidation: https://redux-toolkit.js.org/rtk-query/usage/automated-refetching#tag-based-invalidation
- RTK Query cache behavior: https://redux-toolkit.js.org/rtk-query/api/createApi#keepunuseddatafor
- Issue URL: https://github.com/ts-factory/bublik-ui/issues/319

## Related Files

### Core Files
- `libs/services/bublik-api/src/lib/endpoints/configs-endpoints.ts` - Main file to modify
- `libs/services/bublik-api/src/lib/bublikAPI.ts` - API definition
- `libs/services/bublik-api/src/lib/types/index.ts` - Tag definitions

### Related Endpoints (for reference)
- `libs/services/bublik-api/src/lib/endpoints/dashboard-endpoints.ts`
- `libs/services/bublik-api/src/lib/endpoints/history-endpoints.ts`
- `libs/services/bublik-api/src/lib/endpoints/run-endpoints.ts`
- `libs/services/bublik-api/src/lib/endpoints/runs-endpoints.ts`
- `libs/services/bublik-api/src/lib/endpoints/log-endpoints.ts`
- `libs/services/bublik-api/src/lib/endpoints/measurements-endpoints.ts`

### UI Files (for manual testing)
- `apps/bublik/src/pages/configs/update-config-form/update-config-form.container.tsx`
- `apps/bublik/src/pages/configs/create-config-form/create-new-config.container.tsx`
- `apps/bublik/src/pages/configs/hooks/index.ts`

## Next Steps

1. Implement the code changes to update `invalidatesTags` arrays
2. Create test utilities if needed
3. Write integration tests for cache invalidation
4. Run tests and verify behavior
5. Manually test in the application:
   - Create a new config and verify data refreshes
   - Edit a config and verify data refreshes
   - Delete a config and verify data refreshes
   - Activate/deactivate a config and verify data refreshes
6. Monitor for any performance issues or user complaints
7. Document the behavior change if needed
