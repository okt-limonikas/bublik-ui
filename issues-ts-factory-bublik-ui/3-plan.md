# Plan to Fix Issue #3: Propagate diff changes to parent rows

## Issue Summary

When a package node is not changed in any way but somewhere deep in nested children there's a change, the parent node doesn't have the correct diff-type. Changes deep in the tree should be propagated to all parent packages.

## Root Cause Analysis

The issue is located in the `computeDiff` function in:
- **File**: `libs/bublik/features/run-diff/src/lib/run-diff/run-diff.utils.ts`
- **Lines 97-124**: The current diff calculation logic

### Current Behavior

The `computeDiff` function:
1. Merges left and right trees into a single merged tree
2. Iterates through each node and sets its `diffType` based on:
   - If node exists only in left: `DiffType.REMOVED`
   - If node exists only in right: `DiffType.ADDED`
   - If node exists in both: Checks if calculated stats are equal
     - If equal: `DiffType.DEFAULT`
     - If not equal: `DiffType.CHANGED`

### The Problem

When a node exists on both sides and has equal calculated stats (e.g., same counts), it gets marked as `DEFAULT`, even if some of its children have changes. This means parent nodes don't reflect changes deep in the tree.

Example:
```
Package A (counts unchanged, children changed) → marked as DEFAULT
  └── Package B (counts unchanged, children changed) → marked as DEFAULT
      └── Test X (counts changed) → marked as CHANGED
```

In this case, both Package A and Package B should be marked as `CHANGED` because Test X is changed.

## Solution

Add a second pass through the merged tree to propagate changes from children to parents using a bottom-up traversal approach.

### Implementation Details

#### Files to Modify

1. **Primary file**: `libs/bublik/features/run-diff/src/lib/run-diff/run-diff.utils.ts`

#### Code Changes Needed

##### Change 1: Add helper function to check if any child has changes

Add a new function after the `mergeTrees` function (around line 31):

```typescript
/**
 * Propagates diffType changes from children to parent nodes.
 * If any child has a non-DEFAULT diffType, the parent will be marked as CHANGED.
 */
export const propagateChangesToParents = <T extends { children: T[]; diffType: DiffType }>(
  node: T
) => {
  // Process children first (post-order traversal)
  node.children.forEach(child => propagateChangesToParents(child));

  // Check if any child has a non-DEFAULT diffType
  const hasChangedChildren = node.children.some(
    child => child.diffType !== DiffType.DEFAULT
  );

  // If node already has a non-DEFAULT diffType, keep it
  // Otherwise, if any child is changed, mark parent as CHANGED
  if (hasChangedChildren && node.diffType === DiffType.DEFAULT) {
    node.diffType = DiffType.CHANGED;
  }
};
```

##### Change 2: Call the propagation function in computeDiff

Add the call to `propagateChangesToParents` after the diff calculation step, before the cleanup step.

Replace line 124 with:

```typescript
  });

  // 4. Propagate changes from children to parents
  propagateChangesToParents(mergedTree[0]);

  // 5. Cleanup not needed props
```

The rest of the code remains the same, just updating the comment numbering.

#### Implementation Approach

1. **Bottom-up traversal**: The `propagateChangesToParents` function uses post-order traversal (children first, then parent) to ensure that child diffTypes are finalized before checking them.

2. **Change propagation logic**: 
   - For each node, check if any of its children have `diffType !== DiffType.DEFAULT`
   - If true and the parent's diffType is `DEFAULT`, mark it as `CHANGED`
   - Preserve existing `ADDED`, `REMOVED`, or `CHANGED` types

3. **Non-destructive**: The function only changes `DEFAULT` to `CHANGED`, preserving existing change types that were set based on direct comparisons.

## Testing Strategy

### Create Unit Tests

Create a new test file: `libs/bublik/features/run-diff/src/lib/run-diff/run-diff.utils.spec.ts`

#### Test Cases to Implement

1. **Test: Single level parent-child relationship**
   - Parent with unchanged stats
   - Child with changed stats
   - Expected: Parent marked as CHANGED

2. **Test: Multi-level nested changes**
   - Grandparent with unchanged stats
   - Parent with unchanged stats
   - Child with changed stats
   - Expected: Both grandparent and parent marked as CHANGED

3. **Test: Multiple changed children**
   - Parent with unchanged stats
   - Multiple children with different change types (ADDED, REMOVED, CHANGED)
   - Expected: Parent marked as CHANGED

4. **Test: No changes in children**
   - Parent with unchanged stats
   - All children with unchanged stats
   - Expected: Parent remains DEFAULT

5. **Test: Parent already has direct changes**
   - Parent with changed stats (already CHANGED)
   - Children with changes
   - Expected: Parent remains CHANGED (no override)

6. **Test: Mixed hierarchy**
   - Deep tree with multiple branches
   - Changes in different levels
   - Expected: All ancestors of changed nodes marked as CHANGED

### Test Data Structure

```typescript
const createMockRunData = (name: string, type: string, children: any[] = []) => ({
  name,
  type,
  children,
  result_id: 'test-id',
  exec_seqno: 1,
  // ... other required fields
});
```

### Update Storybook Stories

Update `libs/bublik/features/run-diff/src/lib/run-diff/run-diff.stories.tsx` to add:

1. **NestedChanges story**: Demonstrates a scenario where deep changes are propagated to parents
2. **ComplexHierarchy story**: Shows mixed change types at different levels

## Expected Behavior After Fix

### Before Fix
```
Package Root (DEFAULT)
  ├── Package A (DEFAULT)
  │   └── Test X (CHANGED) ✓
  └── Package B (DEFAULT)
      └── Package C (DEFAULT)
          └── Test Y (ADDED) ✓
```

### After Fix
```
Package Root (CHANGED) ✓
  ├── Package A (CHANGED) ✓
  │   └── Test X (CHANGED) ✓
  └── Package B (CHANGED) ✓
      └── Package C (CHANGED) ✓
          └── Test Y (ADDED) ✓
```

All ancestors of changed nodes are now correctly marked with the appropriate diff type.

## Implementation Checklist

- [ ] Add `propagateChangesToParents` function to `run-diff.utils.ts`
- [ ] Call `propagateChangesToParents` in `computeDiff` after diff calculation
- [ ] Update comment numbering in `computeDiff` function
- [ ] Create unit test file `run-diff.utils.spec.ts`
- [ ] Implement unit tests for all scenarios
- [ ] Update Storybook stories to demonstrate the fix
- [ ] Run existing tests to ensure no regressions
- [ ] Verify visual output in Storybook
- [ ] Update inline TODO comment at line 106 to reference this fix

## Risk Assessment

**Low Risk**: The change is localized to a single function and only adds a post-processing step. It does not modify the core diff calculation logic.

**Potential Edge Cases**:
- Empty trees (handled: function returns without action)
- Single node trees (handled: no children to check)
- Nodes with already set change types (handled: preserved)

## Performance Considerations

The additional tree traversal adds O(n) time complexity where n is the number of nodes in the tree. This is acceptable as:
1. The existing diff calculation already traverses the tree multiple times
2. Tree sizes are typically small (thousands of nodes at most)
3. The post-order traversal is efficient and uses recursion with minimal overhead

## References

- Original TODO comment at line 106: `// 2. TODO: Handle change detection when counts not changed but one of children changed #384`
- Issue URL: https://github.com/ts-factory/bublik-ui/issues/3
