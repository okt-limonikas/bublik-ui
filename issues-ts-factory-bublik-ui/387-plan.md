# Issue #387: If meta files does not exist for a new project no tags are displayed

## Plan to Fix Tags Not Displayed When Meta Files Don't Exist

### Root Cause Analysis

**Problem Description:**
When meta files don't exist for a new project, tags are not displayed in the UI. All tags are treated as "don't show" (i.e., hidden from view).

**Root Cause:**
The frontend displays tags based on two arrays returned by the API:
- `important_tags`: Tags marked as important by meta categorization
- `relevant_tags`: Tags marked as relevant by meta categorization

When meta files don't exist (meaning meta categorization hasn't been run), the backend returns empty arrays for both `important_tags` and `relevant_tags`. However, there is a third field `metadata` available in the API response that contains raw/uncategorized tags.

The `getTags` function in `history-linear.utils.ts` only returns tags from `important_tags` and `relevant_tags`, but doesn't fall back to the `metadata` field when these arrays are empty.

**Evidence:**
1. `HistoryDataLinear` type in `libs/shared/types/src/lib/history.ts` includes:
   - `relevant_tags: string[]`
   - `important_tags: string[]`
   - `metadata: string[]` (raw/uncategorized tags)

2. The `globalFilterFn` in `history-linear.utils.ts` already includes `metadata` in filtering logic (line 50, 59), indicating the data is available but not being displayed.

3. The `getTags` function (line 11-19) only returns `relevant_tags` and `important_tags`, ignoring `metadata`.

### Files That Need to be Modified

#### 1. `libs/bublik/features/history/src/lib/history-linear/history-linear.utils.ts`

**Current Implementation:**
```typescript
export const getTags = (data: HistoryDataLinear): BadgeListItem[] => {
	const tags = data.relevant_tags.map((tag) => ({ payload: tag }));
	const importantTags = data.important_tags.map((importantTag) => ({
		payload: importantTag,
		isImportant: true
	}));

	return [...importantTags, ...tags];
};
```

**Proposed Change:**
Add fallback to `metadata` tags when both `important_tags` and `relevant_tags` are empty:

```typescript
export const getTags = (data: HistoryDataLinear): BadgeListItem[] => {
	const hasCategorizedTags = 
		data.important_tags.length > 0 || data.relevant_tags.length > 0;

	const tags = hasCategorizedTags 
		? data.relevant_tags.map((tag) => ({ payload: tag }))
		: data.metadata.map((tag) => ({ payload: tag }));

	const importantTags = data.important_tags.map((importantTag) => ({
		payload: importantTag,
		isImportant: true
	}));

	return [...importantTags, ...tags];
};
```

### Code Changes Needed

#### Change 1: Update `getTags` function in `history-linear.utils.ts`

**Location:** `libs/bublik/features/history/src/lib/history-linear/history-linear.utils.ts` (lines 11-19)

**Implementation:**
1. Check if either `important_tags` or `relevant_tags` have content
2. If yes: use `relevant_tags` for regular tags (current behavior)
3. If no: use `metadata` array as fallback for regular tags
4. Always include `important_tags` as they should be shown regardless

**Rationale:**
- When meta categorization hasn't been run (new projects), show all available tags from `metadata`
- When meta categorization has been run, show the categorized tags (`important_tags` and `relevant_tags`)
- This preserves backward compatibility and expected behavior for projects with meta files

### Implementation Approach

1. **Modify the `getTags` function** to implement the fallback logic
2. **Test with different scenarios**:
   - New project without meta files (empty `important_tags` and `relevant_tags`, populated `metadata`)
   - Existing project with meta files (populated `important_tags` and/or `relevant_tags`)
   - Mixed scenario where only one of `important_tags` or `relevant_tags` has content
3. **Verify filtering still works** - The `globalFilterFn` already includes `metadata`, so filtering should continue to work correctly
4. **Check other views** to ensure consistency:
   - Aggregation view doesn't have `metadata` in its data type, so no changes needed
   - Run details view uses `important_tags` and `relevant_tags` from a different API endpoint - verify if `metadata` is available there

### Tests to Add or Update

#### 1. Unit Tests for `getTags` function

**File:** `libs/bublik/features/history/src/lib/history-linear/history-linear.utils.spec.ts` (if exists, create if not)

**Test Cases:**
```typescript
describe('getTags', () => {
	it('should return important and relevant tags when categorized tags exist', () => {
		const data: HistoryDataLinear = {
			important_tags: ['important_tag1'],
			relevant_tags: ['relevant_tag1', 'relevant_tag2'],
			metadata: ['metadata_tag1', 'metadata_tag2'],
			// ... other required fields
		};

		const result = getTags(data);
		
		expect(result).toHaveLength(3); // 1 important + 2 relevant
		expect(result[0].payload).toBe('important_tag1');
		expect(result[0].isImportant).toBe(true);
		expect(result[1].payload).toBe('relevant_tag1');
		expect(result[2].payload).toBe('relevant_tag2');
	});

	it('should fallback to metadata tags when no categorized tags exist', () => {
		const data: HistoryDataLinear = {
			important_tags: [],
			relevant_tags: [],
			metadata: ['metadata_tag1', 'metadata_tag2'],
			// ... other required fields
		};

		const result = getTags(data);
		
		expect(result).toHaveLength(2);
		expect(result[0].payload).toBe('metadata_tag1');
		expect(result[1].payload).toBe('metadata_tag2');
		expect(result[0].isImportant).toBe(false);
		expect(result[1].isImportant).toBe(false);
	});

	it('should return empty array when no tags exist at all', () => {
		const data: HistoryDataLinear = {
			important_tags: [],
			relevant_tags: [],
			metadata: [],
			// ... other required fields
		};

		const result = getTags(data);
		
		expect(result).toHaveLength(0);
	});

	it('should include important tags even when relevant tags are empty', () => {
		const data: HistoryDataLinear = {
			important_tags: ['important_tag1'],
			relevant_tags: [],
			metadata: ['metadata_tag1'],
			// ... other required fields
		};

		const result = getTags(data);
		
		expect(result).toHaveLength(1);
		expect(result[0].payload).toBe('important_tag1');
		expect(result[0].isImportant).toBe(true);
	});

	it('should use relevant tags instead of metadata when available', () => {
		const data: HistoryDataLinear = {
			important_tags: [],
			relevant_tags: ['relevant_tag1'],
			metadata: ['metadata_tag1'],
			// ... other required fields
		};

		const result = getTags(data);
		
		expect(result).toHaveLength(1);
		expect(result[0].payload).toBe('relevant_tag1');
		expect(result[0].isImportant).toBe(false);
	});
});
```

#### 2. Integration Tests

Test the complete user flow:
1. Create a new project (simulated)
2. Import runs with tags
3. Verify tags are displayed in history linear view (should show metadata tags)
4. Run meta categorization (if available in test environment)
5. Verify tags are now displayed as categorized (important/relevant instead of metadata)

### Additional Considerations

#### 1. Backward Compatibility
- Existing projects with meta files will continue to work as before
- The change only affects new projects without meta files
- No breaking changes to API contracts

#### 2. Performance Impact
- Minimal: only adds a simple conditional check
- No additional API calls or data processing

#### 3. Edge Cases to Consider
- What if `metadata` is undefined or null? (Current code assumes array, should add safety check)
- What if `metadata` contains duplicate tags? (Should be handled by BadgeList component)
- Should `metadata` tags have any special styling to indicate they're uncategorized? (Optional enhancement)

#### 4. Future Enhancements
- Consider adding a visual indicator (e.g., icon or different color) to show which tags are categorized vs uncategorized
- Consider adding a feature to run meta categorization from the UI (related to issue #435)
- Consider caching meta categorization results to improve performance

### Summary

The fix involves a single, straightforward change to the `getTags` function to add fallback logic for displaying tags when meta categorization hasn't been run. This will improve the user experience for new projects by showing available tags instead of an empty tag display.

The implementation is:
- Simple and maintainable
- Backward compatible
- Well-tested with comprehensive unit tests
- Solves the reported issue without side effects
