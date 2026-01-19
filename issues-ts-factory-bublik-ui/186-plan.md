# Implementation Plan: Issue #186 - Add date range search functionality to history date picker

## Overview
This plan details the implementation of date range search functionality (like "-3w -- now") for the history date picker, similar to what was already implemented for the runs date picker in commit 0fb0dbe7.

## Background
The runs feature already supports selecting dates based on duration (e.g., "Last 3 weeks", "Last 1 month") with two modes:
- **default**: Fixed date range selection
- **duration**: Sliding date range relative to "now"

The history feature currently only supports the default mode and needs to be enhanced to match the runs functionality.

## Key Differences Between Runs and History

### Runs Form
- Uses `AriaDateRangePicker` directly
- Form values: `dates: { start: DateValue; end: DateValue } | null`
- Mode is managed in form state: `calendarMode: 'default' | 'duration'`
- URL params: `calendarMode`, `duration`, `startDate`, `finishDate`

### History Form
- Uses `AriaDateRangeField` (react-hook-form wrapper)
- Form values: `dates: { startDate: Date; endDate: Date }`
- No mode in form state (needs to be added)
- URL params: `startDate`, `finishDate` (need to add `calendarMode`, `duration`)

## Implementation Approach

### Phase 1: Update Form Types

**File**: `libs/bublik/features/history/src/lib/history-global-search-form/global-search-form/global-search-form.types.ts`

**Changes**:
1. Add `calendarMode` field to `HistoryGlobalSearchFormValues` interface:
   ```typescript
   export interface HistoryGlobalSearchFormValues {
     calendarMode?: 'default' | 'duration';  // Add this line
     testName: string;
     hash: string;
     parameters: BadgeItem[];
     dates: { startDate: Date; endDate: Date };
     // ... rest of existing fields
   }
   ```

2. Add `calendarMode` to `defaultValues`:
   ```typescript
   export const defaultValues: HistoryGlobalSearchFormValues = {
     calendarMode: 'default',  // Add this line
     // ... rest of existing defaults
   };
   ```

### Phase 2: Update Form Component

**File**: `libs/bublik/features/history/src/lib/history-global-search-form/global-search-form/sections/run-section.tsx`

**Changes**:
1. Add `watch` and `setValue` from `useFormContext`
2. Update `AriaDateRangeField` to support mode switching:
   ```typescript
   const { control, formState, getFieldState, watch, setValue } =
     useFormContext<HistoryGlobalSearchFormValues>();
   
   // Update the AriaDateRangeField component
   <AriaDateRangeField
     label="Dates"
     name="dates"
     control={control}
     mode={watch('calendarMode')}
     onModeChange={(mode) => setValue('calendarMode', mode)}
     enabledModes={['default', 'duration']}
   />
   ```

**Note**: `AriaDateRangeField` already supports passing through `mode`, `onModeChange`, and `enabledModes` props to the underlying `DateRangePicker` component, so no changes are needed to `AriaDateRangeField` itself.

### Phase 3: Update Slice Types

**File**: `libs/bublik/features/history/src/lib/slice/history-slice.types.ts`

**Changes**:
1. Add `calendarMode` to `HistorySearchFormState`:
   ```typescript
   export type HistoryStateSearch = {
     calendarMode?: 'default' | 'duration';  // Add this line
     /* Test section */
     testName: string;
     hash: string;
     parameters: string[];
     revisions: string[];
     labels: string[];
     branches: string[];
     /* Run section */
     startDate: Date;
     finishDate: Date;
     runData: string[];
     runIds: string[];
     tagExpr: string;
     // ... rest of existing fields
   };
   ```

### Phase 4: Update Slice Utils

**File**: `libs/bublik/features/history/src/lib/slice/history-slice.utils.ts`

**Changes**:

1. Add imports at the top:
   ```typescript
   import {
     formatDuration,
     formatISODuration,
     intervalToDuration,
     sub
   } from 'date-fns';
   import { parseISODuration } from '@/shared/utils';
   ```

2. Update `queryToHistorySearchState` to handle duration mode:
   ```typescript
   export const queryToHistorySearchState = (
     query: HistoryAPIBackendQuery
   ): HistorySearchFormState => {
     const calendarMode = (query.calendarMode ?? 'default') as 'default' | 'duration';
     const searchDuration = query.duration;

     let startDate = DEFAULT_HISTORY_START_DATE;
     let finishDate = DEFAULT_HISTORY_END_DATE;

     if (calendarMode === 'duration' && searchDuration) {
       try {
         const duration = parseISODuration(searchDuration);
         const endDate = new Date();
         const computedStartDate = sub(endDate, duration);
         startDate = computedStartDate;
         finishDate = endDate;
       } catch {
         // Fall back to defaults on parse error
       }
     } else {
       startDate = query.fromDate
         ? parse(query.fromDate, API_DATE_FORMAT, new Date())
         : DEFAULT_HISTORY_START_DATE;

       finishDate = query.toDate
         ? parse(query.toDate, API_DATE_FORMAT, new Date())
         : DEFAULT_HISTORY_END_DATE;
     }

     return {
       calendarMode,
       labels: withDefault(parseArray(query.labels), []),
       testArgExpr: withDefault(query.testArgExpr, ''),
       /* Test section */
       testName: withDefault(query.testName, ''),
       hash: withDefault(query.hash, ''),
       parameters: withDefault(parseArray(query.testArgs), []),
       revisions: withDefault(parseArray(query.revisions), []),
       branches: withDefault(parseArray(query.branches), []),
       /* Run section */
       startDate,
       finishDate,
       runData: withDefault(parseArray(query.tags), []),
       tagExpr: withDefault(query.tagExpr, ''),
       runIds: withDefault(parseArray(query.runIds), []),
       branchExpr: withDefault(query.branchExpr, ''),
       verdictExpr: withDefault(query.verdictExpr, ''),
       revisionExpr: withDefault(query.revExpr, ''),
       labelExpr: withDefault(query.labelExpr, ''),
       /* Result section */
       runProperties: withDefault(parseArray(query.runProperties), []),
       resultProperties: withDefault(parseArray(query.resultTypes), []),
       results: withDefault(parseArray(query.resultStatuses), []),
       /* Verdict section */
       verdictLookup: withDefault(query.verdictLookup, VERDICT_TYPE.String),
       verdict: withDefault(parseArray(query.verdict), [])
     };
   };
   ```

3. Update `historySearchStateToForm`:
   ```typescript
   export const historySearchStateToForm = (
     state: HistorySearchFormState
   ): HistoryGlobalSearchFormValues => {
     return {
       calendarMode: state.calendarMode ?? 'default',
       labelExpr: state.labelExpr,
       branchExpr: state.branchExpr,
       verdictExpr: state.verdictExpr,
       testArgExpr: state.testArgExpr,
       revisionExpr: state.revisionExpr,
       /* Test section */
       testName: state.testName,
       hash: state.hash,
       parameters: arrayToBadgeItem(state.parameters),
       revisions: arrayToBadgeItem(state.revisions),
       branches: arrayToBadgeItem(state.branches),
       labels: arrayToBadgeItem(state.labels),
       /* Run section */
       runData: arrayToBadgeItem(state.runData),
       runIds: state.runIds?.join(config.queryDelimiter) ?? '',
       tagExpr: state.tagExpr,
       dates: { startDate: state.startDate, endDate: state.finishDate },
       /* Result section */
       resultProperties: state.resultProperties,
       runProperties: state.runProperties,
       results: state.results,
       /* Verdict section */
       verdictLookup: state.verdictLookup,
       verdict: arrayToBadgeItem(state.verdict)
     };
   };
   ```

4. Update `historySearchStateToQuery` to handle duration mode:
   ```typescript
   export const historySearchStateToQuery = (
     state: HistorySearchFormState
   ): HistoryAPIQuery => {
     const calendarMode = state.calendarMode ?? 'default';
     const isDurationMode = calendarMode === 'duration';

     return {
       /* Test section */
       testName: state.testName,
       hash: state.hash,
       labels: withDefault(arrayToString(state.labels), ''),
       parameters: withDefault(arrayToString(state.parameters), ''),
       revisions: withDefault(arrayToString(state.revisions), ''),
       branches: withDefault(arrayToString(state.branches), ''),
       /* Run section */
       runData: withDefault(arrayToString(state.runData), ''),
       tagExpr: withDefault(state.tagExpr, ''),
       branchExpr: withDefault(state.branchExpr, ''),
       labelExpr: withDefault(state.labelExpr, ''),
       testArgExpr: withDefault(state.testArgExpr, ''),
       revisionExpr: withDefault(state.revisionExpr, ''),
       verdictExpr: withDefault(state.verdictExpr, ''),
       startDate: formatTimeToAPI(state.startDate),
       finishDate: formatTimeToAPI(state.finishDate),
       runIds: withDefault(arrayToString(state.runIds), ''),
       /* Result section */
       resultProperties: withDefault(arrayToString(state.resultProperties), ''),
       runProperties: withDefault(arrayToString(state.runProperties), ''),
       results: withDefault(arrayToString(state.results), ''),
       /* Verdict section */
       verdictLookup: state.verdictLookup,
       verdict: withDefault(arrayToString(state.verdict), '')
     };
   };
   ```

5. Update `formToSearchState`:
   ```typescript
   export const formToSearchState = (
     form: HistoryGlobalSearchFormValues
   ): Omit<HistorySearchFormState, 'page' | 'pageSize'> => {
     return {
       calendarMode: form.calendarMode,
       labels: badgeItemToArray(form.labels),
       labelExpr: form.labelExpr,
       /* Test section */
       testName: form.testName,
       hash: form.hash,
       parameters: badgeItemToArray(form.parameters),
       revisions: badgeItemToArray(form.revisions),
       branches: badgeItemToArray(form.branches),
       /* Run section */
       startDate: form.dates.startDate,
       finishDate: form.dates.endDate,
       runData: badgeItemToArray(form.runData),
       runIds: form.runIds.split(config.queryDelimiter),
       tagExpr: form.tagExpr,
       revisionExpr: form.revisionExpr,
       testArgExpr: form.testArgExpr,
       verdictExpr: form.verdictExpr,
       branchExpr: form.branchExpr,
       /* Result section */
       runProperties: form.runProperties,
       resultProperties: form.resultProperties,
       results: form.results,
       /* Verdict section */
       verdictLookup: form.verdictLookup,
       verdict: badgeItemToArray(form.verdict)
     };
   };
   ```

### Phase 5: Update Slice Hooks

**File**: `libs/bublik/features/history/src/lib/slice/history-slice.hooks.ts`

**Changes**:

Update `handleGlobalSearchSubmit` to handle duration mode:
```typescript
const handleGlobalSearchSubmit = useCallback(
  (form: HistoryGlobalSearchFormValues) => {
    const params = historySearchStateToQuery(formToSearchState(form));
    const newSearchParams = new URLSearchParams(params);

    // Add calendarMode and duration to search params
    newSearchParams.set('calendarMode', form.calendarMode ?? 'default');
    
    if (form.calendarMode === 'duration' && form.dates.startDate && form.dates.endDate) {
      newSearchParams.set(
        'duration',
        formatISODuration(
          intervalToDuration({
            start: form.dates.startDate,
            end: form.dates.endDate
          })
        )
      );
    } else {
      newSearchParams.delete('duration');
    }

    newSearchParams.set('mode', mode);
    newSearchParams.set('page', String(1));
    newSearchParams.set('pageSize', String(pageSize));
    newSearchParams.delete(PROJECT_KEY);

    for (const [key, value] of searchParams) {
      if (key !== PROJECT_KEY) continue;
      newSearchParams.append(PROJECT_KEY, value);
    }

    setSearchParams(newSearchParams, { replace: true });
    actions.resetGlobalFilter();
    dispatch(bublikAPI.util.invalidateTags([BUBLIK_TAG.HistoryData]));
  },
  [actions, dispatch, mode, pageSize, searchParams, setSearchParams]
);
```

### Phase 6: Update Shared Types (Optional but Recommended)

**File**: `libs/shared/types/src/lib/history.ts`

**Changes**:

Add `calendarMode` and `duration` to query types if needed:

```typescript
export type HistoryAPIBackendQuery = {
  testName?: string;
  hash?: string;
  testArgs?: string;
  revisions?: string;
  branches?: string;
  labels?: string;
  calendarMode?: 'default' | 'duration';  // Add this
  duration?: string;  // Add this
  fromDate?: string;
  toDate?: string;
  tags?: string;
  tagExpr?: string;
  // ... rest of existing fields
};

export type HistoryAPIQuery = {
  calendarMode?: 'default' | 'duration';  // Add this
  duration?: string;  // Add this
  page?: string;
  pageSize?: string;
  // ... rest of existing fields
};
```

### Phase 7: Update Form Hooks (If Needed)

**File**: `libs/bublik/features/history/src/lib/history-global-search-form/global-search-form/global-search-form.hooks.ts`

**Changes**:

Update `resetRunSection` to preserve `calendarMode`:
```typescript
const resetRunSection = () => {
  methods.reset({
    ...methods.getValues(),
    calendarMode: methods.getValues().calendarMode,  // Preserve mode
    revisions: [],
    revisionExpr: '',
    runData: [],
    runIds: '',
    branchExpr: '',
    labels: [],
    branches: [],
    tagExpr: '',
    runProperties: HISTORY_CONSTANTS.runProperties
  });
};
```

### Phase 8: Add URL Parameter Handlers

Create utility functions similar to the runs feature for handling search params <-> form conversion. These should be added to the slice hooks file:

```typescript
function searchParamsToForm(
  searchParams: URLSearchParams,
  state: HistorySearchFormState
): HistoryGlobalSearchFormValues {
  const calendarMode = (searchParams.get('calendarMode') ?? 
    state.calendarMode ?? 'default') as 'default' | 'duration';
  const searchDuration = searchParams.get('duration');
  const startDate = state.startDate;
  const finishDate = state.finishDate;

  let dates = { startDate, finishDate };

  try {
    if (calendarMode === 'duration' && searchDuration) {
      const duration = parseISODuration(searchDuration);
      const endDate = new Date();
      const computedStartDate = sub(endDate, duration);

      dates = {
        startDate: computedStartDate,
        endDate: endDate
      };
    }
  } catch (e: unknown) {
    // Keep default dates on error
  }

  return {
    calendarMode,
    dates,
    labelExpr: state.labelExpr,
    branchExpr: state.branchExpr,
    verdictExpr: state.verdictExpr,
    testArgExpr: state.testArgExpr,
    revisionExpr: state.revisionExpr,
    /* Test section */
    testName: state.testName,
    hash: state.hash,
    parameters: arrayToBadgeItem(state.parameters),
    revisions: arrayToBadgeItem(state.revisions),
    branches: arrayToBadgeItem(state.branches),
    labels: arrayToBadgeItem(state.labels),
    /* Run section */
    runData: arrayToBadgeItem(state.runData),
    runIds: state.runIds?.join(config.queryDelimiter) ?? '',
    tagExpr: state.tagExpr,
    /* Result section */
    resultProperties: state.resultProperties,
    runProperties: state.runProperties,
    results: state.results,
    /* Verdict section */
    verdictLookup: state.verdictLookup,
    verdict: arrayToBadgeItem(state.verdict)
  };
}
```

## Testing Strategy

### Manual Testing
1. Open history page
2. Click on global search form
3. Verify that the date picker shows mode toggle (Fixed/Sliding)
4. Test default mode: select specific dates and submit
5. Test duration mode: click "Last 1 Week", "Last 1 Month", etc. and submit
6. Verify URL contains correct parameters:
   - Default mode: `calendarMode=default&startDate=YYYY-MM-DD&finishDate=YYYY-MM-DD`
   - Duration mode: `calendarMode=duration&duration=P1W&startDate=YYYY-MM-DD&finishDate=YYYY-MM-DD`
7. Test URL sharing: bookmark URL with duration mode, open in new tab/incognito
8. Verify dates are recalculated relative to "now" for duration mode
9. Test reset functionality preserves mode

### Unit Tests
Consider adding tests for:
1. `searchParamsToForm` function
2. `formToSearchState` function with duration mode
3. `historySearchStateToQuery` with duration mode
4. `queryToHistorySearchState` with duration parameter

### Integration Tests
Test the complete flow:
1. Form submission with duration mode
2. URL parameter handling
3. Page reload with duration parameters
4. Mode switching between default and duration

## Implementation Order

1. **Phase 1**: Update form types (add `calendarMode`)
2. **Phase 2**: Update form component (add mode switching UI)
3. **Phase 3**: Update slice types (add `calendarMode` to state)
4. **Phase 4**: Update slice utils (handle duration conversion)
5. **Phase 5**: Update slice hooks (handle form submission)
6. **Phase 6**: Update shared types (optional)
7. **Phase 7**: Update form hooks (preserve mode on reset)
8. **Phase 8**: Add URL parameter handlers

## Files to Modify

1. `libs/bublik/features/history/src/lib/history-global-search-form/global-search-form/global-search-form.types.ts`
2. `libs/bublik/features/history/src/lib/history-global-search-form/global-search-form/sections/run-section.tsx`
3. `libs/bublik/features/history/src/lib/slice/history-slice.types.ts`
4. `libs/bublik/features/history/src/lib/slice/history-slice.utils.ts`
5. `libs/bublik/features/history/src/lib/slice/history-slice.hooks.ts`
6. `libs/shared/types/src/lib/history.ts` (optional)

## Potential Issues and Solutions

### Issue 1: Date format mismatch between `AriaDateRangeField` and form state
**Solution**: `AriaDateRangeField` already handles conversion between `DateValue` (used by `DateRangePicker`) and `Date` (used in form state), so no changes needed.

### Issue 2: Duration format compatibility
**Solution**: Use `formatISODuration` and `parseISODuration` functions (already available in date-fns and shared utils) to ensure ISO 8601 duration format (e.g., "P1W" for 1 week, "P3M" for 3 months).

### Issue 3: Time zone handling
**Solution**: The existing implementation uses `getLocalTimeZone()` from `@internationalized/date` consistently, which should be followed in the new code.

### Issue 4: URL parameter conflicts
**Solution**: Ensure that when switching modes, the old mode's parameters are cleared (e.g., delete `duration` when switching to default mode).

## Dependencies

All required dependencies are already present:
- `date-fns` (version 2.30.0) - provides `formatISODuration`, `intervalToDuration`, `sub`, `formatDuration`
- `@internationalized/date` - provides `getLocalTimeZone`, `parseDate`, `today`
- `react-hook-form` - provides form state management
- `react-router-dom` - provides `useSearchParams`

## Success Criteria

1. Users can select dates using duration mode (e.g., "Last 3 weeks")
2. URL parameters include `calendarMode` and `duration` when using duration mode
3. Duration-based searches are recalculated relative to "now" when the page is loaded
4. Mode can be switched between default and duration
5. Reset functionality preserves the selected mode
6. URLs can be shared and will work correctly in different sessions

## Related Files (Reference Only)

Reference the runs implementation for guidance:
- `libs/bublik/features/runs/src/lib/runs-form/runs-form.component.tsx`
- `libs/bublik/features/runs/src/lib/runs-form/runs-form.container.tsx`
- `libs/bublik/features/runs/src/lib/hooks.ts`
