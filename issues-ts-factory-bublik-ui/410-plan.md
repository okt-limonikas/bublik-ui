# Plan for Issue #410: Reset Modified State When Navigating to Another Config

## Overview

This document outlines the plan to fix Issue #410, which addresses the problem where unsaved modifications to a configuration are preserved when navigating between different configs. Users expect that navigating away from a config should discard unsaved changes.

## Root Cause Analysis

### Current Behavior

1. **Config Navigation Mechanism**
   - Configs are navigated using the `configId` URL query parameter
   - When a user clicks on a config in the sidebar, `setConfigId` updates the URL
   - The `ConfigsEditorContainer` component is re-rendered with the new `configId` as a key

2. **Modified State Tracking**
   - The `useSavedState` hook stores form modifications in sessionStorage
   - Storage key is based on `config.id` (as a string): `useSavedState(config.id.toString())`
   - When form values change, they're saved to sessionStorage via `useEffect`
   - Form initializes with saved values if they exist

3. **The Problem**
   - User modifies Config A (but doesn't save)
   - User navigates to Config B
   - Modifications for Config A remain in sessionStorage
   - User navigates back to Config A
   - Unsaved modifications are restored, showing the "MODIFIED" badge
   - **Expected behavior:** Modifications should be discarded when navigating away from a config

### Code Flow

```
User modifies Config A
  ↓
form.watch() detects changes
  ↓
useEffect saves to sessionStorage (key: "123" for config ID 123)
  ↓
User clicks Config B in sidebar
  ↓
setConfigId(456) updates URL
  ↓
ConfigsEditorContainer re-mounts with key={456}
  ↓
SessionStorage for config 123 still contains modifications
  ↓
User navigates back to Config A
  ↓
Form loads saved state from sessionStorage
  ↓
MODIFIED badge shows (unexpected!)
```

## Proposed Solution

### Approach

Add logic to clear the modified state for a config when navigating away from it. This should happen in the `ConfigsPage` component, where we can track changes to the `configId` parameter.

### Implementation Strategy

1. Track the previous `configId` using `useRef`
2. Add a `useEffect` that watches for changes to `configId`
3. When `configId` changes, clear the sessionStorage for the previous config
4. Use `sessionStorage.removeItem()` to remove the saved state

## Files to Modify

### 1. `/Users/limonikas/workspace/bublik-home/bublik-docker/bublik-ui/apps/bublik/src/pages/configs/configs.page.tsx`

**Current Code:**
```typescript
function ConfigsPage() {
	const { configId, newConfigParams } = useConfigPageSearchParams();
	const { isAdmin } = useAuth();

	return (
		<div className="p-2 h-full flex gap-1">
			<div className="bg-white rounded-md h-full w-[320px] overflow-hidden">
				<ConfigsSidebarContainer
					createProjectButton={...}
				/>
			</div>
			<div className="bg-white rounded-md h-full overflow-hidden flex-1">
				{configId ? (
					<ConfigsEditorContainer key={configId} configId={configId} />
				) : (
					<CreateNewConfigScreen key={JSON.stringify(newConfigParams)} />
				)}
			</div>
		</div>
	);
}
```

**Modified Code:**
```typescript
import { useEffect, useRef } from 'react';

function ConfigsPage() {
	const { configId, newConfigParams } = useConfigPageSearchParams();
	const { isAdmin } = useAuth();
	const previousConfigId = useRef<number | null>(null);

	// Clear saved state when navigating away from a config
	useEffect(() => {
		// If there was a previous config and we're navigating to a different one
		if (previousConfigId.current !== null && 
			previousConfigId.current !== configId) {
			// Clear the saved state for the previous config
			sessionStorage.removeItem(String(previousConfigId.current));
		}
		
		// Update the ref for next render
		previousConfigId.current = configId;
	}, [configId]);

	return (
		<div className="p-2 h-full flex gap-1">
			<div className="bg-white rounded-md h-full w-[320px] overflow-hidden">
				<ConfigsSidebarContainer
					createProjectButton={...}
				/>
			</div>
			<div className="bg-white rounded-md h-full overflow-hidden flex-1">
				{configId ? (
					<ConfigsEditorContainer key={configId} configId={configId} />
				) : (
					<CreateNewConfigScreen key={JSON.stringify(newConfigParams)} />
				)}
			</div>
		</div>
	);
}
```

## Implementation Steps

1. **Step 1:** Add necessary imports to `configs.page.tsx`
   - Import `useEffect` and `useRef` from 'react'

2. **Step 2:** Create a ref to track the previous `configId`
   - `const previousConfigId = useRef<number | null>(null);`

3. **Step 3:** Add a `useEffect` to clear saved state on navigation
   - Watch for changes to `configId`
   - Clear sessionStorage for previous config ID when navigating to a different one
   - Update the ref with the current config ID

4. **Step 4:** Test the implementation
   - Modify a config but don't save
   - Navigate to a different config
   - Navigate back to the original config
   - Verify that the MODIFIED badge is not shown

## Alternative Approaches Considered

### Option 1: Add Confirmation Dialog (Rejected)
**Pros:**
- More explicit user control
- Users can choose to save or discard changes

**Cons:**
- More invasive change
- Could disrupt user workflow
- Requires additional UI components
- More complex implementation

### Option 2: Clear State in ConfigEditorForm (Rejected)
**Pros:**
- More localized change
- Clearer separation of concerns

**Cons:**
- Would require passing previous config ID as prop
- Component already has complex state management
- Less ideal location for navigation logic

### Option 3: Create Custom Hook (Rejected)
**Pros:**
- Reusable logic
- Can be tested independently

**Cons:**
- Over-engineering for this use case
- Adds unnecessary abstraction
- Simple solution is sufficient

## Testing Strategy

### Manual Testing Scenarios

1. **Scenario 1: Navigate between configs without saving**
   - Modify Config A (e.g., change name or content)
   - Verify MODIFIED badge appears
   - Navigate to Config B
   - Verify no MODIFIED badge on Config B
   - Navigate back to Config A
   - Verify NO MODIFIED badge on Config A ✓

2. **Scenario 2: Save changes, then navigate**
   - Modify Config A
   - Click Update button and save
   - Verify MODIFIED badge disappears
   - Navigate to Config B
   - Navigate back to Config A
   - Verify NO MODIFIED badge on Config A ✓

3. **Scenario 3: Navigate to "Create New Config"**
   - Modify Config A
   - Click "Create New Config" button
   - Verify form is empty/new
   - Navigate back to Config A
   - Verify NO MODIFIED badge on Config A ✓

4. **Scenario 4: Refresh page after modification**
   - Modify Config A
   - Refresh the page
   - Verify MODIFIED badge still appears (this is expected behavior)
   - Navigate to Config B
   - Navigate back to Config A
   - Verify MODIFIED badge appears (this is expected - refresh doesn't count as navigation)

### Automated Testing

While no automated tests exist for this feature currently, consider adding:

```typescript
// In configs.page.test.ts (to be created)
describe('ConfigsPage', () => {
  it('should clear saved state when navigating to a different config', () => {
    // Mock sessionStorage
    // Simulate navigation between configs
    // Verify sessionStorage.removeItem is called
  });
});
```

## Edge Cases

1. **Config ID is null**
   - When navigating from a config to the "Create New Config" screen
   - Handled: The check `previousConfigId.current !== null` ensures we only clear when there was a previous config

2. **Navigating to the same config**
   - Rare case, but could happen if user manually edits URL
   - Handled: The check `previousConfigId.current !== configId` ensures we only clear when navigating to a *different* config

3. **Component unmount**
   - If user navigates away from the configs page entirely
   - Handled: The `useSavedState` hook already handles unmount with `useUnmount` hook, saving state at that time. Our logic is specifically for navigation *within* the configs page.

4. **Multiple rapid navigations**
   - User quickly clicks between several configs
   - Handled: The `useEffect` runs on each render, ensuring we always clean up the previous state before loading the new one

## Backward Compatibility

This change maintains backward compatibility:

- No changes to API or component props
- Existing functionality (saving, updating, activating, deleting configs) is unchanged
- Only affects the behavior of unsaved modifications when navigating
- Improves user experience without breaking existing workflows

## Related Issues

This fix is related to:
- Issue #319: "Changing configs should drop all caches"
  - Both issues involve cleaning up state when switching configs
  - Issue #319 appears to be about RTK Query cache invalidation
  - This fix (Issue #410) is about sessionStorage cleanup for unsaved form modifications

## Timeline

1. Implementation: 1-2 hours
   - Code changes to `configs.page.tsx`
   - Simple and straightforward

2. Testing: 1 hour
   - Manual testing scenarios
   - Edge case verification

3. Review and refinement: 1 hour
   - Code review
   - Addressing any feedback

**Total estimated effort:** 3-4 hours

## Summary

The proposed solution is simple, targeted, and effective:
- Add a `useEffect` to `ConfigsPage` that clears sessionStorage for the previous config when navigating to a different config
- This ensures unsaved modifications are discarded when users navigate between configs
- The implementation is minimal (adding ~10 lines of code)
- No breaking changes or API modifications
- Improves user experience by matching user expectations
