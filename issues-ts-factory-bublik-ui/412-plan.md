# Plan for Issue #412: Fix usability around "parameters diff" and filters on the run page

## Overview

This plan addresses two usability issues on the run page:

1. **Toolbar visibility**: The top bar (toolbar) is hidden when no filters are applied, making filtering functionality less discoverable
2. **Badge filtering in diff mode**: Clicking on badges while in diff mode shows a vague warning message

---

## Issue 1: Don't hide top bar when no filters applied

### Root Cause Analysis

The toolbar visibility is controlled in `result-table.component.tsx` (line 120):

```typescript
const hasToolbar = showToolbar || hasFilters || isDiffMode;
```

The toolbar is conditionally rendered (line 164):

```tsx
{hasToolbar ? (
  <div className={...}>...</div>
) : null}
```

**Current behavior**: The toolbar is hidden when:
- `showToolbar` is false (user hasn't manually toggled it)
- `hasFilters` is false (no filters applied)
- `isDiffMode` is false (not in diff mode)

**Problem**: Users may not discover the filtering functionality because the toolbar is hidden by default when no filters are active.

### Files to Modify

- `/Users/limonikas/workspace/bublik-home/bublik-docker/bublik-ui/libs/bublik/features/run/src/lib/result-table/result-table.component.tsx`

### Implementation Approach

**Option A: Always show the toolbar (Recommended)**
- Remove the `hasFilters` condition from the `hasToolbar` logic
- This ensures the toolbar is always visible, making filtering features discoverable
- Users can still toggle it manually if needed

**Option B: Keep `showToolbar` default to true**
- Change the default behavior so `showToolbar` is true by default
- This would require modifying the state management logic

**Recommended**: Option A - Always show the toolbar as it's less intrusive and provides better UX.

### Code Changes

#### File: `result-table.component.tsx`

**Change 1: Remove `hasFilters` from toolbar visibility logic**

```typescript
// Line 120: Current
const hasToolbar = showToolbar || hasFilters || isDiffMode;

// Change to:
const hasToolbar = showToolbar || isDiffMode;
```

**Rationale**: This ensures the toolbar is always visible (when `showToolbar` is true or in diff mode), regardless of whether filters are applied. The `showToolbar` toggle still allows users to hide it if desired.

### Impact

- **Positive**: Users can always see filtering options, improving discoverability
- **Minimal**: The toolbar height is relatively small (h-9, 36px), so it won't take up much screen space
- **User Experience**: Consistent - users always have access to filtering capabilities

---

## Issue 2: Allow filtering by clicking on badges? Or add better warning?

### Root Cause Analysis

Badges are already clickable and support filtering:
- **Parameters badges** (`result-table.columns.tsx` lines 448-471): Click to filter by parameter
- **Artifacts badges** (`result-table.columns.tsx` lines 378-400): Click to filter by artifact
- **Requirements badges** (`result-table.columns.tsx` lines 407-439): Click to filter by requirement
- **Verdict badges** (`result-table.columns.tsx` lines 179-192): Click to filter by verdict

However, when in diff mode (`mode === 'diff'`), clicking on badges triggers a warning:

```typescript
// Line 39-41
function diffModeWarning() {
  toast.warning('Parameters diff mode is enabled. Filters are disabled.');
}
```

**Problem**: The warning message is vague and doesn't explain:
1. Why filters are disabled in diff mode
2. How to exit diff mode to enable filters
3. What diff mode is used for

### Files to Modify

- `/Users/limonikas/workspace/bublik-home/bublik-docker/bublik-ui/libs/bublik/features/run/src/lib/result-table/result-table.columns.tsx`

### Implementation Approach

**Improve the warning message** to be more informative:
- Explain why filters are disabled (incompatible with diff mode)
- Provide actionable guidance (how to exit diff mode)
- Optionally, provide a direct action to exit diff mode from the toast

### Code Changes

#### File: `result-table.columns.tsx`

**Change 1: Improve the `diffModeWarning()` function**

```typescript
// Lines 39-41: Current
function diffModeWarning() {
  toast.warning('Parameters diff mode is enabled. Filters are disabled.');
}

// Change to:
function diffModeWarning() {
  toast.warning(
    'Filters are disabled in Parameters Compare mode. Click the "Parameters Compare" button in the toolbar to exit and enable filtering.',
    { duration: 6000 }
  );
}
```

**Rationale**: 
- Provides clear explanation of why filters don't work
- Gives actionable guidance on how to enable filters
- Increased duration gives users more time to read the message

**Optional Enhancement**: Add a dismiss button or action button to the toast

```typescript
function diffModeWarning() {
  toast.warning(
    'Filters are disabled in Parameters Compare mode. To enable filtering, exit Parameters Compare mode from the toolbar.',
    {
      duration: 8000,
      action: {
        label: 'Learn More',
        onClick: () => {
          // Could open help dialog or navigate to documentation
          // For now, just dismiss the toast
        }
      }
    }
  );
}
```

### Alternative Approach: Enable Filtering in Diff Mode

If filtering should be allowed in diff mode (pending design discussion), additional changes would be needed:

1. Remove the `diffModeWarning()` check from all badge click handlers (lines 135-138, 157-160, 263-266, 305-308, 336-339)
2. Test that filtering works correctly in diff mode
3. Ensure diff highlighting still works with filters applied

**Note**: This alternative requires design approval as it changes the current behavior where diff mode disables filtering for clarity.

### Impact

- **Positive**: Users get clearer guidance when trying to filter in diff mode
- **User Experience**: Reduced confusion about why filters don't work in certain modes
- **Backward Compatible**: The behavior remains the same (filters disabled in diff mode), but the messaging is improved

---

## Testing Strategy

### Tests to Add or Update

#### 1. Test Toolbar Visibility

Create/update tests for `result-table.component.tsx`:

```typescript
// Test: Toolbar should be visible by default
test('should show toolbar even without filters', () => {
  const { container } = render(<ResultTable {...props} showToolbar={true} />);
  expect(screen.getByText('Artifacts')).toBeInTheDocument();
  expect(screen.getByText('Verdicts')).toBeInTheDocument();
  expect(screen.getByText('Parameters')).toBeInTheDocument();
});

// Test: Toolbar should respect showToolbar toggle
test('should hide toolbar when showToolbar is false and not in diff mode', () => {
  const { container } = render(<ResultTable {...props} showToolbar={false} mode="default" />);
  expect(screen.queryByText('Artifacts')).not.toBeInTheDocument();
});

// Test: Toolbar should always show in diff mode
test('should show toolbar in diff mode regardless of showToolbar', () => {
  const { container } = render(<ResultTable {...props} showToolbar={false} mode="diff" />);
  expect(screen.getByText('Parameters Compare')).toBeInTheDocument();
});
```

#### 2. Test Badge Filtering in Diff Mode

Create tests for `result-table.columns.tsx`:

```typescript
// Test: Clicking badge in diff mode shows improved warning
test('should show descriptive warning when clicking badge in diff mode', () => {
  render(<ResultTable {...props} mode="diff" />);
  
  const parameterBadge = screen.getByText('some-parameter');
  fireEvent.click(parameterBadge);
  
  expect(toast.warning).toHaveBeenCalledWith(
    expect.stringContaining('Parameters Compare mode')
  );
});

// Test: Warning message includes actionable guidance
test('warning message should explain how to enable filters', () => {
  render(<ResultTable {...props} mode="diff" />);
  
  const artifactBadge = screen.getByText('some-artifact');
  fireEvent.click(artifactBadge);
  
  const warningCall = toast.warning.mock.calls[0][0];
  expect(warningCall).toContain('Parameters Compare button');
  expect(warningCall).toContain('toolbar');
});
```

### Manual Testing Checklist

- [ ] Verify toolbar is visible on page load (no filters applied)
- [ ] Verify toolbar stays visible after applying and clearing filters
- [ ] Verify toolbar can still be hidden via "Hide" button
- [ ] Verify toolbar is always visible in diff mode
- [ ] Verify clicking on badges shows improved warning message in diff mode
- [ ] Verify warning message is readable and actionable
- [ ] Verify filtering works correctly when not in diff mode
- [ ] Verify badge clicks in diff mode do not apply filters

---

## Migration Notes

No data migration required. Changes are purely frontend UI/UX improvements.

### URL State Preservation

The current implementation uses query params to persist state:
- `columnFilters`: Stores active filters
- `globalRequirements`: Stores global requirements filter
- `rowState`: Stores row-specific state including `showToolbar`

These changes maintain compatibility with existing URL states.

---

## Performance Considerations

- **Toolbar visibility**: Minimal impact. The toolbar is a simple flex container with buttons.
- **Toast messages**: No performance impact. Toasts are short-lived and non-blocking.
- **Badge clicks**: No change in performance. The same click handlers are used with improved messaging.

---

## Accessibility Considerations

- **Toolbar visibility**: Always-visible toolbar is more accessible as features are discoverable
- **Warning messages**: Improved clarity helps screen reader users understand the situation
- **Badge interactions**: Existing `onClick` handlers and button elements maintain accessibility

---

## Rollout Plan

1. **Phase 1**: Implement toolbar visibility change (Issue #1)
   - Modify `result-table.component.tsx`
   - Add/update tests
   - Manual testing

2. **Phase 2**: Improve warning messages (Issue #2)
   - Modify `result-table.columns.tsx`
   - Add/update tests
   - Manual testing

3. **Phase 3**: Documentation updates (if needed)
   - Update any user guides mentioning the toolbar behavior
   - Document the new warning message behavior

---

## Acceptance Criteria

### Issue #1: Toolbar Visibility
- [ ] Toolbar is visible when no filters are applied
- [ ] Toolbar can still be manually hidden via "Hide" button
- [ ] Toolbar is always visible in diff mode
- [ ] Toggle button (Expose/Hide) works correctly in all states

### Issue #2: Improved Warning Message
- [ ] Warning message clearly states why filters are disabled in diff mode
- [ ] Warning message provides actionable guidance
- [ ] Warning message is easy to understand
- [ ] No filters are applied when clicking badges in diff mode (behavior unchanged)

---

## Open Questions

1. Should we also consider making the RunTable toolbar (in `run-table.component.tsx`) more discoverable?
   - It's always visible, but the GlobalRequirementsFilter might benefit from better UX

2. Should the toolbar be collapsible/expandable with animation?
   - Current implementation is instant toggle
   - Could add smooth transition for better UX

3. Should we consider adding tooltips to explain filtering badges?
   - Current badges have visual feedback (color change when selected)
   - Tooltips could further clarify the functionality

---

## Related Issues

- Issue #416: Filter series charts by clicking on name (similar filtering enhancement)
- Issue #315: Add auto-submit click search on runs page (filtering UX)

---

## References

- Component: `ResultTable` - `libs/bublik/features/run/src/lib/result-table/result-table.component.tsx`
- Component: `ResultTableColumns` - `libs/bublik/features/run/src/lib/result-table/result-table.columns.tsx`
- Component: `Badge` - `libs/shared/tailwind-ui/src/lib/badge/badge.tsx`
- Component: `VerdictList` - `libs/shared/tailwind-ui/src/lib/verdict-list/verdict-list.tsx`
