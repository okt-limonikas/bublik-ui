# Implementation Plan: Filter Series Charts by Clicking on Name (Issue #416)

## Overview
This plan outlines the implementation of a feature to filter series charts by clicking on the chart name. Currently, users can filter charts using the DataTableFacetedFilter component in the header, but clicking directly on a chart name should also toggle that chart's visibility.

## Current Implementation Analysis

### Key Components
1. **PlotListContainerByResult** (`libs/bublik/features/history/src/lib/history-measurements/plot-list.container.tsx`)
   - Container for series charts display
   - Manages filter state using query parameters: `parametersByResultName` for chart names
   - Currently uses DataTableFacetedFilter components for filtering

2. **MeasurementChart** (`libs/shared/charts/src/lib/single-measurement-chart/measurement-chart.component.tsx`)
   - Displays individual charts
   - Shows chart title in MeasurementChartToolbar (line 87, 132-134)
   - Title is currently plain text, not clickable

3. **MeasurementChartToolbar** (`libs/shared/charts/src/lib/single-measurement-chart/measurement-chart.component.tsx`)
   - Renders toolbar with title and controls
   - Title displayed as `<span>` element with styling

4. **PlotListItem** (`libs/bublik/features/history/src/lib/history-measurements/plot-list.component.tsx`)
   - Renders individual chart items
   - Passes props to MeasurementChart

5. **PlotList** (`libs/bublik/features/history/src/lib/history-measurements/plot-list.component.tsx`)
   - Renders list of charts
   - Manages chart selection state

### Chart Name Format
Chart names are formatted as: `${chart.title} - ${chart.axis_y.label}`

### Current Filtering Logic
- Filter state stored in query parameter `parametersByResultName`
- Filtering done in MeasurementsList component (lines 267-272)
- Filter options calculated from uniqueNames useMemo (lines 137-151)

## Proposed Implementation

### Phase 1: Modify MeasurementChart Component

#### File: `libs/shared/charts/src/lib/single-measurement-chart/measurement-chart.component.tsx`

**Changes:**

1. **Add onTitleClick prop to MeasurementChart interface:**
```typescript
interface MeasurementChartProps {
  chart: SingleMeasurementChart;
  color: string;
  onChartPointClick?: (props: ChartPointClickProps) => void;
  onTitleClick?: () => void;  // NEW PROP
  style?: CSSProperties;
  additionalToolBarItems?: ReactNode;
  isFullScreen?: boolean;
  enableResultErrorHighlight?: boolean;
}
```

2. **Pass onTitleClick to MeasurementChartToolbar:**
```typescript
const MeasurementChart = (props: MeasurementChartProps) => {
  const {
    chart,
    color,
    additionalToolBarItems,
    isFullScreen = false,
    enableResultErrorHighlight = false,
    onTitleClick  // NEW
  } = props;
  
  // ... existing code ...
  
  return (
    <>
      {/* ... existing drawer code ... */}
      <MeasurementChartToolbar
        title={chart.title ?? chart.subtitle}
        onTitleClick={onTitleClick}  // NEW
        state={state}
        // ... other props
      />
      <Plot options={options} notMerge={false} ref={ref} style={props.style} />
    </>
  );
};
```

3. **Modify MeasurementChartToolbar to make title clickable:**
```typescript
interface MeasurementChartToolbarProps {
  title: string;
  state: ChartState;
  // ... existing props
  onTitleClick?: () => void;  // NEW PROP
  isFullScreen?: boolean;
}

function MeasurementChartToolbar(props: MeasurementChartToolbarProps) {
  const {
    title,
    state,
    toggleGlobalZoom,
    resetZoom,
    toggleSliders,
    toggleLimitYAxis,
    changeMode,
    toggleFullScreen,
    additionalToolBarItems,
    isFullScreen,
    onTitleClick  // NEW
  } = props;

  return (
    <div className="flex items-center justify-between mb-2">
      <span 
        className={`text-[0.6875rem] font-semibold leading-[0.875rem] text-text-secondary ${
          onTitleClick ? 'cursor-pointer hover:text-primary hover:underline' : ''
        }`}
        onClick={onTitleClick}
      >
        {title}
      </span>
      {/* ... rest of toolbar */}
    </div>
  );
}
```

### Phase 2: Update PlotListItem Component

#### File: `libs/bublik/features/history/src/lib/history-measurements/plot-list.component.tsx`

**Changes:**

1. **Add onTitleClick to PlotListItemProps interface:**
```typescript
interface PlotListItemProps {
  idx: number;
  plot: SingleMeasurementChart;
  parameters?: string[];
  onAddChartClick: (args: {
    plot: SingleMeasurementChart;
    color: string;
    group: 'trend' | 'measurement';
    parameters?: string[];
  }) => void;
  onTitleClick?: (plotName: string) => void;  // NEW PROP
  combinedState: 'disabled' | 'active' | 'default' | 'waiting';
  enableResultErrorHighlight?: boolean;
  group: 'trend' | 'measurement';
  selectedGroup: 'trend' | 'measurement' | null;
}
```

2. **Pass onTitleClick to MeasurementChart:**
```typescript
const PlotListItem = (props: PlotListItemProps) => {
  const {
    idx,
    plot,
    parameters,
    combinedState,
    onAddChartClick,
    onTitleClick,  // NEW
    enableResultErrorHighlight,
    group,
    selectedGroup
  } = props;
  // ... existing code ...

  const chartName = `${plot.title} - ${plot.axis_y.label}`;

  return (
    <>
      {/* ... existing dialog code ... */}
      <li className="py-2.5 px-4">
        <MeasurementChart
          chart={plot}
          color={getColorByIdx(idx)}
          onChartPointClick={handleChartPointClick}
          enableResultErrorHighlight={enableResultErrorHighlight}
          onTitleClick={() => onTitleClick?.(chartName)}  // NEW
          additionalToolBarItems={
            <ToolbarButton
              // ... existing toolbar button code
            />
          }
        />
      </li>
    </>
  );
};
```

### Phase 3: Update PlotList Component

#### File: `libs/bublik/features/history/src/lib/history-measurements/plot-list.component.tsx`

**Changes:**

1. **Add onTitleClick to PlotListProps interface:**
```typescript
export interface PlotListProps {
  label: string;
  plots: SingleMeasurementChart[];
  parameters?: string[];
  isFetching?: boolean;
  enableResultErrorHighlight?: boolean;
  group: 'trend' | 'measurement';
  onTitleClick?: (plotName: string) => void;  // NEW PROP
}
```

2. **Pass onTitleClick to PlotListItem:**
```typescript
export function PlotList(props: PlotListProps) {
  const {
    plots,
    isFetching,
    label,
    enableResultErrorHighlight,
    group,
    parameters,
    onTitleClick  // NEW
  } = props;
  // ... existing code ...

  return (
    // ... existing code ...
    <ul className={cn(/* ... */)}>
      {plots.map((plot, idx) => {
        // ... existing code ...
        return (
          <PlotListItem
            key={`${idx}_${plotId}`}
            idx={idx}
            plot={plot}
            onAddChartClick={handleAddChartClick}
            onTitleClick={onTitleClick}  // NEW
            combinedState={state}
            parameters={parameters}
            enableResultErrorHighlight={enableResultErrorHighlight}
            group={group}
            selectedGroup={selectedGroup}
          />
        );
      })}
    </ul>
  );
}
```

### Phase 4: Update PlotListContainerByResult Component

#### File: `libs/bublik/features/history/src/lib/history-measurements/plot-list.container.tsx`

**Changes:**

1. **Create handleTitleClick function:**
```typescript
export function PlotListContainerByResult() {
  const { query } = useHistoryQuery();
  const { data, isLoading, error } = useGetHistoryMeasurementsByResult();
  const actions = useHistoryActions();

  // ... existing code ...

  const [selectedByParam = [], setSelectedByParam] = useQueryParam(
    'parametersByResultFilter',
    withDefault(ArrayParam, []),
    { updateType: 'replaceIn' }
  );

  const [selectedByName = [], setSelectedByName] = useQueryParam(
    'parametersByResultName',
    withDefault(ArrayParam, []),
    { updateType: 'replaceIn' }
  );

  // NEW: Handle title click
  const handleTitleClick = useCallback((chartName: string) => {
    const currentFilters = selectedByName.filter((param) => typeof param === 'string') ?? [];
    
    if (currentFilters.includes(chartName)) {
      // Remove filter if already selected
      setSelectedByName(currentFilters.filter((name) => name !== chartName));
    } else {
      // Add filter if not selected
      setSelectedByName([...currentFilters, chartName]);
    }
  }, [selectedByName, setSelectedByName]);

  // ... rest of the component ...
```

2. **Pass handleTitleClick to PlotList component:**
```typescript
  return (
    <div className="bg-white rounded-md">
      {/* ... existing header code ... */}
      <MeasurementsList
        measurements={filteredByParams}
        nameFilter={
          selectedByName.filter((param) => typeof param === 'string') ?? []
        }
        group="measurement"
        onTitleClick={handleTitleClick}  // NEW
      />
      {/* ... existing selected charts popover ... */}
    </div>
  );
}
```

3. **Update MeasurementsList to pass onTitleClick:**
```typescript
interface MeasurementListProps {
  measurements: HistoryMeasurementResult[];
  nameFilter?: string[];
  onTitleClick?: (plotName: string) => void;  // NEW PROP
}

function MeasurementsList(
  props: MeasurementListProps & { group: 'trend' | 'measurement' }
) {
  const { measurements, group, nameFilter = [], onTitleClick } = props;  // NEW

  return (
    <div className="flex flex-col">
      {measurements.map((m, idx) => {
        const filtered =
          nameFilter.length > 0
            ? m.measurement_series_charts.filter((c) =>
                nameFilter?.includes(`${c.title} - ${c.axis_y.label}`)
              )
            : m.measurement_series_charts;

        return (
          <div
            key={`${idx}-${m.id}`}
            className="[&:not(:last-child)]:border-b border-border-primary"
          >
            {/* ... existing card header ... */}
            {/* ... existing info block ... */}
            {m.measurement_series_charts.length ? (
              <PlotList
                label="Charts"
                plots={filtered}
                parameters={m.parameters_list}
                group={group}
                onTitleClick={onTitleClick}  // NEW
              />
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
```

### Phase 5: Add Visual Feedback (Optional but Recommended)

Consider adding visual indicators for active filters:

1. **Highlight filtered charts** - When a filter is active, visually distinguish matching charts
2. **Add filter badge** - Show a badge on the chart title when it's the active filter
3. **Show filter status in toolbar** - Display which charts are currently filtered

Example for highlighting in MeasurementChartToolbar:
```typescript
function MeasurementChartToolbar(props: MeasurementChartToolbarProps) {
  const {
    title,
    onTitleClick,
    isFilterActive  // NEW PROP to indicate if this chart is currently filtered
  } = props;

  return (
    <div className="flex items-center justify-between mb-2">
      <span 
        className={cn(
          "text-[0.6875rem] font-semibold leading-[0.875rem]",
          onTitleClick && "cursor-pointer hover:text-primary",
          isFilterActive && "text-primary",  // Highlight active filter
          !onTitleClick && "text-text-secondary"
        )}
        onClick={onTitleClick}
      >
        {title}
      </span>
      {/* ... */}
    </div>
  );
}
```

## Testing Plan

### Unit Tests

1. **MeasurementChart Component Tests**
   - Verify title is clickable when onTitleClick is provided
   - Verify title is not clickable when onTitleClick is not provided
   - Verify onTitleClick is called when title is clicked

2. **PlotListItem Component Tests**
   - Verify chart name is correctly formatted
   - Verify onTitleClick is called with correct chart name

3. **PlotList Component Tests**
   - Verify onTitleClick is passed through to PlotListItem

4. **PlotListContainerByResult Component Tests**
   - Verify handleTitleClick toggles filter correctly
   - Verify query parameter is updated when filter is toggled
   - Verify filter is applied correctly when chart name is clicked

### Integration Tests

1. **End-to-End Filter Flow**
   - Navigate to series charts page
   - Click on a chart name
   - Verify only charts with that name are displayed
   - Click on the same chart name again
   - Verify all charts are displayed again

2. **Multiple Filter Interactions**
   - Click on multiple chart names
   - Verify only charts with those names are displayed
   - Use DataTableFacetedFilter and click on chart names
   - Verify both filtering methods work together

3. **URL Persistence**
   - Apply filter by clicking chart name
   - Refresh page
   - Verify filter is still applied (URL persists)
   - Copy URL with filter and open in new tab
   - Verify filter is applied in new tab

### Manual Testing Checklist

- [ ] Chart names are displayed with hover effect (cursor pointer, underline)
- [ ] Clicking on a chart name filters to show only that chart type
- [ ] Clicking again on the same name removes the filter
- [ ] Multiple chart names can be selected as filters
- [ ] DataTableFacetedFilter shows active filters when names are clicked
- [ ] Clicking names in DataTableFacetedFilter also updates the view
- [ ] URL query parameter `parametersByResultName` is updated correctly
- [ ] Filter persists across page refreshes
- [ ] Filter state is preserved when navigating away and back
- [ ] The feature works correctly with existing parameter filters
- [ ] Visual feedback is clear for filtered vs non-filtered state
- [ ] No console errors or warnings when clicking chart names

## Implementation Checklist

- [ ] Update MeasurementChart component to accept and use onTitleClick prop
- [ ] Update MeasurementChartToolbar to make title clickable
- [ ] Update PlotListItem to pass onTitleClick handler
- [ ] Update PlotList to pass onTitleClick through
- [ ] Update PlotListContainerByResult with handleTitleClick function
- [ ] Update MeasurementsList to accept and pass onTitleClick
- [ ] Add CSS styling for clickable titles (hover states, cursor)
- [ ] Test the complete flow manually
- [ ] Write unit tests for new functionality
- [ ] Write integration tests for the filtering flow
- [ ] Update any relevant documentation
- [ ] Run existing test suite to ensure no regressions

## Files to Modify

1. `libs/shared/charts/src/lib/single-measurement-chart/measurement-chart.component.tsx`
   - Add onTitleClick prop to MeasurementChartProps
   - Pass onTitleClick to MeasurementChartToolbar
   - Modify MeasurementChartToolbar to make title clickable

2. `libs/bublik/features/history/src/lib/history-measurements/plot-list.component.tsx`
   - Add onTitleClick to PlotListItemProps
   - Pass onTitleClick to MeasurementChart in PlotListItem
   - Add onTitleClick to PlotListProps
   - Pass onTitleClick to PlotListItem in PlotList

3. `libs/bublik/features/history/src/lib/history-measurements/plot-list.container.tsx`
   - Add handleTitleClick function
   - Pass handleTitleClick to MeasurementsList
   - Update MeasurementListProps interface
   - Pass onTitleClick to PlotList in MeasurementsList

## Potential Risks and Mitigations

### Risk 1: Breaking Changes in MeasurementChart Component
**Mitigation:** Make onTitleClick an optional prop to ensure backward compatibility. The feature should only activate when the prop is provided.

### Risk 2: Conflict with Existing Filtering Mechanism
**Mitigation:** Use the same query parameter (`parametersByResultName`) and state management to ensure both filtering methods work together seamlessly.

### Risk 3: Performance Issues with Large Datasets
**Mitigation:** The filtering logic is already optimized and works with the existing DataTableFacetedFilter. The new click handler will use the same filtering mechanism.

### Risk 4: User Confusion About Which Charts Are Filtered
**Mitigation:** Provide clear visual feedback (hover states, highlighting, potential badges) to indicate filter status.

## Success Criteria

1. Users can click on any chart title to filter charts by that name
2. Clicking a filtered chart name again removes the filter
3. Multiple chart names can be selected as filters
4. The click-to-filter feature works seamlessly with the existing DataTableFacetedFilter
5. Filter state persists via URL query parameters
6. No breaking changes to existing functionality
7. All existing tests pass
8. New tests cover the implemented functionality

## Timeline Estimate

- Phase 1 (MeasurementChart component): 2-3 hours
- Phase 2 (PlotListItem component): 1 hour
- Phase 3 (PlotList component): 1 hour
- Phase 4 (PlotListContainerByResult): 2-3 hours
- Phase 5 (Visual feedback): 2-3 hours
- Testing: 3-4 hours
- Code review and refinement: 2-3 hours

**Total estimated time: 13-17 hours**

## Notes

- The implementation maintains backward compatibility by making all new props optional
- The feature integrates seamlessly with existing filtering using the same query parameters
- Consider adding analytics tracking to understand user engagement with this feature
- Document the feature in user documentation once implemented
- Consider adding keyboard navigation support (e.g., Enter/Space to toggle filter when title is focused)
