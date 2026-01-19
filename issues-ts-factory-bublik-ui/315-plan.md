# Implementation Plan: Issue #315 - Add auto-submit functionality on runs page search form

## Issue Summary
Add auto-submit functionality to the runs page search form so that users can search by:
1. Typing in the tag expression search bar (auto-submit with debounce)
2. Pressing Enter key in the search bar (immediate submit)
3. Potentially auto-submitting when dates or tags change

## Current State Analysis

### Files Involved
1. **Main Form Component**: `libs/bublik/features/runs/src/lib/runs-form/runs-form.component.tsx`
2. **Form Container**: `libs/bublik/features/runs/src/lib/runs-form/runs-form.container.tsx`
3. **Page**: `apps/bublik/src/pages/runs-page/runs-page.tsx`

### Current Behavior
- Form uses `react-hook-form` with `handleSubmit`
- Form only submits when user clicks "Submit" button
- Search bar uses `SearchBar` component with standard input behavior
- No debounced auto-submit
- No keyboard shortcuts for form submission

### Form Fields
- `dates`: Date range picker (`AriaDateRangePicker`)
- `runData`: Tags selector (`TagsBoxInput`)
- `tagExpr`: Tag expression search bar (`SearchBar`)
- `calendarMode`: Date picker mode ('default' | 'duration')

## Implementation Approach

### Option 1: Debounced Auto-Submit on Search Bar (Recommended)
Auto-submit the form when user types in the tag expression field with a debounce delay.

**Pros**: 
- Most common UX pattern for search inputs
- Follows existing patterns in codebase (dashboard-v2, history-substring-filter)
- Clean and simple implementation

**Cons**:
- May submit too frequently if typing quickly (mitigated by debounce)

### Option 2: Enter Key + Ctrl+Enter Shortcuts
Allow users to submit by pressing Enter in the search bar, and Ctrl+Enter anywhere in the form.

**Pros**:
- User has control over when to submit
- Follows existing pattern (history-global-search-form)

**Cons**:
- Requires user to press Enter explicitly

### Option 3: Combined Approach (Best User Experience)
Implement both Option 1 and Option 2:
- Debounced auto-submit for tag expression field
- Enter key to submit immediately from search bar
- Ctrl+Enter to submit from anywhere in form

## Detailed Implementation Plan

### Phase 1: Add Debounced Auto-Submit for Tag Expression

**File**: `libs/bublik/features/runs/src/lib/runs-form/runs-form.container.tsx`

**Changes**:

1. Import necessary hooks:
```typescript
import { useEffect, useRef } from 'react';
import { useDebounce } from '@/shared/hooks';
```

2. Create a custom hook or effect to watch tag expression and auto-submit:

```typescript
// Add after useMount hook
const formMethods = useForm<RunsFormValues>({ 
  defaultValues,
  mode: 'onChange' // Important: enables onChange validation
});

// Watch for changes and debounced submit
const tagExprValue = formMethods.watch('tagExpr');
const debouncedTagExpr = useDebounce(tagExprValue, 400); // 400ms delay like dashboard-v2

const prevTagExprRef = useRef(debouncedTagExpr);

useEffect(() => {
  // Only submit if the debounced value has actually changed
  // and not on initial render
  if (prevTagExprRef.current === undefined) {
    prevTagExprRef.current = debouncedTagExpr;
    return;
  }

  if (debouncedTagExpr !== prevTagExprRef.current) {
    const currentValues = formMethods.getValues();
    handleFormSubmit(currentValues);
    prevTagExprRef.current = debouncedTagExpr;
  }
}, [debouncedTagExpr, formMethods, handleFormSubmit]);
```

3. Update the RunsForm component to receive formMethods:
```typescript
<RunsForm
  key={`${localGlobalFilter.length}_${defaultValues.runData.length}`}
  defaultValues={defaultValues}
  onRunsFormSubmit={handleFormSubmit}
  onResetFormClick={handleResetFormClick}
  formMethods={formMethods} // Add this prop
/>
```

**File**: `libs/bublik/features/runs/src/lib/runs-form/runs-form.component.tsx`

**Changes**:

1. Update props to accept formMethods:
```typescript
export interface RunsFormProps {
  defaultValues: RunsFormValues;
  onRunsFormSubmit: (newForm: RunsFormValues) => void;
  onResetFormClick: (resettedForm: RunsFormValues) => void;
  formMethods?: UseFormReturn<RunsFormValues>; // Add this
}
```

2. Update component to use formMethods if provided:
```typescript
export const RunsForm = forwardRef<HTMLFormElement, RunsFormProps>(
  ({ defaultValues, onRunsFormSubmit, onResetFormClick, formMethods }, ref) => {
    const {
      control,
      register,
      handleSubmit,
      reset,
      getValues,
      watch,
      setValue
    } = formMethods || useForm<RunsFormValues>({ 
      defaultValues,
      mode: 'onChange'
    });

    // ... rest of the component remains the same
  }
);
```

### Phase 2: Add Enter Key Support for Search Bar

**File**: `libs/bublik/features/runs/src/lib/runs-form/runs-form.component.tsx`

**Changes**:

Update the SearchBar to handle Enter key:
```typescript
<SearchBar 
  {...register('tagExpr')} 
  placeholder="Tag expression"
  onKeyDown={(e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSubmit(onRunsFormSubmit)();
    }
  }}
/>
```

### Phase 3: Add Ctrl+Enter Shortcut for Entire Form

**File**: `libs/bublik/features/runs/src/lib/runs-form/runs-form.component.tsx`

**Changes**:

1. Create a custom hook for Ctrl+Enter (similar to history-global-search-form):

```typescript
import { useEffect, KeyboardEvent } from 'react';

function useCtrlEnterSubmit({
  onSubmit,
  formRef
}: {
  onSubmit: () => void;
  formRef: React.RefObject<HTMLFormElement>;
}) {
  useEffect(() => {
    const handleKeyDown = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Enter' && e.ctrlKey) {
        e.preventDefault();
        onSubmit();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onSubmit]);
}
```

2. Add ref to form and use the hook:

```typescript
const internalFormRef = useRef<HTMLFormElement>(null);
const mergedFormRef = mergeRefs(ref, internalFormRef);

useCtrlEnterSubmit({
  onSubmit: () => {
    handleSubmit(onRunsFormSubmit)();
  },
  formRef: internalFormRef
});

// Update form element to use mergedFormRef
<form
  className="flex items-center gap-4"
  onSubmit={handleSubmit(onRunsFormSubmit)}
  ref={mergedFormRef}
>
```

### Phase 4: Consider Auto-Submit for Date Changes (Optional)

If the requirement includes auto-submitting when dates change:

**File**: `libs/bublik/features/runs/src/lib/runs-form/runs-form.container.tsx`

**Changes**:

```typescript
// Add date watching
const datesValue = formMethods.watch('dates');
const runDataValue = formMethods.watch('runData');

// Debounced submit for all form fields
const formValues = formMethods.watch();
const debouncedFormValues = useDebounce(formValues, 500);

const prevValuesRef = useRef<RunsFormValues | null>(null);

useEffect(() => {
  if (!prevValuesRef.current) {
    prevValuesRef.current = debouncedFormValues;
    return;
  }

  // Check if any significant field changed (not just re-renders)
  const valuesChanged = 
    JSON.stringify(prevValuesRef.current) !== JSON.stringify(debouncedFormValues);

  if (valuesChanged) {
    handleFormSubmit(debouncedFormValues);
    prevValuesRef.current = debouncedFormValues;
  }
}, [debouncedFormValues, handleFormSubmit]);
```

### Phase 5: Prevent Excessive Submissions

To prevent issues with auto-submit:

1. Add a `isSubmitting` state to prevent concurrent submissions:
```typescript
const [isSubmitting, setIsSubmitting] = useState(false);

function handleFormSubmit(newForm: RunsFormValues) {
  if (isSubmitting) return;
  
  setIsSubmitting(true);
  
  try {
    setSearchParams(formToSearchParams(searchParams, newForm), {
      replace: true
    });
    dispatch(
      updateGlobalFilter(
        newForm.runData.filter((v) => v.isSelected).map((v) => v.value)
      )
    );
    dispatch(bublikAPI.util.invalidateTags([BUBLIK_TAG.SessionList]));
  } finally {
    // Small delay to prevent rapid submissions
    setTimeout(() => setIsSubmitting(false), 100);
  }
}
```

## Testing Strategy

### Manual Testing
1. **Debounced auto-submit**:
   - Type in tag expression field
   - Wait 400ms and verify form auto-submits
   - Type multiple characters quickly and verify only one submission occurs
   - Check URL parameters update correctly

2. **Enter key support**:
   - Type in tag expression field and press Enter
   - Verify form submits immediately
   - Check URL parameters update correctly

3. **Ctrl+Enter shortcut**:
   - Fill in any field and press Ctrl+Enter
   - Verify form submits
   - Test from different form fields

4. **Date changes** (if implemented):
   - Change date range
   - Verify form auto-submits after debounce
   - Check URL parameters include `calendarMode` and `duration` (if in duration mode)

5. **Reset functionality**:
   - Verify reset button still works correctly
   - Check form doesn't auto-submit on reset

6. **Edge cases**:
   - Rapid typing in search field
   - Empty search field
   - Invalid dates
   - Network errors during submission

### Unit Tests

**File**: `libs/bublik/features/runs/src/lib/runs-form/runs-form.component.spec.ts` (new file)

Create tests for:
1. Form renders correctly with all fields
2. Debounced submit triggers after delay
3. Enter key triggers immediate submit
4. Ctrl+Enter triggers submit from anywhere
5. Reset button clears form correctly
6. Form validation works
7. Multiple rapid changes only trigger one submission

Example test structure:
```typescript
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RunsForm } from './runs-form.component';

describe('<RunsForm />', () => {
  const mockOnSubmit = jest.fn();
  const mockOnReset = jest.fn();
  const defaultValues = {
    calendarMode: 'default',
    dates: null,
    runData: [],
    tagExpr: ''
  };

  beforeEach(() => {
    jest.useFakeTimers();
    mockOnSubmit.mockClear();
    mockOnReset.mockClear();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should render all form fields', () => {
    render(<RunsForm defaultValues={defaultValues} onRunsFormSubmit={mockOnSubmit} onResetFormClick={mockOnReset} />);
    expect(screen.getByPlaceholderText('Tag expression')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /submit/i })).toBeInTheDocument();
  });

  it('should debounced submit after 400ms', async () => {
    render(<RunsForm defaultValues={defaultValues} onRunsFormSubmit={mockOnSubmit} onResetFormClick={mockOnReset} />);
    
    const searchInput = screen.getByPlaceholderText('Tag expression');
    await userEvent.type(searchInput, 'test');

    // Fast forward to just before debounce
    jest.advanceTimersByTime(300);
    expect(mockOnSubmit).not.toHaveBeenCalled();

    // Fast forward past debounce
    jest.advanceTimersByTime(100);
    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledTimes(1);
    });
  });

  it('should submit immediately on Enter key', async () => {
    render(<RunsForm defaultValues={defaultValues} onRunsFormSubmit={mockOnSubmit} onResetFormClick={mockOnReset} />);
    
    const searchInput = screen.getByPlaceholderText('Tag expression');
    await userEvent.type(searchInput, 'test{Enter}');

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledTimes(1);
    });
  });

  it('should prevent multiple rapid submissions', async () => {
    render(<RunsForm defaultValues={defaultValues} onRunsFormSubmit={mockOnSubmit} onResetFormClick={mockOnReset} />);
    
    const searchInput = screen.getByPlaceholderText('Tag expression');
    await userEvent.type(searchInput, 'test1');
    jest.advanceTimersByTime(100);
    await userEvent.type(searchInput, 'test2');
    jest.advanceTimersByTime(100);
    await userEvent.type(searchInput, 'test3');
    jest.advanceTimersByTime(400);

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledTimes(1);
    });
  });

  it('should call onReset when reset button is clicked', async () => {
    render(<RunsForm defaultValues={defaultValues} onRunsFormSubmit={mockOnSubmit} onResetFormClick={mockOnReset} />);
    
    const resetButton = screen.getByRole('button', { 'aria-label': 'Reset form' });
    await userEvent.click(resetButton);

    expect(mockOnReset).toHaveBeenCalled();
  });
});
```

### Integration Tests

Test the complete flow:
1. Form submission with tag expression
2. URL parameter handling
3. Redux state updates
4. API cache invalidation

## Files to Modify

1. **Primary modifications**:
   - `libs/bublik/features/runs/src/lib/runs-form/runs-form.component.tsx`
   - `libs/bublik/features/runs/src/lib/runs-form/runs-form.container.tsx`

2. **Test files** (new):
   - `libs/bublik/features/runs/src/lib/runs-form/runs-form.component.spec.ts`
   - `libs/bublik/features/runs/src/lib/runs-form/runs-form.container.spec.ts`

3. **Reference files** (for patterns):
   - `libs/bublik/features/dashboard-v2/src/lib/search-bar/search-bar.component.tsx` (debounce pattern)
   - `libs/bublik/features/history/src/lib/history-global-search-form/global-search-form/global-search-form.component.tsx` (Ctrl+Enter pattern)
   - `libs/bublik/features/history/src/lib/history-global-search-form/global-search-form/global-search-form.hooks.ts` (Ctrl+Enter hook)
   - `libs/shared/hooks/src/lib/useDebounce.ts` (debounce hook)

## Implementation Order

1. **Phase 1**: Add debounced auto-submit for tag expression (core functionality)
2. **Phase 2**: Add Enter key support for immediate submit
3. **Phase 3**: Add Ctrl+Enter shortcut for entire form
4. **Phase 4**: Add auto-submit for date changes (optional, based on requirements)
5. **Phase 5**: Add safeguards to prevent excessive submissions
6. **Testing**: Implement unit and integration tests

## Implementation Checklist

### Core Functionality
- [ ] Import `useDebounce` hook in runs-form.container.tsx
- [ ] Add formMethods with `mode: 'onChange'` to container
- [ ] Watch tagExpr value and implement debounced submit effect
- [ ] Pass formMethods to RunsForm component
- [ ] Update RunsForm component to accept formMethods prop
- [ ] Update SearchBar to handle Enter key
- [ ] Create and use `useCtrlEnterSubmit` hook
- [ ] Add form ref for Ctrl+Enter hook

### Safeguards
- [ ] Add `isSubmitting` state to prevent concurrent submissions
- [ ] Implement previous value ref to prevent duplicate submissions
- [ ] Add try-finally block for submission handling

### Testing
- [ ] Create unit test file for runs-form.component
- [ ] Create unit test file for runs-form.container
- [ ] Write test for debounced submit behavior
- [ ] Write test for Enter key submit
- [ ] Write test for Ctrl+Enter submit
- [ ] Write test for preventing multiple rapid submissions
- [ ] Write test for reset functionality
- [ ] Perform manual testing

### Documentation
- [ ] Update component JSDoc comments
- [ ] Document keyboard shortcuts in code comments
- [ ] Update README if needed

## Risk Assessment

**Low Risk**: The changes are additive and follow existing patterns in the codebase.

**Potential Issues**:
1. **Excessive API calls**: Mitigated by debouncing and isSubmitting flag
2. **Form state desync**: Using formMethods from parent ensures single source of truth
3. **Keyboard shortcut conflicts**: Ctrl+Enter is not used elsewhere on the page
4. **Performance**: Debounced submit is efficient (400ms delay is standard)

**Rollback Plan**: If issues arise, can revert to previous implementation by:
- Removing formMethods prop from RunsForm
- Removing debounced effect from container
- Removing keyboard event handlers

## Dependencies

All required dependencies are already present:
- `react-hook-form` - provides form state management
- `@shared/hooks/useDebounce` - provides debouncing
- `@radix-ui/react-utils` (or similar) - provides mergeRefs

## Alternative Approaches Considered

### Alternative 1: Watch all form fields and auto-submit
**Description**: Watch all form fields (dates, runData, tagExpr) and auto-submit on any change with debounce.

**Pros**: Consistent behavior across all fields
**Cons**: May cause unwanted submissions when users are still filling out the form (e.g., selecting dates before tags)

**Decision**: Not recommended. Better to have explicit control for multi-field forms.

### Alternative 2: Only Enter key, no debounced auto-submit
**Description**: Only support Enter key for submission, no automatic submission.

**Pros**: User has full control, no unexpected submissions
**Cons**: Different from modern search UX patterns, requires extra user action

**Decision**: Use as fallback if debounced approach causes issues.

## Success Criteria

1. Users can search by typing in tag expression field with auto-submit after 400ms delay
2. Users can submit immediately by pressing Enter in the search bar
3. Users can submit from anywhere by pressing Ctrl+Enter
4. Rapid typing only triggers one submission (debounce works correctly)
5. URL parameters update correctly on submission
6. Redux state updates correctly on submission
7. API cache is invalidated correctly
8. Reset functionality still works
9. No performance degradation
10. No duplicate submissions

## References

- Similar implementation: `libs/bublik/features/dashboard-v2/src/lib/search-bar/search-bar.component.tsx`
- Ctrl+Enter pattern: `libs/bublik/features/history/src/lib/history-global-search-form/global-search-form/global-search-form.hooks.ts`
- Debounce hook: `libs/shared/hooks/src/lib/useDebounce.ts`
- Issue URL: https://github.com/ts-factory/bublik-ui/issues/315

## Additional Considerations

1. **Accessibility**: Ensure keyboard shortcuts are discoverable. Consider adding a tooltip or help text showing available shortcuts.

2. **User feedback**: Consider showing a loading indicator when form is submitting (especially for debounced submissions).

3. **Mobile support**: Test on mobile devices where Ctrl+Enter may not work as expected. Consider using a "Search" button on mobile keyboards (ensure `enterkeyhint="search"` on input).

4. **Performance monitoring**: Monitor API call frequency in production to ensure debouncing is working as expected.

5. **Analytics**: Consider tracking how users submit the form (button vs Enter vs auto-submit) to understand usage patterns.
