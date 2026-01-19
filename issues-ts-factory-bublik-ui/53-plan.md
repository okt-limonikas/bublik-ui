# Issue #53: Runs - Tags Duplicate When Adding, Submitting, Unchecking and Re-checking

## Summary

When a user adds a tag, submits the form, then unchecks and checks it again without submitting, extra tags appear in the list. This is caused by the `selectAllTags` selector returning duplicate tag entries in the runs form.

## Root Cause Analysis

### The Problem

The `selectAllTags` selector in `runs-slice.selectors.ts` creates tag lists from multiple sources:

1. **`currentTicked`**: Tags from `globalFilter` (currently selected tags)
2. **`importantBoxes`**: Tags from `important_tags` in runs
3. **`metaBoxes`**: Tags from `metadata` in runs  
4. **`tagsBoxes`**: Tags from `relevant_tags` in runs

These arrays are combined using spread operator:
```typescript
return [...currentTicked, ...importantBoxes, ...metaBoxes, ...tagsBoxes];
```

**The Issue**: If a tag exists in both `globalFilter` AND one of the tag sets (important/meta/tags), it appears **twice** in the returned array:
- First instance: In `currentTicked` with `isSelected: true`
- Second instance: In one of the sets without `isSelected` set (undefined)

### Bug Scenario Walkthrough

1. **User adds tag "testTag"**: Tag is added to form with `isSelected: true`
2. **User submits**: Tag is saved to `globalFilter` in Redux state
3. **Form re-renders**: The `selectAllTags` selector returns the tag twice:
   - `{ label: "testTag", value: "testTag", isSelected: true }` (from currentTicked)
   - `{ label: "testTag", value: "testTag", className: "..." }` (from one of the tag sets)
4. **User unchecks the tag**: The `toggle` function in `badge-box.tsx` calls `uncheck`, which finds ALL tags with matching value and sets `isSelected: false` on both instances
5. **User re-checks the tag**: The `toggle` function calls `check`, which sets `isSelected: true` on BOTH instances
6. **Result**: The tag now appears twice in the selected tags list

### Contributing Factors

The badge-box component's `check` and `uncheck` functions use direct mutation:
```typescript
const check = (value: BoxValue) => {
    return values.map((box) => {
        if (box.value === value.value) box.isSelected = true;  // Direct mutation!
        return box;
    });
};
```

While this is generally safe (it returns a new array), when duplicate tags exist, both get modified simultaneously, leading to the "extra tags" issue.

## Files to Modify

1. **Primary Fix**: `/Users/limonikas/workspace/bublik-home/bublik-docker/bublik-ui/libs/bublik/features/runs/src/lib/runs-slice.selectors.ts`
   - Fix the `selectAllTags` selector to deduplicate tags

2. **Potential Improvements** (optional, for better code quality):
   - `/Users/limonikas/workspace/bublik-home/bublik-docker/bublik-ui/libs/shared/tailwind-ui/src/lib/badge-box/badge-box.tsx`
     - Consider avoiding direct mutation for better predictability

## Implementation Plan

### Step 1: Fix the `selectAllTags` selector to deduplicate tags

**File**: `/Users/limonikas/workspace/bublik-home/bublik-docker/bublik-ui/libs/bublik/features/runs/src/lib/runs-slice.selectors.ts`

**Approach**:
1. Create a Set of all unique tag values from all sources
2. Map through unique values to create a single, deduplicated list
3. For each unique value, determine:
   - Whether it's in `globalFilter` (set `isSelected: true`)
   - Which background class to use (prioritize important > meta > default)

**Code Changes**:

Replace lines 42-91 with:

```typescript
export const selectAllTags = createSelector(
	selectAllRuns,
	selectGlobalFilter,
	(runs, globalFilter) => {
		const DEFAULT_BG = 'bg-badge-0';
		const IMPORTANT_BG = 'bg-badge-6';
		const META_BG = 'bg-badge-4';

		const important = runs.flatMap((run) => run.important_tags);
		const metas = runs.flatMap((run) => run.metadata);
		const tags = runs.flatMap((run) => run.relevant_tags);

		const importantSet = new Set(important);
		const metaSet = new Set(metas);
		const tagsSet = new Set(tags);

		// Create a global set of all unique tag values to deduplicate
		const allTagValuesSet = new Set([
			...important,
			...metas,
			...tags,
			...globalFilter
		]);

		const uniqueTagValues = Array.from(allTagValuesSet);

		// Create a deduplicated list of tags
		return uniqueTagValues.map((value) => {
			let bgClassName = DEFAULT_BG;

			if (importantSet.has(value)) bgClassName = IMPORTANT_BG;
			else if (metaSet.has(value)) bgClassName = META_BG;

			return {
				label: value,
				value: value,
				isSelected: globalFilter.includes(value),
				className: bgClassName
			};
		});
	}
);
```

**Benefits**:
- Each tag appears exactly once in the list
- Eliminates the root cause of duplicate tags
- Maintains backward compatibility with existing code

### Step 2: Verify the fix works

**Testing Strategy**:

1. **Manual Testing**:
   - Navigate to the runs page
   - Add a tag to the filter
   - Submit the form
   - Uncheck the tag (without submitting)
   - Check the tag again (without submitting)
   - Verify the tag appears only once in the selected tags list

2. **Edge Cases to Test**:
   - Tag exists in multiple sources (e.g., in both important_tags and metadata)
   - Tag is in globalFilter but not in any run's tags
   - Multiple tags being selected/unselected
   - Tag that doesn't exist in any run but is in globalFilter

### Step 3: Add tests (Recommended)

**File**: Create new test file `/Users/limonikas/workspace/bublik-home/bublik-docker/bublik-ui/libs/bublik/features/runs/src/lib/runs-slice.selectors.spec.ts`

**Test Cases**:
```typescript
describe('selectAllTags', () => {
  it('should not return duplicate tags', () => {
    const runs = [
      {
        id: '1',
        important_tags: ['tag1'],
        metadata: ['tag2'],
        relevant_tags: ['tag3']
      },
      {
        id: '2',
        important_tags: ['tag1'], // Duplicate in important_tags
        metadata: ['tag1'],      // Also duplicate in metadata
        relevant_tags: ['tag1']   // Also duplicate in relevant_tags
      }
    ];
    
    const globalFilter = ['tag1'];
    
    const tags = selectAllTags(
      { results: { ids: ['1', '2'], entities: { '1': runs[0], '2': runs[1] } } },
      globalFilter
    );
    
    // Should only have one instance of 'tag1'
    const tag1Count = tags.filter(t => t.value === 'tag1').length;
    expect(tag1Count).toBe(1);
    expect(tags.find(t => t.value === 'tag1')?.isSelected).toBe(true);
  });

  it('should correctly set isSelected for tags in globalFilter', () => {
    // Test implementation
  });

  it('should apply correct background class based on tag type', () => {
    // Test implementation
  });
});
```

## Implementation Approach

### Phase 1: Core Fix (Required)
1. Modify `selectAllTags` selector in `runs-slice.selectors.ts`
2. Test manually with the steps outlined above
3. Verify no regression in existing functionality

### Phase 2: Testing (Recommended)
1. Add unit tests for the selector
2. Add integration tests for the runs form tag functionality

### Phase 3: Code Quality Improvements (Optional)
1. Refactor badge-box mutation approach to avoid direct object mutation
2. Add JSDoc comments explaining the deduplication logic

## Risk Assessment

**Low Risk**:
- The fix is localized to a single selector function
- It improves the behavior without changing the API
- No breaking changes to component interfaces

**Potential Issues**:
- If any code depends on having duplicate tags (unlikely), this could break that code
- Performance: Using Set operations is generally efficient, but should be verified with large tag sets

## Related Issues

- Issue #387: If meta files does not exist for a new project, no tags are displayed
- Issue #315: Add auto-submit click search on runs page

## Success Criteria

1. Tags do not appear multiple times in the dropdown list
2. Unchecking and re-checking a tag does not add extra tags to the selected list
3. Tag selection state is correctly preserved across form submissions
4. Background color assignment works correctly (important > meta > default priority)
5. No performance regression with large tag sets

## Timeline Estimate

- Implementation: 30 minutes
- Manual testing: 30 minutes  
- Writing tests: 1-2 hours
- Code review and refinements: 30 minutes

**Total: 2-4 hours**

## Notes

The fix addresses the root cause by ensuring each tag appears only once in the list. This is a cleaner approach than trying to handle duplicate tags downstream in the badge-box component. The deduplication happens at the data source level, making the UI code simpler and more predictable.
