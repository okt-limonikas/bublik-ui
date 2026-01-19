# Implementation Plan: Add Duration Information to REST API (Issue #228)

## Issue Summary

The log tree contains start/end/duration information for every element, but the REST API endpoints lack this information:
- `/api/v2/runs/<run_id>/stats/` - No time information
- `/api/v2/results/?parent_id=<id>&test_name=<name>` - Only has start time (missing end and duration)

This plan addresses adding start/end/duration fields to both API endpoints.

---

## Current State Analysis

### 1. Log Tree Data Structure

**Location:** `libs/shared/types/src/lib/log-json-schema/blocks.ts`

The `LogHeaderBlock` already has complete timing information:
```typescript
export const LogHeaderBlockSchema = z.object({
  meta: z.object({
    start: z.string().describe('date string'),
    end: z.string().describe('date string'),
    duration: z.string().describe('duration of the test'),
    // ... other fields
  })
});
```

**Tree nodes** (`libs/shared/types/src/lib/tree.ts`) have only start:
```typescript
export interface NodeData {
  start?: string;
  id: string;
  name: string;
  // ... other fields
}
```

### 2. API Endpoint: `/api/v2/runs/<run_id>/stats/`

**Frontend Type:** `libs/shared/types/src/lib/run.ts`

```typescript
export type RunData = {
  result_id: number;
  exec_seqno: number;
  iteration_id: number;
  parent_id: number | null;
  type: NodeEntity;
  name: string;
  period: string;
  path: string[];
  stats: RunStats;  // Contains test statistics (passed, failed, etc.)
  children: RunData[];
  objective?: string;
  comments?: Array<RunDataComment>;
  // MISSING: start, end, duration
};
```

**Frontend Endpoint:** `libs/services/bublik-api/src/lib/endpoints/run-endpoints.ts`
```typescript
getRunTableByRunId: build.query<RunData[] | null, RunStatsParams>({
  query: ({ runId, requirements }) => {
    return {
      url: withApiV2(`/runs/${runId}/stats`),
      params: { requirements: queryRequirements },
      cache: 'no-cache'
    };
  }
})
```

### 3. API Endpoint: `/api/v2/results/`

**Frontend Type:** `libs/shared/types/src/lib/run.ts`

```typescript
export type RunDataResults = {
  name: string;
  result_id: number;
  iteration_id: number;
  run_id: string;
  has_measurements: boolean;
  has_error: boolean;
  expected_results: RunResultWithKeys[];
  obtained_result: RunResult;
  comments: string[];
  parameters: string[];
  start: string;      // PRESENT
  finish: string;     // PRESENT
  artifacts?: string[];
  requirements?: string[];
  // MISSING: duration
};
```

**Frontend Endpoint:** `libs/services/bublik-api/src/lib/endpoints/run-endpoints.ts`
```typescript
getResultsTable: build.query<RunDataResults[], ResultTableAPIQueryWithFilter>({
  async queryFn(query, _queryApi, _extraOptions, fetchWithBQ) {
    // ...
    return fetchWithBQ(
      withApiV2(
        `/results/?parent_id=${parentId}&test_name=${testName}&results=${results}&result_properties=${resultProperties}`,
        true
      )
    );
    // ...
  }
})
```

### 4. Comparison with History API

**History API** (`libs/shared/types/src/lib/history.ts`) already provides duration:
```typescript
export type HistoryDataLinear = {
  start_date: string;
  finish_date: string;
  duration: string;  // PRESENT
  // ... other fields
};
```

This shows the backend is capable of computing and returning duration.

---

## Implementation Plan

### Phase 1: Frontend Type Updates

#### 1.1 Update `RunData` Type

**File:** `libs/shared/types/src/lib/run.ts`

Add timing fields to `RunData` interface:
```typescript
export type RunData = {
  result_id: number;
  exec_seqno: number;
  iteration_id: number;
  parent_id: number | null;
  type: NodeEntity;
  name: string;
  period: string;
  path: string[];
  stats: RunStats;
  children: RunData[];
  objective?: string;
  comments?: Array<RunDataComment>;
  // NEW FIELDS:
  start?: string;     // ISO 8601 date string
  end?: string;       // ISO 8601 date string
  duration?: string;  // ISO 8601 duration string (e.g., "PT2H30M5S")
};
```

#### 1.2 Update `RunDataResults` Type

**File:** `libs/shared/types/src/lib/run.ts`

Add duration field:
```typescript
export type RunDataResults = {
  name: string;
  result_id: number;
  iteration_id: number;
  run_id: string;
  has_measurements: boolean;
  has_error: boolean;
  expected_results: RunResultWithKeys[];
  obtained_result: RunResult;
  comments: string[];
  parameters: string[];
  start: string;
  finish: string;
  artifacts?: string[];
  requirements?: string[];
  // NEW FIELD:
  duration?: string;  // ISO 8601 duration string (e.g., "PT2H30M5S")
};
```

#### 1.3 Update `NodeData` Type (Optional, for consistency)

**File:** `libs/shared/types/src/lib/tree.ts`

Add end and duration fields for consistency with log tree:
```typescript
export interface NodeData {
  start?: string;
  end?: string;       // NEW
  duration?: string;   // NEW
  id: string;
  name: string;
  entity: NodeEntity | NodeEntityValue;
  has_error: boolean;
  children: string[];
  errorCount?: number;
  skipped?: boolean;
  parentId: string | null;
  path?: string | null;
}
```

#### 1.4 Update `MergedRun` Type (if needed)

**File:** `libs/shared/types/src/lib/run.ts`

Since `MergedRun` extends `RunData` (with some fields omitted), the timing fields will be inherited automatically. No changes needed unless there's special merging logic.

---

### Phase 2: Frontend Display Enhancements (Optional but Recommended)

#### 2.1 Add Duration Column to Run Table

**File:** `libs/bublik/features/run/src/lib/run-table/types/index.ts`

Add new column ID:
```typescript
export const enum ColumnId {
  Tree = 'TREE',
  Total = 'TOTAL',
  Run = 'RUN',
  Duration = 'DURATION',  // NEW
  PassedExpected = 'PASSED_EXPECTED',
  FailedExpected = 'FAILED_EXPECTED',
  // ... existing columns
  Comments = 'Notes'
}
```

**File:** `libs/bublik/features/run/src/lib/run-table/constants/index.tsx`

Add duration column to default visibility and column groups:
```typescript
export const DEFAULT_COLUMN_VISIBILITY: VisibilityState = {
  [ColumnId.Total]: false,
  [ColumnId.Objective]: false,
  [ColumnId.Duration]: false,  // Hidden by default
  [ColumnId.Comments]: false
};

export const COLUMN_GROUPS: ColumnGroup[] = [
  { id: 'Tree', label: '', columns: [ColumnId.Tree] },
  { 
    id: 'Duration', 
    label: 'Time', 
    columns: [ColumnId.Duration] 
  },
  // ... existing groups
];
```

#### 2.2 Add Duration Column to Result Table

**File:** `libs/bublik/features/run/src/lib/result-table/result-table.columns.tsx`

Add a new column accessor for duration:
```typescript
helper.accessor('duration', {
  header: 'Duration',
  id: 'duration',
  cell: (cell) => {
    const duration = cell.getValue();
    if (!duration) return '-';
    
    try {
      const durationObj = parseISODuration(duration);
      return formatDurationToShort(durationObj);
    } catch {
      return duration;
    }
  },
  meta: { headerCellClassName: 'pl-[12px]' }
})
```

---

### Phase 3: Backend API Changes

**Note:** Backend files are located in `../bublik/bublik/interfaces/api_v2/` (outside bublik-ui directory)

#### 3.1 Update `/api/v2/runs/<run_id>/stats/` Endpoint

**File:** `../bublik/bublik/interfaces/api_v2/results.py` (or appropriate file)

Add start, end, and duration fields to the response serializer for run stats:
```python
# Find the serializer for RunData/runs stats
class RunDataSerializer(serializers.ModelSerializer):
    # ... existing fields
    
    # Add timing fields
    start = serializers.DateTimeField(required=False, allow_null=True)
    end = serializers.DateTimeField(required=False, allow_null=True)
    duration = serializers.CharField(required=False, allow_null=True)
    
    class Meta:
        model = Run  # or appropriate model
        fields = [
            # ... existing fields
            'start',
            'end',
            'duration',
        ]
```

Update the view/queryset to include timing information:
```python
def get_queryset(self):
    queryset = super().get_queryset()
    # Ensure timing fields are selected
    queryset = queryset.select_related('timing_info')  # If in related model
    return queryset.annotate(
        start=F('start_time'),
        end=F('end_time'),
        duration=F('duration')
    )
```

#### 3.2 Update `/api/v2/results/` Endpoint

**File:** `../bublik/bublik/interfaces/api_v2/results.py`

Add duration field to the results serializer:
```python
class ResultSerializer(serializers.ModelSerializer):
    # ... existing fields (including start and finish)
    
    # Add duration field
    duration = serializers.CharField(required=False, allow_null=True)
    
    class Meta:
        model = Result  # or appropriate model
        fields = [
            # ... existing fields
            'start',
            'finish',
            'duration',  # NEW
        ]
```

The duration can be computed from start and finish times:
```python
def get_duration(self, obj):
    if obj.start and obj.finish:
        return (obj.finish - obj.start).total_seconds()
    return None
```

Or better, use ISO 8601 duration format:
```python
from datetime import timedelta
import isodate  # or custom ISO duration formatter

def get_duration(self, obj):
    if obj.start and obj.finish:
        delta = obj.finish - obj.start
        return isodate.duration_isoformat(delta)
    return None
```

#### 3.3 Ensure Data Model Has Timing Fields

**File:** `../bublik/bublik/core/models/` (or appropriate models file)

Verify that the data models store timing information:
```python
class Result(models.Model):
    # ... existing fields
    start = models.DateTimeField()
    finish = models.DateTimeField()
    
    @property
    def duration(self):
        if self.start and self.finish:
            return self.finish - self.start
        return None
```

---

### Phase 4: Testing

#### 4.1 Frontend Unit Tests

**Files to create/update:**

1. **Type Tests:** Verify new fields are properly typed
   ```typescript
   // test-types.ts
   const runData: RunData = {
     // ... required fields
     start: '2025-01-16T10:00:00Z',
     end: '2025-01-16T12:30:05Z',
     duration: 'PT2H30M5S'
   };
   ```

2. **API Response Tests:** Mock API responses with new fields
   ```typescript
   // libs/services/bublik-api/src/lib/endpoints/log-endpoint.spec.ts
   describe('getRunTableByRunId', () => {
     it('should return run data with timing fields', async () => {
       const mockResponse = {
         results: {
           result_id: 1,
           name: 'test',
           start: '2025-01-16T10:00:00Z',
           end: '2025-01-16T12:30:05Z',
           duration: 'PT2H30M5S',
           // ... other fields
         }
       };
       // Test implementation
     });
   });
   ```

3. **Duration Formatting Tests:** Test duration parsing and formatting
   ```typescript
   // libs/shared/utils/src/lib/time.spec.ts (update or create)
   describe('formatDurationToShort', () => {
     it('should format PT2H30M5S correctly', () => {
       const duration = parseISODuration('PT2H30M5S');
       expect(formatDurationToShort(duration)).toBe('2h');
     });
   });
   ```

4. **Component Tests:** Test that duration columns render correctly
   ```typescript
   // libs/bublik/features/run/src/lib/run-table/*.spec.tsx
   it('should display duration in Duration column', () => {
     // Test component rendering with duration data
   });
   ```

#### 4.2 Backend Tests

**Files to create/update:**

1. **API Endpoint Tests:**
   ```python
   # test_results_api.py
   def test_results_api_includes_duration(self):
       response = self.client.get('/api/v2/results/?parent_id=1&test_name=test')
       self.assertIn('duration', response.data['results'][0])
   
   def test_runs_stats_api_includes_timing(self):
       response = self.client.get('/api/v2/runs/123/stats/')
       self.assertIn('start', response.data)
       self.assertIn('end', response.data)
       self.assertIn('duration', response.data)
   ```

2. **Serializer Tests:**
   ```python
   def test_run_data_serializer_includes_timing(self):
       run = Run.objects.create(
           # ... required fields
           start=datetime.now(),
           end=datetime.now() + timedelta(hours=2)
       )
       serializer = RunDataSerializer(run)
       self.assertIn('duration', serializer.data)
   ```

---

### Phase 5: Documentation

#### 5.1 Update API Documentation

Document the new fields in API responses:

**For `/api/v2/runs/<run_id>/stats/`:**
```
Response fields:
- start (string, optional): ISO 8601 datetime string
- end (string, optional): ISO 8601 datetime string
- duration (string, optional): ISO 8601 duration string (e.g., "PT2H30M5S")
```

**For `/api/v2/results/`:**
```
Response fields:
- start (string): ISO 8601 datetime string
- finish (string): ISO 8601 datetime string
- duration (string, optional): ISO 8601 duration string (e.g., "PT2H30M5S")
```

#### 5.2 Update Type Documentation

Update JSDoc comments in TypeScript files:
```typescript
/**
 * Run data from stats API
 * @param start - ISO 8601 datetime string (optional)
 * @param end - ISO 8601 datetime string (optional)
 * @param duration - ISO 8601 duration string (optional)
 */
export type RunData = { ... }
```

---

## Files to Modify

### Frontend Files (bublik-ui repository)

1. `libs/shared/types/src/lib/run.ts` - Add timing fields to types
2. `libs/shared/types/src/lib/tree.ts` - Add timing fields to NodeData (optional)
3. `libs/bublik/features/run/src/lib/run-table/types/index.ts` - Add Duration column ID
4. `libs/bublik/features/run/src/lib/run-table/constants/index.tsx` - Update column groups
5. `libs/bublik/features/run/src/lib/result-table/result-table.columns.tsx` - Add duration column
6. `libs/services/bublik-api/src/lib/endpoints/run-endpoints.ts` - Update endpoint response types (if needed)
7. Test files for all modified components

### Backend Files (bublik repository - location: ../bublik/)

1. `bublik/interfaces/api_v2/results.py` - Update serializers
2. `bublik/core/models/*.py` - Verify/Update data models
3. Test files for API endpoints

---

## Implementation Approach

### Recommended Implementation Order:

1. **Backend First:** Add duration computation to backend APIs
   - Start with `/api/v2/results/` endpoint (easier)
   - Then add to `/api/v2/runs/<run_id>/stats/` endpoint
   - Write backend tests

2. **Frontend Types:** Update TypeScript type definitions
   - This won't break existing code since fields are optional
   - Incremental adoption possible

3. **Frontend Display:** Add UI columns (optional but recommended)
   - Start with Result Table (easier)
   - Then add to Run Table
   - Write frontend tests

4. **Integration Testing:** Verify end-to-end functionality

### Backward Compatibility:

- All new fields are **optional** (`?` or `required=False`)
- Existing code will continue to work without modification
- New code can use the fields when available
- Frontend should gracefully handle missing data (display '-' or similar)

---

## Risk Assessment

### Low Risk:
- Adding optional fields won't break existing functionality
- Frontend can handle missing data gracefully

### Medium Risk:
- Backend changes may require database queries optimization
- Duration computation could impact performance if calculated on the fly

### Mitigation:
- Cache duration values in database if computed frequently
- Use database indexing on start/end fields
- Add pagination limits for large datasets

---

## Success Criteria

1. ✅ Backend API `/api/v2/runs/<run_id>/stats/` returns `start`, `end`, and `duration` fields
2. ✅ Backend API `/api/v2/results/` returns `duration` field
3. ✅ Frontend types include all timing fields
4. ✅ Duration is displayed in UI (at least in Result Table)
5. ✅ All tests pass (frontend and backend)
6. ✅ API documentation is updated
7. ✅ No breaking changes to existing functionality

---

## Additional Notes

1. **Duration Format:** Use ISO 8601 duration format (e.g., "PT2H30M5S") for consistency with log tree
2. **Timezone:** Ensure all times are in UTC or clearly documented timezone
3. **Precision:** Duration precision should match backend capabilities (seconds is recommended)
4. **Performance:** Monitor API response times after adding duration fields
5. **UI/UX:** Consider adding duration formatting options (short, full, human-readable)

---

## References

- Issue #228: REST API: information about duration
- Log tree schema: `libs/shared/types/src/lib/log-json-schema/blocks.ts`
- History API: `libs/shared/types/src/lib/history.ts` (already has duration)
- Time utilities: `libs/shared/utils/src/lib/time.ts`
