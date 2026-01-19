# Implementation Plan for Issue #42: Default Values for Global Search on History Page

## Summary
Set appropriate default values for the Global Search form on the history page based on the agreed requirements from issue discussion.

## Requirements Analysis

Based on the issue discussion:
1. **Run Properties**: "Not compromised" should be ON, "compromised" should be OFF (exclude compromised by default) - **ALREADY IMPLEMENTED** ✓
2. **Result Properties**: "Unexpected" should NOT be on by default - **NEEDS FIXING** ✗
3. **Obtained Results**: Use the default from "Reset verdicts section" button - **ALREADY IMPLEMENTED** ✓

## Current State Analysis

### Current Default Values

**File: `/libs/bublik/config/src/lib/constants.ts`**
```typescript
export const DEFAULT_RUN_PROPERTIES: RUN_PROPERTIES[] = [
    RUN_PROPERTIES.NotCompromised  // ✓ Correct - excludes compromised by default
];

export const DEFAULT_RESULT_PROPERTIES: RESULT_PROPERTIES[] = [
    RESULT_PROPERTIES.Expected,    // ✓ Keep this
    RESULT_PROPERTIES.Unexpected   // ✗ REMOVE THIS - should not be on by default
];

export const DEFAULT_RESULT_TYPES: RESULT_TYPE[] = [
    RESULT_TYPE.Passed,
    RESULT_TYPE.Failed,
    RESULT_TYPE.Killed,
    RESULT_TYPE.Cored,
    RESULT_TYPE.Skipped,
    RESULT_TYPE.Faked,
    RESULT_TYPE.Incomplete         // ✓ Correct - used by "Reset verdicts section"
];
```

**File: `/libs/bublik/features/history/src/lib/history-global-search-form/global-search-form/global-search-form.constants.ts`**
```typescript
const defaultResultProperties = [
    RESULT_PROPERTIES.Expected,    // ✓ Keep this
    RESULT_PROPERTIES.Unexpected   // ✗ REMOVE THIS - should not be on by default
];
```

## Files to Modify

### 1. `/libs/bublik/config/src/lib/constants.ts`
**Change**: Modify `DEFAULT_RESULT_PROPERTIES` to only include `RESULT_PROPERTIES.Expected`

**Before:**
```typescript
export const DEFAULT_RESULT_PROPERTIES: RESULT_PROPERTIES[] = [
    RESULT_PROPERTIES.Expected,
    RESULT_PROPERTIES.Unexpected
];
```

**After:**
```typescript
export const DEFAULT_RESULT_PROPERTIES: RESULT_PROPERTIES[] = [
    RESULT_PROPERTIES.Expected
];
```

### 2. `/libs/bublik/features/history/src/lib/history-global-search-form/global-search-form/global-search-form.constants.ts`
**Change**: Update `defaultResultProperties` to only include `RESULT_PROPERTIES.Expected`

**Before:**
```typescript
const defaultResultProperties = [
    RESULT_PROPERTIES.Expected,
    RESULT_PROPERTIES.Unexpected
];
```

**After:**
```typescript
const defaultResultProperties = [
    RESULT_PROPERTIES.Expected
];
```

## Implementation Approach

### Step 1: Update Global Constants
1. Modify `/libs/bublik/config/src/lib/constants.ts`:
   - Remove `RESULT_PROPERTIES.Unexpected` from `DEFAULT_RESULT_PROPERTIES`
   - Keep `RESULT_PROPERTIES.Expected` as the only value

2. Modify `/libs/bublik/features/history/src/lib/history-global-search-form/global-search-form/global-search-form.constants.ts`:
   - Remove `RESULT_PROPERTIES.Unexpected` from `defaultResultProperties`
   - Keep `RESULT_PROPERTIES.Expected` as the only value

### Step 2: Verify Impact Analysis

These changes will affect:
- **Initial form state**: When the Global Search form opens for the first time
- **"Reset" button**: Uses default values from `global-search-form.hooks.ts`
- **"Reset verdicts section" button**: Uses `HISTORY_CONSTANTS.resultProperties`
- **"Reset Filter" button**: Uses `DEFAULT_SEARCH_FORM_STATE` from history-slice

All these should be aligned after the changes since they all reference the constants.

### Step 3: Testing

#### Manual Testing Checklist
1. Open the Global Search form on the history page
2. Verify the following default states:
   - **Run Section**: "Not compromised" should be checked, "Compromised" should be unchecked ✓
   - **Result Section - Result type classification**: Only "Expected" should be checked, "Unexpected" should be unchecked ✓
   - **Result Section - Obtained result**: All result types (PASSED, FAILED, KILLED, CODED, SKIPPED, FAKED, INCOMPLETE) should be checked ✓

3. Test the "Reset verdicts section" button (bin icon in Result section header):
   - Click the bin icon
   - Verify that result properties reset to only "Expected" being checked
   - Verify that obtained results reset to all result types being checked

4. Test the "Reset" button at the bottom of the form:
   - Make changes to the form
   - Click the "Reset" button
   - Verify all sections reset to default values:
     - Run Section: Only "Not compromised" checked
     - Result Section: Only "Expected" checked, all result types checked

5. Test the "Reset Filter" button outside the form:
   - Click the "Reset Filter" button
   - Verify the form state when opened next matches the requirements

#### Unit Testing
Update or add tests for:

1. **Test file**: `/libs/bublik/config/src/lib/utils.spec.ts` (or similar)
   - Verify `DEFAULT_RESULT_PROPERTIES` contains only `RESULT_PROPERTIES.Expected`

2. **Test file**: `/libs/bublik/features/history/src/lib/history-global-search-form/global-search-form/global-search-form.stories.tsx`
   - Update the story example to reflect new default values if needed

3. Consider adding integration tests for the form behavior:
   - Test initial form state
   - Test "Reset verdicts section" button behavior
   - Test form reset behavior

## Impact on Existing Functionality

### What Changes
- Default value for `resultProperties` in the Global Search form
- Form initialization behavior
- Reset button behaviors

### What Stays the Same
- Default value for `runProperties` (already correct)
- Default value for `results`/obtained results (all result types)
- Form structure and UI
- All other form fields and their defaults

### Potential Breaking Changes
**Low Risk**: This change affects default values only. Existing users may notice the form defaults differently, but this is the desired behavior. No API changes or data structure changes.

## Rollback Plan
If issues arise after deployment:
1. Revert changes to the two modified files
2. Restore previous default values:
   - Add `RESULT_PROPERTIES.Unexpected` back to both `DEFAULT_RESULT_PROPERTIES` and `defaultResultProperties`
3. Deploy revert to production

## Validation

After implementation, validate:
1. ✓ Form opens with correct default values
2. ✓ "Not compromised" is checked by default, "Compromised" is not
3. ✓ "Expected" is checked by default, "Unexpected" is not
4. ✓ All obtained results (PASSED, FAILED, etc.) are checked by default
5. ✓ "Reset verdicts section" button resets to these defaults
6. ✓ "Reset" button resets all sections to defaults
7. ✓ "Reset Filter" button properly resets the filter state
8. ✓ Existing functionality (submit, search) still works correctly
9. ✓ No console errors or warnings

## Additional Notes

- The fix is straightforward and minimal - only 2 files need changes
- The changes align the default form state with what the "Reset verdicts section" button does
- All three requirements from the issue will be met after this change
- Consider updating any documentation that describes the default behavior if it exists

## References

- Issue: #42 Default values for Global search on history page
- Related files:
  - `/libs/bublik/config/src/lib/constants.ts` - Global default constants
  - `/libs/bublik/features/history/src/lib/history-global-search-form/global-search-form/global-search-form.constants.ts` - Form-specific constants
  - `/libs/bublik/features/history/src/lib/history-global-search-form/global-search-form/global-search-form.types.ts` - Type definitions with defaults
  - `/libs/bublik/features/history/src/lib/history-global-search-form/global-search-form/global-search-form.hooks.ts` - Form hooks including reset logic
  - `/libs/bublik/features/history/src/lib/slice/history-slice.ts` - Redux slice with default state
