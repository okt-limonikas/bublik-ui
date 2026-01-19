# Plan to Fix Issue #32: Loss of entered data without enter clicking in the history

## Overview

This document outlines a detailed plan to fix the inconsistent behavior of form fields in the history global search form, where some fields save data immediately without Enter, while others require pressing Enter to save.

## Root Cause Analysis

### Current Behavior

1. **TextField components** (testName, hash, labelExpr, branchExpr, revisionExpr, tagExpr, testArgExpr, verdictExpr, runIds):
   - Update form state immediately on every keystroke
   - No Enter key required
   - Uses `useController` from react-hook-form which triggers `onChange` on input change

2. **BadgeField components** (labels, branches, revisions, verdict, parameters, runData):
   - Require pressing Enter to create a badge before data is saved
   - Uses BadgeInput component with explicit Enter key handling
   - Data only saved when a badge is created

3. **CheckboxField, RadioField, DateRangePickerField**:
   - Update immediately on interaction
   - No Enter key required

### The Problem

The inconsistency creates user confusion:
- Users type in TextField fields and see immediate form state updates
- Users type in BadgeField fields and nothing happens until they press Enter
- This violates principle of least astonishment and creates inconsistent UX

### Root Cause

The BadgeInput component (used by BadgeField) is designed to create discrete "badge" items when Enter is pressed. This is appropriate for badge inputs but creates inconsistency with the rest of the form fields that update immediately.

The `BadgeField` wrapper component currently:
- Only calls `field.onChange()` when `onBadgesChange` is triggered
- `onBadgesChange` only happens when a badge is created (Enter pressed)
- The raw input value in BadgeInput is not exposed to the form state

## Solution

Make BadgeFields behave like TextFields by:
1. Updating form state with the current input value as the user types (even before Enter is pressed)
2. Still create badges when Enter is pressed (existing behavior preserved)
3. Ensure form state reflects all user input immediately

This approach:
- Maintains badge functionality (Enter still creates badges)
- Provides immediate feedback like other form fields
- Preserves existing Enter-to-create-badge UX
- Minimal changes required

## Implementation Plan

### Phase 1: Modify BadgeInput Component

**File**: `libs/shared/tailwind-ui/src/lib/badge-input/badge-input.tsx`

**Changes**:
1. Add a new callback prop `onInputChange` that is called on every input change
2. Call `onInputChange` when input value changes (in `handleChange` function)
3. Export the input value alongside badges

**Code changes**:
```typescript
// Add new prop to interface
export interface BadgeInputProps {
  label?: string;
  onBadgesChange?: (badges: BadgeItem[]) => void;
  badges?: BadgeItem[];
  placeholder?: string;
  disabled?: boolean;
  icon?: ReactNode;
  name?: string;
  onInputChange?: (value: string) => void; // NEW
}

// In handleChange, call onInputChange
const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
  setValue(e.target.value);
  onInputChange?.(e.target.value); // NEW
};
```

### Phase 2: Update BadgeField Component

**File**: `libs/shared/tailwind-ui/src/lib/badge-input/badge-field.tsx`

**Changes**:
1. Track both the current input value and badges in form state
2. Update form state immediately when input changes (via `onInputChange`)
3. Still call `field.onChange` when badges change (existing behavior)

**Code changes**:
```typescript
// Modify the interface to accept onInputChange
export type BadgeFieldProps<T extends FieldValues> = {
  name: Path<T>;
  control: Control<T, unknown>;
  label: string;
  placeholder: BadgeInputProps['placeholder'];
  disabled?: BadgeInputProps['disabled'];
};

export const BadgeField = <T extends FieldValues>(
  props: BadgeFieldProps<T>
) => {
  const { field } = useController<T>({
    name: props.name,
    control: props.control
  });

  const handleBadgesChange = (newBadges: BadgeItem[]) => {
    field.onChange(newBadges);
  };

  // NEW: Handle input changes
  const handleInputChange = (inputValue: string) => {
    // Update form state with the current input value
    // This provides immediate feedback like other form fields
    field.onChange([...field.value, inputValue]);
  };

  return (
    <BadgeInput
      {...props}
      onBadgesChange={handleBadgesChange}
      onInputChange={handleInputChange} // NEW
      badges={field.value}
      label={props.label}
      ref={field.ref}
    />
  );
};
```

**Alternative approach (cleaner but requires type changes)**:
Store the current input value separately from badges in the form state. However, this requires changing the HistoryGlobalSearchFormValues type and all related code.

**Recommended approach for MVP**:
For simplicity and minimal changes, use the approach above where the input value is temporarily added to the badge array when typing, then either:
- Removed when user clears input
- Converted to a proper badge when Enter is pressed

Actually, a better approach is to have the form state track both badges AND the current input value separately. But this requires changing the form schema.

Let me revise to a simpler approach:

**Revised approach**:
Simply add `onInputChange` to BadgeInput, and in the parent component (the form sections), we can track the input value separately and combine it with badges when needed.

However, this requires changes to multiple components. Let me propose a cleaner solution:

**Final recommended approach**:
Modify BadgeField to track both input value and badges, but only store badges in the form state. The input value is ephemeral and only affects local UI state.

The key insight: We need to update the form state with the input value AS the user types, not just when Enter is pressed. This can be done by:
1. Adding `onValueChange` callback to BadgeInput that fires on every keystroke
2. In BadgeField, calling `field.onChange` with the current input value + badges combined
3. When Enter is pressed, the badge is properly added and the input is cleared

Actually, looking at this more carefully, I realize the issue is that the form state should reflect what the user sees. If they type "test" in a BadgeField but don't press Enter, the form state should still know about "test".

Here's the cleanest solution:

### Final Implementation Plan

#### Step 1: Modify BadgeInput to expose input value

**File**: `libs/shared/tailwind-ui/src/lib/badge-input/badge-input.tsx`

Add a new prop `onValueChange` that fires whenever the input value changes:

```typescript
export interface BadgeInputProps {
  label?: string;
  onBadgesChange?: (badges: BadgeItem[]) => void;
  badges?: BadgeItem[];
  placeholder?: string;
  disabled?: boolean;
  icon?: ReactNode;
  name?: string;
  onValueChange?: (value: string) => void; // NEW
}

const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
  setValue(e.target.value);
  onValueChange?.(e.target.value); // NEW
};
```

#### Step 2: Update BadgeField to propagate input changes

**File**: `libs/shared/tailwind-ui/src/lib/badge-input/badge-field.tsx`

```typescript
export const BadgeField = <T extends FieldValues>(
  props: BadgeFieldProps<T>
) => {
  const { field } = useController<T>({
    name: props.name,
    control: props.control
  });

  const handleBadgesChange = (newBadges: BadgeItem[]) => {
    field.onChange(newBadges);
  };

  // NEW: Propagate input value changes to form
  const handleValueChange = (inputValue: string) => {
    // Update form state with the current input value
    // This makes BadgeFields behave like TextFields
    field.onChange(inputValue);
  };

  return (
    <BadgeInput
      {...props}
      onBadgesChange={handleBadgesChange}
      onValueChange={handleValueChange} // NEW
      badges={field.value}
      label={props.label}
      ref={field.ref}
    />
  );
};
```

Wait, this won't work because `field.value` expects a BadgeItem[] array, but we're trying to pass a string.

Let me reconsider the architecture. The issue is that:
1. BadgeField expects the form field to be of type `BadgeItem[]`
2. But we want to update it with a string value (the current input)

The proper solution requires changing how we store the data. We need to track:
- The current badges (BadgeItem[])
- The current input value (string)

**Revised solution that preserves type safety**:

Option A: Change the form field type to include both badges and input value
Option B: Use a separate form field for the input value
Option C: Make BadgeField store the raw input value and parse it to badges when needed

Given the scope and complexity, let me propose a more pragmatic solution:

**Pragmatic solution**:
Since BadgeFields are meant for entering discrete values (like tags, labels, etc.), the current behavior (requiring Enter) is actually intentional and correct for that UX pattern.

However, the issue states that "some fields save data without enter clicking, and some do not" which suggests this is perceived as a bug.

The real solution depends on what the expected behavior should be. Let me assume the expected behavior is:
- All fields should save immediately without Enter (like TextField)

To achieve this for BadgeFields without breaking the badge creation UX:

1. Add `onInputChange` callback to BadgeInput
2. In BadgeField, don't pass it to field.onChange (type mismatch)
3. Instead, have the parent component track input value separately
4. When submitting the form, combine badges + input value

But this requires changes to the form container and potentially the form state structure.

Given the complexity, let me propose a simpler intermediate solution that improves the situation:

**Intermediate solution**:
Update BadgeInput to call `onBlur` to save the current input value as a badge when the user leaves the field (in addition to Enter). This makes it so users don't necessarily need to press Enter - they can just click away.

This is a common pattern for tag inputs and improves the UX without requiring major refactoring.

Actually, looking at the code again, I see that `field.onBlur` is already passed to BadgeInput but commented out in badge-field.tsx line 33!

```typescript
// onBlur={field.onBlur}
```

Let me check what happens if we uncomment this and also handle the current input value on blur.

**Final final solution**:
1. Uncomment the `onBlur={field.onBlur}` in BadgeField
2. In BadgeInput, when blur happens, if there's an input value, create a badge from it
3. This makes BadgeFields save data either on Enter OR on blur (when leaving the field)

This is the minimal change that improves UX without major refactoring.

Let me revise the plan with this approach.

## REVISED Implementation Plan (Simpler)

### Phase 1: Enable onBlur in BadgeField

**File**: `libs/shared/tailwind-ui/src/lib/badge-input/badge-field.tsx`

**Changes**:
1. Uncomment line 33 to enable `onBlur={field.onBlur}`

```typescript
return (
  <BadgeInput
    {...props}
    onBadgesChange={handleBadgesChange}
    badges={field.value}
    label={props.label}
    onBlur={field.onBlur} // UNCOMMENT THIS
    ref={field.ref}
  />
);
```

### Phase 2: Handle blur in BadgeInput to create badge from current input

**File**: `libs/shared/tailwind-ui/src/lib/badge-input/badge-input.tsx`

**Changes**:
1. Add a prop `onBlur` callback
2. When blur occurs, if there's an input value, create a badge from it
3. Clear the input value after creating the badge

```typescript
export interface BadgeInputProps {
  label?: string;
  onBadgesChange?: (badges: BadgeItem[]) => void;
  badges?: BadgeItem[];
  placeholder?: string;
  disabled?: boolean;
  icon?: ReactNode;
  name?: string;
  onBlur?: () => void; // NEW
}

const handleBlur = (_: FocusEvent<HTMLInputElement>) => {
  setIsFocused(false);
  onBlur?.(); // NEW
  
  // NEW: Create badge from current input value if exists
  const input = value.trim();
  if (input.length && !badges.some((badge) => badge.value === input)) {
    const parsedBadges: BadgeItem[] = parseBadgeString(input).map(
      (value) => ({
        id: nanoid(4),
        value,
        originalValue: value,
        isExpression: false
      })
    );
    const newBadgesValue = [...badges, ...parsedBadges];
    setValue('');
    onBadgesChange?.(newBadgesValue);
  }
};
```

Wait, there's already a `handleBlur` function. I need to modify it instead of adding a new one.

### Corrected Phase 2

**File**: `libs/shared/tailwind-ui/src/lib/badge-input/badge-input.tsx`

**Modify existing handleBlur function**:

Current code (lines 114-115):
```typescript
const handleFocus = (_: FocusEvent<HTMLInputElement>) => setIsFocused(true);
const handleBlur = (_: FocusEvent<HTMLInputElement>) => setIsFocused(false);
```

New code:
```typescript
const handleFocus = (_: FocusEvent<HTMLInputElement>) => setIsFocused(true);
const handleBlur = (_: FocusEvent<HTMLInputElement>) => {
  setIsFocused(false);
  onBlur?.();
  
  // Create badge from current input value if exists
  const input = value.trim();
  if (input.length && !badges.some((badge) => badge.value === input)) {
    const parsedBadges: BadgeItem[] = parseBadgeString(input).map(
      (value) => ({
        id: nanoid(4),
        value,
        originalValue: value,
        isExpression: false
      })
    );
    const newBadgesValue = [...badges, ...parsedBadges];
    setValue('');
    onBadgesChange?.(newBadgesValue);
  }
};
```

And update the interface:
```typescript
export interface BadgeInputProps {
  label?: string;
  onBadgesChange?: (badges: BadgeItem[]) => void;
  badges?: BadgeItem[];
  placeholder?: string;
  disabled?: boolean;
  icon?: ReactNode;
  name?: string;
  onBlur?: () => void; // NEW
}
```

## Files to be Modified

1. **`libs/shared/tailwind-ui/src/lib/badge-input/badge-input.tsx`**
   - Add `onBlur` prop to interface
   - Modify `handleBlur` to create badge from input value on blur
   - Call `onBlur` callback

2. **`libs/shared/tailwind-ui/src/lib/badge-input/badge-field.tsx`**
   - Uncomment `onBlur={field.onBlur}` line

## Testing Strategy

### Unit Tests

**File**: `libs/shared/tailwind-ui/src/lib/badge-input/badge-input.spec.tsx` (create if doesn't exist)

Test cases:
1. Test that badge is created on Enter key press (existing behavior)
2. Test that badge is created on blur when input has value (new behavior)
3. Test that duplicate badges are not created
4. Test that input is cleared after badge creation
5. Test that `onBlur` callback is called

**File**: `libs/shared/tailwind-ui/src/lib/badge-input/badge-field.spec.tsx` (create if doesn't exist)

Test cases:
1. Test that form is updated when badge is created
2. Test that form field's `onBlur` is called
3. Integration with react-hook-form

### Integration Tests

**File**: `libs/bublik/features/history/src/lib/history-global-search-form/global-search-form.spec.tsx` (create)

Test cases:
1. Test that all BadgeFields in the form create badges on Enter
2. Test that all BadgeFields in the form create badges on blur
3. Test that form state is correctly updated
4. Test that the form can be submitted with badges created via blur
5. Test interaction with TextField fields to ensure consistent behavior

### Manual Testing Checklist

- [ ] Open global search form
- [ ] Type in a BadgeField (e.g., Labels) and press Enter → badge created
- [ ] Type in a BadgeField (e.g., Labels) and click away → badge created
- [ ] Type in a BadgeField, click another field, then return → previous badge saved
- [ ] Type duplicate values → no duplicate badges created
- [ ] Submit form with badges created via blur → correct data submitted
- [ ] Compare BadgeField behavior with TextField → both save data without requiring Enter

## Implementation Approach

### Step-by-Step Process

1. **Setup**
   - Create feature branch from main
   - Run existing tests to ensure baseline passing

2. **Implement changes**
   - Modify BadgeInput component (Phase 1)
   - Modify BadgeField component (Phase 2)
   - Run linting and type checking

3. **Add tests**
   - Create unit tests for BadgeInput
   - Create unit tests for BadgeField
   - Create integration tests for global search form

4. **Testing**
   - Run all tests (unit and integration)
   - Perform manual testing
   - Verify no regressions in other BadgeInput usages

5. **Documentation**
   - Update component documentation if needed
   - Add comments explaining the new behavior

6. **Review and merge**
   - Submit pull request
   - Address review feedback
   - Merge to main

## Potential Risks and Mitigations

### Risk 1: Breaking existing BadgeInput usages elsewhere

**Mitigation**: 
- Search for all usages of BadgeInput across the codebase
- Test each usage to ensure blur behavior is acceptable
- If blur behavior is undesirable in some contexts, consider adding a prop to disable it

### Risk 2: Duplicate badge creation on blur

**Mitigation**: 
- Already handled in code (line 60: `!badges.some((badge) => badge.value === input)`)
- Add test case to verify this behavior

### Risk 3: Form submission issues with blur-created badges

**Mitigation**: 
- Integration tests will catch this
- Manual testing in the global search form
- Verify form data is correctly transformed on submit

### Risk 4: User confusion about when badges are created

**Mitigation**: 
- This change actually reduces confusion by making behavior more consistent
- Consider adding visual feedback (e.g., highlight input when it has unsaved value)
- Update user documentation if needed

## Alternative Solutions Considered

### Option A: Make BadgeFields update form state on every keystroke

**Pros**: 
- Most consistent with TextField behavior
- Immediate feedback

**Cons**: 
- Requires major refactoring
- Type changes (BadgeItem[] vs string)
- More complex implementation
- May break existing integrations

**Decision**: Rejected due to scope and risk

### Option B: Do nothing, document the inconsistency

**Pros**: 
- No code changes
- Zero risk

**Cons**: 
- Doesn't fix the issue
- Poor UX remains

**Decision**: Rejected - issue should be fixed

### Option C: Add a prop to control blur behavior

**Pros**: 
- Flexible for different use cases
- Backward compatible

**Cons**: 
- More complex API
- Unclear what default should be

**Decision**: Consider for future if current solution causes issues

## Success Criteria

1. All BadgeFields in the history global search form save data without requiring Enter:
   - Badge created on Enter press (existing behavior)
   - Badge created when clicking away from the field (new behavior)

2. Behavior is consistent with other form fields (TextField, etc.)

3. No regressions in existing BadgeInput/BadgeField functionality

4. All tests pass (unit, integration, and manual)

5. User experience is improved and more intuitive

## Estimated Effort

- Implementation: 2-3 hours
- Testing: 2-3 hours
- Documentation: 0.5 hours
- Code review and fixes: 1-2 hours

**Total**: 5.5 - 8.5 hours

## Related Issues and Dependencies

- Issue #32: Loss of entered data without enter clicking in the history
- May be related to other form consistency issues
- No external dependencies identified

## Conclusion

This plan provides a pragmatic solution to the inconsistent form field behavior by:
1. Making BadgeFields save data on blur (in addition to Enter)
2. Minimal code changes with low risk
3. Maintaining backward compatibility
4. Improving user experience

The solution is easy to implement, test, and maintain while addressing the core issue of inconsistent data saving behavior across form fields.
