# Issue #389: History - Add Iteration Details to Line Labels in Stacked View

## Problem Statement

In the stacked history view, line labels currently only show chart titles which may overlap when multiple charts from different iterations are displayed together. This makes it difficult to distinguish which line corresponds to which iteration.

The issue requires displaying iteration details (test name, start time, parameters) in line labels to clearly identify each iteration.

## Current Implementation Analysis

### 1. Stacked View Architecture

**Component:** `HistoryMeasurementsCombinedContainer`
- Location: `/libs/bublik/features/history/src/lib/history-measurements-combined/history-measurements-combined.container.tsx`
- Uses: `StackedMeasurementChart` from `@/shared/charts`

**Chart Rendering:** `StackedMeasurementChart`
- Location: `/libs/shared/charts/src/lib/single-measurement-chart/measurement-chart.component.tsx`
- Uses: `resolveStackedOptions` function to generate ECharts options

### 2. Data Flow

The stacked view receives data from two sources:

1. **Trend Charts** (`useGetHistoryMeasurements()`):
   - Type: `SingleMeasurementChart[]`
   - These are aggregated charts across multiple results
   - No iteration-specific data available

2. **Measurement Series Charts** (`useGetHistoryMeasurementsByResult()`):
   - Type: `HistoryMeasurementResult[]`
   - Contains:
     - `test_name`: string
     - `start`: string (ISO date)
     - `parameters_list`: string[]
     - `measurement_series_charts`: `SingleMeasurementChart[]`

### 3. Type Definitions

**SingleMeasurementChartWithContext:**
```typescript
// Location: libs/shared/charts/src/lib/single-measurement-chart/measurement-chart.component.utils.ts
export type SingleMeasurementChartWithContext = SingleMeasurementChart & {
  parameters?: string[];
};
```

**HistoryMeasurementResult:**
```typescript
// Location: libs/services/bublik-api/src/lib/endpoints/measurements-endpoints.ts
export type HistoryMeasurementResult = {
  id: number;
  start: string;
  test_name: string;
  run_id: number;
  result_id: number;
  parameters_list: string[];
  measurement_series_charts: SingleMeasurementChart[];
};
```

### 4. Line Label Generation

Line labels (legend names) are generated in `resolveStackedOptions` function:

```typescript
// Location: libs/shared/charts/src/lib/single-measurement-chart/measurement-chart.component.utils.ts (line 300)
const title = getChartName(plot);  // Returns "chart title - axis_y label"
const paramsSuffix = formatParamsForDisplay(plot.parameters, differingParams);

name: `${title.replace(/\u200B/g, '')}${paramsSuffix}${`\u200B`.repeat(idx)}`
```

**Current Behavior:**
- Shows chart title (e.g., "Throughput - MB/s")
- Appends differing parameters (e.g., " (param1=value1 | param2=value2)")
- Zero-width spaces are added for legend spacing

## Proposed Solution

### Phase 1: Extend Type Definitions

#### 1.1 Extend `SingleMeasurementChartWithContext`

**File:** `libs/shared/charts/src/lib/single-measurement-chart/measurement-chart.component.utils.ts`

```typescript
export type SingleMeasurementChartWithContext = SingleMeasurementChart & {
  parameters?: string[];
  test_name?: string;      // NEW: Iteration test name
  start?: string;          // NEW: Iteration start time (ISO string)
};
```

### Phase 2: Pass Iteration Data to Charts

#### 2.1 Modify `HistoryMeasurementsCombinedContainer`

**File:** `libs/bublik/features/history/src/lib/history-measurements-combined/history-measurements-combined.container.tsx`

**Current Code (lines 45-66):**
```typescript
const plots = useMemo(() => {
  if (!data) return [];
  if (!byResult) return [];

  const allCharts = [
    ...data,
    ...byResult.flatMap((c) => c.measurement_series_charts)
  ];

  const plotIdsStr = searchParams.get('combinedPlots');

  if (!plotIdsStr) return [];

  const plotIds = plotIdsStr.split(';').map(String);

  return allCharts
    .filter((p) => plotIds.includes(String(p.id)))
    .map((p) => ({
      ...p,
      parameters: selectedCharts.find((c) => c.plot.id === p.id)?.parameters
    }));
}, [byResult, data, searchParams, selectedCharts]);
```

**Modified Code:**
```typescript
const plots = useMemo(() => {
  if (!data) return [];
  if (!byResult) return [];

  // Create a map of chart IDs to their parent HistoryMeasurementResult
  const chartIdToResult = new Map<number, HistoryMeasurementResult>();
  byResult.forEach((result) => {
    result.measurement_series_charts.forEach((chart) => {
      chartIdToResult.set(chart.id, result);
    });
  });

  const allCharts = [
    ...data,
    ...byResult.flatMap((c) => c.measurement_series_charts)
  ];

  const plotIdsStr = searchParams.get('combinedPlots');

  if (!plotIdsStr) return [];

  const plotIds = plotIdsStr.split(';').map(String);

  return allCharts
    .filter((p) => plotIds.includes(String(p.id)))
    .map((p) => {
      const result = chartIdToResult.get(p.id);
      return {
        ...p,
        parameters: selectedCharts.find((c) => c.plot.id === p.id)?.parameters ?? result?.parameters_list,
        test_name: result?.test_name,
        start: result?.start
      };
    });
}, [byResult, data, searchParams, selectedCharts]);
```

**Rationale:**
- Creates a mapping from chart IDs to their parent `HistoryMeasurementResult`
- For charts from `byResult`, includes `test_name` and `start` from the parent result
- For trend charts from `data`, these fields remain undefined (as expected)
- Falls back to `result.parameters_list` if parameters not in `selectedCharts`

### Phase 3: Format Line Labels with Iteration Details

#### 3.1 Add Formatting Utilities

**File:** `libs/shared/charts/src/lib/single-measurement-chart/measurement-chart.component.utils.ts`

Add these helper functions before `resolveStackedOptions`:

```typescript
import { format, isValid, parseISO } from 'date-fns';
import { TIME_DOT_FORMAT_FULL } from '@/shared/utils';

/**
 * Formats the iteration start time for display in legend
 * @param start - ISO date string
 * @returns formatted time string (e.g., "01.02.2023 12:34:56")
 */
function formatIterationStart(start: string | undefined): string {
  if (!start) return '';
  const date = parseISO(start);
  if (!isValid(date)) return '';
  return format(date, TIME_DOT_FORMAT_FULL);
}

/**
 * Creates a legend name with iteration details
 * @param title - Chart title
 * @param testName - Test name (optional)
 * @param start - Start time (optional)
 * @param parameters - Parameters array
 * @param differingParams - Set of parameters that differ across charts
 * @returns Formatted legend name
 */
function formatLegendName(
  title: string,
  testName: string | undefined,
  start: string | undefined,
  parameters: string[] | undefined,
  differingParams: Set<string>
): string {
  const parts: string[] = [title];

  // Add test name if available
  if (testName) {
    parts.push(testName);
  }

  // Add formatted start time if available
  const formattedStart = formatIterationStart(start);
  if (formattedStart) {
    parts.push(formattedStart);
  }

  // Add relevant parameters (only those that differ)
  const paramsSuffix = formatParamsForDisplay(parameters, differingParams);
  if (paramsSuffix) {
    parts.push(paramsSuffix.trim());
  }

  return parts.join(' | ');
}
```

#### 3.2 Modify `resolveStackedOptions` Function

**File:** `libs/shared/charts/src/lib/single-measurement-chart/measurement-chart.component.utils.ts`

**Current Code (lines 299-311):**
```typescript
series: plots.map((plot, idx) => {
  const title = getChartName(plot);
  const yAxisIndex = plotToYAxisIndex.get(idx)!;
  const paramsSuffix = formatParamsForDisplay(
    plot.parameters,
    differingParams
  );

  return {
    type: 'line',
    name: `${title.replace(/\u200B/g, '')}${paramsSuffix}${`\u200B`.repeat(idx)}`,
    // ... rest of the series config
  };
}),
```

**Modified Code:**
```typescript
series: plots.map((plot, idx) => {
  const title = getChartName(plot);
  const yAxisIndex = plotToYAxisIndex.get(idx)!;

  // Format legend name with iteration details
  const legendName = formatLegendName(
    title,
    plot.test_name,
    plot.start,
    plot.parameters,
    differingParams
  );

  return {
    type: 'line',
    name: `${legendName.replace(/\u200B/g, '')}${`\u200B`.repeat(idx)}`,
    // ... rest of the series config remains unchanged
  };
}),
```

**Import Addition:**
```typescript
import { format, isValid, parseISO } from 'date-fns';
import { TIME_DOT_FORMAT_FULL } from '@/shared/utils';
```

### Phase 4: Update Context Types (Optional Enhancement)

If we want to store iteration details in the combined charts context, update:

#### 4.1 Modify `SelectedChart` Interface

**File:** `libs/bublik/features/history/src/lib/history-measurements/combined-charts.context.tsx`

```typescript
export interface SelectedChart {
  plot: SingleMeasurementChart;
  parameters?: string[];
  color: string;
  test_name?: string;      // NEW
  start?: string;          // NEW
}
```

#### 4.2 Update `handleAddChartClick` in CombinedChartsProvider

If needed, update to accept and store iteration details when adding charts.

## Expected Behavior

### Before Fix
```
Legend:
- Throughput - MB/s
- Throughput - MB/s (param1=value1)
- Throughput - MB/s (param1=value2 | param2=value2)
```
Lines with identical or similar titles overlap, making them hard to distinguish.

### After Fix
```
Legend:
- Throughput - MB/s | test_name | 01.02.2023 12:34:56 | param1=value1 | param2=value2
- Throughput - MB/s | test_name | 01.02.2023 12:45:12 | param1=value1 | param2=value3
- Throughput - MB/s | test_name | 01.02.2023 13:20:30 | param1=value2 | param2=value2
```

Each line label now includes:
1. Chart title (existing)
2. Test name (new)
3. Start time (new, formatted as "DD.MM.YYYY HH:MM:SS")
4. Differing parameters (existing, but now works with iteration details)

### Trend Charts
For trend charts (which are aggregated), iteration details (`test_name`, `start`) will be undefined, so the legend will show only:
- Chart title
- Differing parameters (if any)

This is appropriate since trend charts represent aggregated data across multiple iterations.

## Files to Modify

### Primary Changes
1. **`libs/shared/charts/src/lib/single-measurement-chart/measurement-chart.component.utils.ts`**
   - Extend `SingleMeasurementChartWithContext` type
   - Add `formatIterationStart` helper function
   - Add `formatLegendName` helper function
   - Modify `resolveStackedOptions` to use new formatting
   - Add necessary imports

2. **`libs/bublik/features/history/src/lib/history-measurements-combined/history-measurements-combined.container.tsx`**
   - Modify `plots` useMemo to pass `test_name` and `start` from `byResult`

### Optional Changes (if context enhancement is needed)
3. **`libs/bublik/features/history/src/lib/history-measurements/combined-charts.context.tsx`**
   - Update `SelectedChart` interface
   - Update `handleAddChartClick` logic

## Testing Requirements

### Unit Tests
1. **`formatIterationStart` function:**
   - Test with valid ISO date string
   - Test with undefined input
   - Test with invalid date string

2. **`formatLegendName` function:**
   - Test with all fields present (title, test_name, start, parameters)
   - Test with only title and test_name
   - Test with only title and start
   - Test with only title and parameters
   - Test with only title
   - Test edge cases (empty arrays, undefined values)

3. **`resolveStackedOptions` function:**
   - Test that series names include iteration details
   - Test that trend charts (without iteration details) still work
   - Test that parameters are correctly displayed

### Integration Tests
1. **`HistoryMeasurementsCombinedContainer`:**
   - Verify plots include `test_name` and `start` from `byResult`
   - Verify trend charts (from `data`) don't have these fields
   - Verify parameters are correctly populated

2. **Manual Testing:**
   - Open History page
   - Search for a test with multiple results
   - Switch to "Series Charts" view
   - Select multiple charts from different iterations
   - Open "Combined" view
   - Verify line labels show test name, start time, and parameters
   - Verify labels are distinct and don't overlap confusingly

## Implementation Approach

### Step-by-Step Implementation

1. **Create feature branch:**
   ```bash
   git checkout -b feature/389-add-iteration-details-to-stacked-view
   ```

2. **Implement type changes:**
   - Extend `SingleMeasurementChartWithContext` in utils file
   - (Optional) Update `SelectedChart` in context

3. **Add helper functions:**
   - Implement `formatIterationStart`
   - Implement `formatLegendName`
   - Add necessary imports

4. **Modify data mapping:**
   - Update `HistoryMeasurementsCombinedContainer` to pass iteration details

5. **Update legend formatting:**
   - Modify `resolveStackedOptions` to use new formatting function

6. **Write unit tests:**
   - Create test file for formatting functions
   - Create tests for updated functions

7. **Manual testing:**
   - Test the stacked view with real data
   - Verify labels are clear and distinct

8. **Create pull request:**
   - Summarize changes
   - Include screenshots showing before/after

### Risk Assessment

**Low Risk Changes:**
- Adding optional fields to TypeScript interfaces (backward compatible)
- Formatting logic only affects legend display

**Moderate Risk Areas:**
- Changes to legend name format may affect existing users' workflow
- Date parsing/formatting needs proper error handling

**Mitigation:**
- All new fields are optional (undefined handling required)
- Format functions have null/undefined checks
- Add comprehensive tests
- Manual testing with various data scenarios

### Edge Cases to Handle

1. **Missing data:**
   - `test_name` is undefined (trend charts)
   - `start` is undefined or invalid
   - `parameters` is empty or undefined
   - All above handled gracefully with fallback logic

2. **Long strings:**
   - Very long test names
   - Very long parameter values
   - Legend has built-in scrolling and truncation support

3. **Same values across charts:**
   - All charts have same test_name → still shown but visually redundant
   - Differing params logic already handles this well

## Alternative Approaches Considered

### Approach 1: Tooltip Only (Rejected)
- Show iteration details only on hover
- **Cons:** Doesn't solve the overlapping issue; still need to identify lines without hovering

### Approach 2: Separate Panel (Rejected)
- Add a side panel showing iteration details for each line
- **Cons:** Uses more screen space; adds UI complexity

### Approach 3: Click to Highlight (Rejected)
- Click legend item to highlight corresponding line
- **Cons:** Doesn't make labels distinct; requires user interaction

**Selected Approach:** Include iteration details directly in legend labels as this provides immediate visual identification and follows the user's expectation stated in the issue.

## Dependencies

### External Libraries
- `date-fns`: Already imported in project for date formatting
- Used for: `format`, `isValid`, `parseISO`
- Constants: `TIME_DOT_FORMAT_FULL` (already exists)

### Internal Dependencies
- `@/shared/utils`: For `TIME_DOT_FORMAT_FULL` constant
- `@/shared/types`: For existing types

## Notes

1. **Backward Compatibility:** All changes are backward compatible. Trend charts will continue to work as before (without iteration details).

2. **Performance:** No significant performance impact. The mapping and formatting are done in `useMemo` and only when data changes.

3. **Accessibility:** Legend labels will be more descriptive, improving accessibility for users who rely on screen readers or have difficulty distinguishing similar-colored lines.

4. **Internationalization:** Date format uses `TIME_DOT_FORMAT_FULL` which should be consistent with existing date formatting in the application.

5. **Zero-width spaces:** The existing zero-width space logic for legend spacing is preserved, ensuring no regression in legend layout.

## Success Criteria

1. Line labels in stacked view include test name
2. Line labels include formatted start time
3. Line labels include relevant parameters
4. Trend charts (without iteration data) still display correctly
5. Labels are distinct and don't overlap confusingly
6. No regression in existing functionality
7. All unit tests pass
8. Manual testing confirms the fix

## Related Issues

- Issue #389 (this issue)

## References

- Issue Image: https://github.com/user-attachments/assets/0690e581-f9ce-492d-b0ff-7f4046a6a178
- Codebase: /Users/limonikas/workspace/bublik-home/bublik-docker/bublik-ui
- Issue URL: https://github.com/ts-factory/bublik-ui/issues/389
