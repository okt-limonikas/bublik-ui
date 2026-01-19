# Issue #30: Make it possible to select and copy only one parameter in the history list

## Summary
Currently, it's only possible to select and copy all parameters in the history list by right-clicking on the parameter badges. Users want the ability to select and copy individual parameters by right-clicking on specific badge items.

## Current Implementation Analysis

### How the History List Displays Parameters

The history list uses a `BadgeList` component from `@/shared/tailwind-ui` to display parameters, tags, and verdicts. The component structure is:

1. **BadgeList Component** (`/libs/shared/tailwind-ui/src/lib/badge-list/badge-list.tsx`):
   - Renders a list of `Badge` components
   - Each badge can be clicked (left-click) to toggle its selection state
   - Handles both regular badges and env badges

2. **HistoryLinear Columns** (`/libs/bublik/features/history/src/lib/history-linear/history-linear.columns.tsx`):
   - Defines the Parameters column with a `HistoryContextMenuContainer` wrapping the entire `BadgeList`
   - The context menu provides options for all badges collectively

3. **HistoryContextMenuContainer** (`/libs/bublik/features/history/src/lib/history-context-menu/history-context-menu.container.tsx`):
   - Wraps badges with a context menu
   - Currently provides:
     - "Select [label]" - Selects/deselects all badges
     - "Copy [label]" - Copies all badges to clipboard
   - Uses Radix UI's context menu primitives

### How Current Select/Copy Functionality Works

**Left-click on badge**: 
- Triggers `onBadgeClick` handler defined in `history-linear.utils.ts`
- Toggles the badge in the global filter (adds/removes from the array)

**Right-click on badge list**:
- Opens context menu for the entire badge list
- "Select parameters" - Selects all parameters in the list
- "Copy parameters" - Copies all parameters as comma-separated string

**Current Limitations**:
- Individual badges don't have their own context menus
- Cannot right-click on a single badge to select/copy just that badge
- The context menu operates on the entire BadgeList, not individual items

## Implementation Plan

### Approach 1: Add Context Menu Wrapper to Individual Badges (RECOMMENDED)

Add a context menu to each individual badge in addition to the existing context menu for the entire list. This provides the most flexible and intuitive user experience.

#### Files to Modify

1. **`/libs/bublik/features/history/src/lib/history-context-menu/history-context-menu.container.tsx`**
   - Add support for handling individual badge context operations
   - Create new handlers: `handleSelectSingle` and `handleCopySingle`
   - Add new prop to indicate if context menu is for single badge or multiple

2. **`/libs/bublik/features/history/src/lib/history-linear/history-linear.columns.tsx`**
   - Update the Parameters column to use a new component that wraps each badge individually
   - Keep existing functionality for right-clicking on the badge list (select/copy all)

3. **Create: `/libs/bublik/features/history/src/lib/badge-with-context-menu/badge-with-context-menu.tsx`**
   - New component that wraps individual badges with a context menu
   - Provides options: "Select this [parameter/tag/verdict]", "Copy this [parameter/tag/verdict]"
   - Handles both left-click (toggle selection) and right-click (context menu)

4. **`/libs/shared/tailwind-ui/src/lib/badge-list/badge-list.tsx`** (Optional Enhancement)
   - Add optional prop to allow rendering badges with custom wrapper components
   - This enables flexible badge rendering without duplicating badge list logic

#### Code Changes Needed

##### 1. Enhanced HistoryContextMenuContainer

**File**: `/libs/bublik/features/history/src/lib/history-context-menu/history-context-menu.container.tsx`

```typescript
export interface HistoryContextMenuProps {
  children: ReactNode;
  filterKey: keyof Pick<
    HistoryGlobalFilter,
    'verdicts' | 'parameters' | 'tags'
  >;
  label: string;
  badges: BadgeListProps['badges'];
  resultType?: VerdictListProps['result'];
  isNotExpected?: VerdictListProps['isNotExpected'];
  hash?: string;
  // New prop for single badge mode
  singleBadgeValue?: string; // The value of a single badge (if menu is for one badge)
}

export const HistoryContextMenuContainer = (props: HistoryContextMenuProps) => {
  const { filterKey, label, badges, children, singleBadgeValue } = props;
  const actions = useHistoryActions();
  const globalFilter = useSelector(selectGlobalFilter);
  const [, copy] = useCopyToClipboard();

  const refresh = useHistoryRefresh();

  const applyGlobalFilter = (
    updatedGlobalFilter: Partial<HistoryGlobalFilter>
  ) => {
    actions.updateLinearGlobalFilter({
      ...globalFilter,
      ...updatedGlobalFilter
    });
    refresh({ ...globalFilter, ...updatedGlobalFilter });
  };

  // New handler for selecting a single badge
  const handleSelectSingle = () => {
    if (!singleBadgeValue) return;
    
    const currentFilterValue = globalFilter[filterKey];
    const isSelected = currentFilterValue.includes(singleBadgeValue);

    if (isSelected) {
      const newValue = currentFilterValue.filter((val) => val !== singleBadgeValue);
      applyGlobalFilter({ [filterKey]: newValue });
    } else {
      applyGlobalFilter({ [filterKey]: [...currentFilterValue, singleBadgeValue] });
    }
  };

  // New handler for copying a single badge
  const handleCopySingle = async () => {
    if (!singleBadgeValue) return;

    const isSuccess = await copy(singleBadgeValue);

    if (!isSuccess) toast.error('Failed to copy to clipboard');

    toast.success(`Copied ${label} to clipboard`);
  };

  // ... existing handlers (handleSelectAll, handleCopyAll, etc.) ...

  return (
    <ContextMenu>
      <ContextMenuTrigger>{children}</ContextMenuTrigger>
      <ContextMenuContent>
        {singleBadgeValue ? (
          // Context menu for single badge
          <>
            <ContextMenuItem
              label={`Select this ${label}`}
              onSelect={handleSelectSingle}
              icon={<Icon name="Check" size={16} />}
            />
            <ContextMenuSeparator />
            <ContextMenuItem
              label={`Copy this ${label}`}
              onSelect={handleCopySingle}
              icon={<Icon name="Paper" size={16} />}
            />
          </>
        ) : (
          // Existing context menu for all badges
          <>
            {/* ... existing menu items ... */}
            <ContextMenuItem
              label={`Select ${label}`}
              onSelect={handleSelectAll}
              icon={<Icon name="ExpandSelection" size={16} />}
            />
            <ContextMenuSeparator />
            <ContextMenuItem
              label={`Copy ${label}`}
              onSelect={handleCopyAll}
              icon={<Icon name="Paper" size={16} />}
            />
          </>
        )}
      </ContextMenuContent>
    </ContextMenu>
  );
};
```

##### 2. Create BadgeWithContextMenu Component

**File**: `/libs/bublik/features/history/src/lib/badge-with-context-menu/badge-with-context-menu.tsx`

```typescript
import { ReactNode } from 'react';
import { HistoryContextMenuContainer } from '../history-context-menu';
import { BadgeListItem } from '@/shared/tailwind-ui';

export interface BadgeWithContextMenuProps {
  children: ReactNode;
  badge: BadgeListItem;
  filterKey: 'verdicts' | 'parameters' | 'tags';
  label: string;
}

export const BadgeWithContextMenu = ({
  children,
  badge,
  filterKey,
  label
}: BadgeWithContextMenuProps) => {
  return (
    <HistoryContextMenuContainer
      filterKey={filterKey}
      label={label}
      badges={[badge]}
      singleBadgeValue={badge.payload}
    >
      {children}
    </HistoryContextMenuContainer>
  );
};
```

##### 3. Update BadgeList Component (Optional Enhancement)

**File**: `/libs/shared/tailwind-ui/src/lib/badge-list/badge-list.tsx`

```typescript
export interface BadgeListProps {
  badges: BadgeListItem[];
  onBadgeClick?: (badge: BadgeListItem) => void;
  selectedBadges?: string[];
  className?: string;
  // New prop for custom badge wrapper
  badgeWrapper?: (badge: BadgeListItem, children: ReactNode) => ReactNode;
}

export const BadgeList = forwardRef<HTMLDivElement, BadgeListProps>(
  ({ badges, selectedBadges, onBadgeClick, className, badgeWrapper }, ref) => {
    const { filterBadges, envBadges } = useMemo(() => {
      const filterBadges = badges.filter((badge) => !isEnv(badge.payload));
      const envBadges = badges.filter((badge) => isEnv(badge.payload));

      return { filterBadges, envBadges };
    }, [badges]);

    const badgeNodes = filterBadges.map((badge, idx) => {
      const isSelected = selectedBadges?.includes(badge.payload);
      const finalClass = badge.isImportant
        ? 'bg-badge-6'
        : className
        ? className
        : 'bg-badge-0';

      let value = badge.payload;
      if (isRevision(badge.payload)) value = trimRevision(badge.payload);
      if (isBranch(badge.payload)) value = trimBranch(badge.payload);

      const badgeElement = (
        <Badge
          key={idx}
          onClick={onBadgeClick ? () => onBadgeClick?.(badge) : undefined}
          className={finalClass}
          isSelected={isSelected}
          overflowWrap
        >
          {value}
        </Badge>
      );

      // Apply custom wrapper if provided
      return badgeWrapper ? badgeWrapper(badge, badgeElement) : badgeElement;
    });

    const envBadgeNodes = envBadges.map((envBadge, idx) => {
      const envBadgeElement = (
        <EnvBadge
          key={idx}
          value={envBadge.payload}
          onContentClick={
            onBadgeClick ? () => onBadgeClick?.(envBadge) : undefined
          }
          isSelected={selectedBadges?.includes(envBadge.payload)}
        />
      );

      return badgeWrapper ? badgeWrapper(envBadge, envBadgeElement) : envBadgeElement;
    });

    // ... rest of the component remains the same ...
  }
);
```

##### 4. Update HistoryLinear Columns

**File**: `/libs/bublik/features/history/src/lib/history-linear/history-linear.columns.tsx`

```typescript
import { BadgeWithContextMenu } from '../badge-with-context-menu';

// Update the Parameters column
{
  id: HistoryLinearColumns.Parameters,
  header: 'Parameters',
  accessorFn: (data) => data.parameters.map((param) => ({ payload: param })),
  cell: (cell) => {
    const parameters = cell.getValue<BadgeListItem[]>();

    return (
      <HistoryContextMenuContainer
        badges={parameters}
        label="parameters"
        filterKey="parameters"
      >
        <BadgeList
          badges={parameters}
          selectedBadges={cell.table.getState().globalFilter['parameters']}
          onBadgeClick={onBadgeClick(cell, 'parameters')}
          className="bg-badge-1"
          // Add wrapper for individual badge context menus
          badgeWrapper={(badge, children) => (
            <BadgeWithContextMenu
              badge={badge}
              filterKey="parameters"
              label="parameter"
            >
              {children}
            </BadgeWithContextMenu>
          )}
        />
      </HistoryContextMenuContainer>
    );
  }
}

// Similarly update Metadata and Tags columns if needed
```

#### Implementation Approach

1. **Phase 1: Core Infrastructure**
   - Modify `HistoryContextMenuContainer` to support single badge mode
   - Add `handleSelectSingle` and `handleCopySingle` handlers
   - Create `BadgeWithContextMenu` component

2. **Phase 2: UI Integration**
   - Update `BadgeList` to support custom badge wrapper (optional enhancement)
   - Update history-linear columns to use individual badge context menus
   - Test left-click and right-click interactions

3. **Phase 3: Additional Features**
   - Apply same pattern to Tags and Verdicts columns
   - Consider adding keyboard shortcuts (Ctrl+Click for select, Ctrl+C for copy)

4. **Phase 4: Testing**
   - Add unit tests for new components
   - Add integration tests for selection/copy functionality
   - Update existing tests as needed

### Alternative Approach 2: Modify BadgeList Directly

Instead of creating a wrapper component, modify `BadgeList` to include a context menu on each badge.

**Pros**:
- Fewer components to maintain
- Simpler component tree

**Cons**:
- Mixes concerns (badge rendering and context menu logic)
- BadgeList becomes specific to history feature
- Less reusable

This approach is not recommended as it violates single responsibility principle and reduces reusability of the BadgeList component.

### Alternative Approach 3: Use Radix UI Context Menu on Badge Directly

Use Radix UI's context menu primitives directly on each Badge without creating a wrapper component.

**Pros**:
- Most direct implementation
- No new components needed

**Cons**:
- Duplicates context menu logic in multiple places
- Harder to maintain and update context menu behavior
- More boilerplate code in column definitions

This approach is not recommended due to code duplication and maintenance burden.

## Testing Plan

### Unit Tests

1. **`badge-with-context-menu.spec.tsx`** (New file)
   - Test that component renders badge correctly
   - Test that context menu opens on right-click
   - Test "Select this [label]" menu item
   - Test "Copy this [label]" menu item

2. **`history-context-menu.container.spec.tsx`** (Update existing)
   - Add tests for single badge mode
   - Test `handleSelectSingle` toggles selection
   - Test `handleCopySingle` copies correct value

3. **`badge-list.spec.tsx`** (Update existing)
   - Test badge wrapper functionality (if implemented)
   - Ensure existing functionality still works

### Integration Tests

1. **History Linear View Tests**
   - Test right-clicking on individual parameter badge shows context menu
   - Test selecting single parameter via context menu updates global filter
   - Test copying single parameter via context menu copies correct value
   - Test left-click still toggles selection
   - Test right-clicking on badge list (empty space) still shows "Select/Copy all" menu

### Snapshot Tests

1. Update snapshots for modified components
2. Ensure UI changes are minimal and intentional

## Edge Cases to Consider

1. **Env Badges**: Ensure env badges also have context menus
2. **Important Badges**: Ensure important badges work correctly with context menus
3. **Empty Badge Lists**: Handle edge case of empty parameter/tag lists
4. **Long Badge Names**: Ensure context menu works with very long badge names
5. **Special Characters**: Test badges with special characters in names
6. **Selection State**: Ensure visual selection state is correct after context menu operations
7. **Multiple Badges**: Test with many badges in a list

## Migration Strategy

1. This is a new feature, not a breaking change
2. Existing functionality (select/copy all) remains unchanged
3. Left-click behavior remains unchanged
4. Only adds new right-click context menu on individual badges

## Future Enhancements

1. Add keyboard shortcuts (Ctrl+Click to select, Ctrl+C to copy selected)
2. Add ability to select range of badges (Shift+Click)
3. Add visual indicator for badges with context menus
4. Allow customization of context menu items per badge type
5. Add undo functionality for selection changes

## Success Criteria

- Users can right-click on individual parameter badges
- Context menu appears with "Select this parameter" and "Copy this parameter" options
- Selecting this parameter adds it to the global filter (like left-click does)
- Copying this parameter copies just that parameter value
- Existing functionality (select/copy all) still works
- UI remains responsive and intuitive
- All tests pass
- No performance degradation

## Files Summary

### Files to Create:
1. `/libs/bublik/features/history/src/lib/badge-with-context-menu/badge-with-context-menu.tsx`
2. `/libs/bublik/features/history/src/lib/badge-with-context-menu/index.ts`
3. `/libs/bublik/features/history/src/lib/badge-with-context-menu/badge-with-context-menu.spec.tsx`

### Files to Modify:
1. `/libs/bublik/features/history/src/lib/history-context-menu/history-context-menu.container.tsx`
2. `/libs/bublik/features/history/src/lib/history-linear/history-linear.columns.tsx`
3. `/libs/shared/tailwind-ui/src/lib/badge-list/badge-list.tsx` (Optional enhancement)
4. `/libs/bublik/features/history/src/lib/history-context-menu/index.ts` (Export new types if needed)

### Tests to Add:
1. Unit tests for BadgeWithContextMenu component
2. Tests for single badge mode in HistoryContextMenuContainer
3. Integration tests for the overall functionality

### Tests to Update:
1. BadgeList tests (if badge wrapper prop is added)
2. HistoryContextMenu tests (for new functionality)

## Implementation Timeline Estimate

- Phase 1 (Core Infrastructure): 2-3 hours
- Phase 2 (UI Integration): 2-3 hours
- Phase 3 (Additional Features): 1-2 hours
- Phase 4 (Testing): 2-3 hours

**Total Estimated Time**: 7-11 hours

## Related Components and Files

**UI Components**:
- `/libs/shared/tailwind-ui/src/lib/badge-list/badge-list.tsx`
- `/libs/shared/tailwind-ui/src/lib/context-menu/context-menu.tsx`
- `/libs/shared/tailwind-ui/src/lib/badge/badge.tsx`
- `/libs/shared/tailwind-ui/src/lib/env-badge/env-badge.tsx`

**History Feature**:
- `/libs/bublik/features/history/src/lib/history-linear/history-linear.columns.tsx`
- `/libs/bublik/features/history/src/lib/history-context-menu/history-context-menu.container.tsx`
- `/libs/bublik/features/history/src/lib/slice/history-slice.ts`
- `/libs/bublik/features/history/src/lib/slice/history-slice.types.ts`
- `/libs/bublik/features/history/src/lib/history-linear/history-linear.utils.ts`

**Types**:
- `/libs/shared/types/` (Check for relevant type definitions)
