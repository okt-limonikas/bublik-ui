# Plan for Issue #421: Display Microseconds on Y-Axis

## Issue Summary

The issue is that when displaying latency graphs with very small values (e.g., 0.00000000004 seconds), the Y-axis shows these as tiny decimal numbers instead of using a more readable unit like microseconds. The base unit is seconds and multiplier is nanoseconds (1e-9).

## Root Cause Analysis

### Files Identified

1. **`libs/bublik/features/session-log/src/lib/v1/log-blocks/log-table/blocks/log-content-mi/blocks/log-mi-chart/log-mi-chart.utils.ts`**
   - Contains the `convertRawToCharts` function that converts raw measurement data to ECharts configuration
   - Currently calculates Y-values as: `Number(entry.value) * Number(entry.multiplier)`
   - Sets Y-axis labels using the base unit directly: `axisLabel: { formatter: \`{value} ${units}\` }`

2. **`libs/bublik/features/session-log/src/lib/v1/log-blocks/log-table/blocks/log-content-mi/blocks/log-mi-chart/log-mi-chart.component.tsx`**
   - Displays raw values with multiplier and units in the ResultDescription component
   - Uses the Chart component to render ECharts

3. **`libs/shared/types/src/lib/log-json-schema/blocks.ts`**
   - Defines the LogContentMiChart type structure with base_units, multiplier, and value fields

4. **`libs/shared/charts/src/lib/single-measurement-chart/measurement-chart.component.utils.ts`**
   - Similar chart rendering for measurements (MI view in measurements page)
   - Uses SingleMeasurementChart type which doesn't include unit information directly

### Current Behavior

1. For latency measurements:
   - `base_units`: "seconds"
   - `multiplier`: "1e-9" (nanoseconds)
   - `value`: e.g., 40
   - **Displayed value**: 40 * 1e-9 = 0.00000004 seconds
   - **Y-axis label**: Shows "0.00000004 s" which is hard to read

2. The Y-axis formatter simply concatenates the value with the base unit:
   ```typescript
   axisLabel: { formatter: `{value} ${units}` }
   ```

### Desired Behavior

- When values are very small (nanosecond range when expressed in seconds), automatically convert to and display in microseconds
- For example: 0.00000004 seconds → 40 microseconds → display as "40 μs"
- The Y-axis should dynamically choose the most appropriate unit based on the magnitude of values

## Implementation Plan

### Phase 1: Create Utility Functions for Unit Conversion

**File**: `libs/shared/utils/src/lib/unit-formatter.ts` (new file)

Create utility functions to:
1. Determine the best display unit based on value magnitude
2. Convert values between units
3. Format axis labels with appropriate units

```typescript
// Supported time units with their multipliers relative to base unit (seconds)
const TIME_UNITS = [
  { label: 'ns', multiplier: 1e-9, threshold: 1e-7 },  // nanosecond
  { label: 'μs', multiplier: 1e-6, threshold: 1e-4 },  // microsecond  
  { label: 'ms', multiplier: 1e-3, threshold: 1 },      // millisecond
  { label: 's',  multiplier: 1,    threshold: Infinity }, // second
];

export function findBestUnitForValues(values: number[]): { label: string; multiplier: number } {
  // Find the max absolute value
  const maxAbsValue = Math.max(...values.map(Math.abs));
  
  // Find the smallest unit where maxAbsValue >= threshold
  const bestUnit = TIME_UNITS.find(unit => maxAbsValue >= unit.threshold) || TIMEUnits[TIMEUnits.length - 1];
  
  return bestUnit;
}

export function convertToDisplayUnit(value: number, displayMultiplier: number): number {
  return value / displayMultiplier;
}

export function formatAxisLabel(value: number, unitLabel: string): string {
  return `${value} ${unitLabel}`;
}
```

### Phase 2: Update Log MI Chart Utilities

**File**: `libs/bublik/features/session-log/src/lib/v1/log-blocks/log-table/blocks/log-content-mi/blocks/log-mi-chart/log-mi-chart.utils.ts`

**Changes to `createYaxises` function:**

1. For each Y-axis result:
   - Collect all Y-values from the dataset
   - Calculate the best display unit for these values
   - Convert all Y-values to the display unit
   - Update the axis label formatter to use the display unit

```typescript
const createYaxises = (config: YAxisConfig): { type?: string; axis: YAXisComponentOption, displayMultiplier?: number }[] => {
  const { xAxisResultType, axis, results } = config;

  if (!axis) {
    return results
      .filter((result) => result.type !== xAxisResultType)
      .map((result) => {
        const baseUnits = result.entries?.[0]?.base_units;
        
        // Get all Y-values for this result
        const yValues = result.entries
          .filter((entry) => entry.aggr === 'single')
          .map((entry) => Number(entry.value) * Number(entry.multiplier));
        
        // Find best display unit (only for time units)
        const bestUnit = baseUnits === 'seconds' 
          ? findBestUnitForValues(yValues)
          : { label: baseUnits, multiplier: 1 };
        
        return {
          type: result.type,
          displayMultiplier: bestUnit.multiplier,
          axis: {
            type: 'value',
            name: result.name,
            position: 'left',
            scale: true,
            alignTicks: true,
            min: (value) => value.min * 0.9,
            max: (value) => value.max * 1.1,
            nameTextStyle: { opacity: 0 },
            axisLine: { show: true, lineStyle: {} },
            axisLabel: { 
              formatter: (value: number) => `${value} ${bestUnit.label}`
            }
          }
        };
      });
  }

  return axis.map((axis) => {
    const result = results.find(
      (result) => result.type === axis.type && result.name === axis.name
    );
    const baseUnits = result?.entries[0]?.base_units;
    
    // Get all Y-values for this result
    const yValues = result?.entries
      .filter((entry) => entry.aggr === 'single')
      .map((entry) => Number(entry.value) * Number(entry.multiplier)) || [];
    
    // Find best display unit
    const bestUnit = baseUnits === 'seconds'
      ? findBestUnitForValues(yValues)
      : { label: baseUnits || '', multiplier: 1 };
    
    return {
      type: axis.type,
      displayMultiplier: bestUnit.multiplier,
      axis: {
        type: 'value',
        name: axis.name,
        scale: true,
        position: 'left',
        alignTicks: true,
        axisLine: { show: true, lineStyle: {} },
        axisLabel: {
          formatter: (value: number) => `${value} ${bestUnit.label}`
        }
      }
    };
  });
};
```

**Changes to `createSeries` function:**

1. Pass displayMultiplier from yAxis configuration
2. Convert Y-values to the display unit

```typescript
const createSeries = (config: SeriesConfig): SeriesOption[] => {
  return config.yAxises.map((yAxis) => {
    const result = config.results.find(
      (result) =>
        result.type === yAxis.type && result.name === yAxis.axis.name
    );

    if (!result)
      return {
        name:
          yAxis.axis.name ||
          (yAxis.type ? upperCaseFirstLetter(yAxis.type) : ''),
        type: 'line',
        data: []
      };

    const rawYValues = result.entries
      .filter((entry) => entry.aggr === 'single')
      .map((entry) => Number(entry.value) * Number(entry.multiplier));
    
    // Convert to display unit
    const displayMultiplier = (yAxis as any).displayMultiplier || 1;
    const yValues = rawYValues.map(val => val / displayMultiplier);

    const data = yValues.map((y, index) => {
      const x =
        index < config.xAxisData.length ? config.xAxisData[index] : index;

      return [x, y]; // Return as [x, y] coordinate pair
    });

    return {
      name:
        yAxis.axis.name ||
        (yAxis.type ? upperCaseFirstLetter(yAxis.type) : ''),
      type: 'line',
      data
    };
  });
};
```

**Update `convertRawToCharts` return type and logic:**

```typescript
const createYaxises = (config: YAxisConfig): { 
  type?: string; 
  axis: YAXisComponentOption; 
  displayMultiplier?: number 
}[] => {
  // ... implementation as above
};

export const convertRawToCharts = (config: Config): ChartConfig[] => {
  // ... existing code ...
  
  const yAxises = createYaxises({
    axis: axis_y,
    results,
    xAxisResultType: xAxis.resultType
  });

  const series = createSeries({
    xAxisData: xAxis.data,
    yAxises,  // Now includes displayMultiplier
    results
  });

  // ... rest of existing code ...
};
```

### Phase 3: Update Tests

**File**: `libs/bublik/features/session-log/src/lib/v1/log-blocks/log-table/blocks/log-content-mi/blocks/log-mi-chart/` (create test file)

Create unit tests for the new unit conversion utilities:

```typescript
// unit-formatter.spec.ts (new file)
describe('unit-formatter', () => {
  describe('findBestUnitForValues', () => {
    it('should return nanoseconds for very small values', () => {
      const values = [0.00000001, 0.00000005, 0.00000009];
      const result = findBestUnitForValues(values);
      expect(result.label).toBe('ns');
      expect(result.multiplier).toBe(1e-9);
    });
    
    it('should return microseconds for nanosecond-range values', () => {
      const values = [0.00000004, 0.0000001, 0.0000005];
      const result = findBestUnitForValues(values);
      expect(result.label).toBe('μs');
      expect(result.multiplier).toBe(1e-6);
    });
    
    it('should return milliseconds for millisecond-range values', () => {
      const values = [0.001, 0.005, 0.01];
      const result = findBestUnitForValues(values);
      expect(result.label).toBe('ms');
      expect(result.multiplier).toBe(1e-3);
    });
    
    it('should return seconds for larger values', () => {
      const values = [1, 5, 10];
      const result = findBestUnitForValues(values);
      expect(result.label).toBe('s');
      expect(result.multiplier).toBe(1);
    });
  });
  
  describe('convertToDisplayUnit', () => {
    it('should convert seconds to microseconds', () => {
      expect(convertToDisplayUnit(0.00004, 1e-6)).toBe(40);
    });
    
    it('should convert seconds to milliseconds', () => {
      expect(convertToDisplayUnit(0.05, 1e-3)).toBe(50);
    });
  });
});
```

Create integration tests for the chart utilities:

```typescript
// log-mi-chart.utils.spec.ts (update or create)
describe('log-mi-chart.utils', () => {
  describe('convertRawToCharts', () => {
    it('should convert nanosecond values to microseconds in Y-axis', () => {
      const mockData = {
        results: [
          {
            type: 'latency',
            name: 'latency',
            description: 'Latency',
            entries: [
              { aggr: 'single', value: 40, base_units: 'seconds', multiplier: '1e-9' },
              { aggr: 'single', value: 50, base_units: 'seconds', multiplier: '1e-9' },
              { aggr: 'single', value: 60, base_units: 'seconds', multiplier: '1e-9' }
            ]
          }
        ],
        views: [
          {
            name: 'latency-chart',
            type: 'line-graph',
            title: 'Latency Chart',
            axis_x: { name: 'auto-seqno' },
            axis_y: undefined
          }
        ]
      };
      
      const charts = convertRawToCharts(mockData);
      
      // Check that Y-axis uses microseconds
      expect(charts[0].yAxises[0].axisLabel?.formatter?.(40)).toContain('μs');
      
      // Check that series data is converted to microseconds
      expect(charts[0].series[0].data).toEqual([[0, 40], [1, 50], [2, 60]]);
    });
  });
});
```

### Phase 4: Similar Updates for Measurements Page Charts (Optional Future Enhancement)

The measurements page uses `SingleMeasurementChart` from the API, which doesn't currently include unit information. To support the same functionality there:

1. **File**: `libs/services/bublik-api/src/lib/endpoints/measurements-endpoints.ts`
   - Add `base_units` and `multiplier` fields to `SingleMeasurementChart` interface

2. **File**: `libs/shared/charts/src/lib/single-measurement-chart/measurement-chart.component.utils.ts`
   - Apply similar unit conversion logic in `resolveOptions` and `resolveStackedOptions` functions

This would require backend API changes to include unit information in the measurement charts response.

## Files to Modify

1. **New File**: `libs/shared/utils/src/lib/unit-formatter.ts` - Unit conversion utilities
2. **New File**: `libs/shared/utils/src/lib/unit-formatter.spec.ts` - Unit tests
3. **Modified**: `libs/bublik/features/session-log/src/lib/v1/log-blocks/log-table/blocks/log-content-mi/blocks/log-mi-chart/log-mi-chart.utils.ts` - Apply unit conversion to charts
4. **Modified**: `libs/bublik/features/session-log/src/lib/v1/log-blocks/log-table/blocks/log-content-mi/blocks/log-mi-chart/log-mi-chart.utils.spec.ts` - Add or update integration tests (or create new)
5. **Modified**: `libs/shared/utils/src/index.ts` - Export unit-formatter utilities

## Implementation Steps

1. ✅ Create the unit-formatter utility file with unit conversion functions
2. ✅ Add unit tests for unit-formatter utilities
3. ✅ Update log-mi-chart.utils.ts to use unit conversion for Y-axis
4. ✅ Update/create integration tests for chart utilities
5. ✅ Export new utilities from shared/utils index
6. ✅ Test manually with sample data showing nanosecond values
7. ✅ Verify Y-axis displays microseconds correctly

## Edge Cases to Handle

1. **Mixed units**: If different series on the same chart have different base units, keep original behavior
2. **Non-time units**: Only apply time unit conversion for seconds-based units; use original behavior for other units
3. **Very large values**: Ensure the formatter works correctly for values larger than seconds
4. **Negative values**: Handle negative latency values if they exist (unlikely but possible)
5. **Zero values**: Ensure zeros are handled correctly in unit conversion
6. **Empty datasets**: Handle cases where there are no values to analyze

## Success Criteria

1. Y-axis displays "40 μs" instead of "0.00004 s" for nanosecond-range values
2. The conversion is automatic based on the magnitude of values
3. Chart tooltips also show values in the correct unit
4. All existing tests pass
5. New tests cover the unit conversion logic
6. The solution doesn't break functionality for non-time units

## Future Enhancements

1. Allow users to manually select the display unit (e.g., dropdown to switch between ns, μs, ms, s)
2. Support for other unit types (bytes, bits, etc.)
3. Extend the solution to the measurements page charts
4. Add support for custom unit configurations
