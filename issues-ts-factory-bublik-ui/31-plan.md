# Implementation Plan for Issue #31: An inconvenient form of editing parameters in the history

## Issue Summary
The form for editing parameters (badges) is small and disappears if you move the cursor. This is because the editing interface uses a HoverCard component that closes when the cursor leaves the trigger area, making it difficult to edit badge values.

## Root Cause Analysis

### Location of the Issue
The problem is located in the BadgeInput component's EditPopover:
- **File:** `/Users/limonikas/workspace/bublik-home/bublik-docker/bublik-ui/libs/shared/tailwind-ui/src/lib/badge-input/badge-list/edit-popover/edit-popover.tsx`

### How It Currently Works
1. The `EditPopover` component wraps badges with a `HoverCard` from Radix UI
2. The HoverCard opens on hover with `openDelay={0}` and closes after 200ms (`closeDelay={200}`)
3. When user clicks "edit", an input field appears within the popover
4. As soon as the user moves their cursor away from the badge trigger to position it in the input field, the popover closes
5. The popover content is small (tooltip-sized) and positioned near the trigger, making it difficult to use

### Current Component Flow
```
BadgeInput (form field)
  └─ BadgeList (badge-input version)
      └─ Badge
          └─ EditPopover (uses HoverCard)
              └─ EditPopoverContent (delete/edit/copy buttons + input)
```

### Where It's Used
The BadgeInput is used in the history global search form:
- `test-section.tsx` - Parameters field
- `run-section.tsx` - Labels, Branches, Revisions, Tags fields  
- `verdict-section.tsx` - Additional badge fields

## Proposed Solution

### Option 1: Switch HoverCard to Popover (Recommended)
Replace the HoverCard with a Popover that:
1. Opens on click instead of hover
2. Stays open until explicitly closed (click outside, Escape key, or close button)
3. Has a larger, more accessible form area
4. Provides better focus management

### Option 2: Improve HoverCard Behavior
Keep HoverCard but add better focus handling:
1. Add `onOpenAutoFocus` and `onCloseAutoFocus` handlers
2. Increase close delay when in edit mode
3. Prevent close when input is focused
4. Make the popover larger and more accessible

**Recommended: Option 1** - Switching to Popover provides a better UX and is the standard pattern for editing interfaces.

## Files to Modify

### Primary Changes
1. **`libs/shared/tailwind-ui/src/lib/badge-input/badge-list/edit-popover/edit-popover.tsx`**
   - Replace HoverCard with Popover
   - Update open/close logic to be click-based instead of hover-based
   - Improve focus management for editing
   - Make the form larger and more accessible

2. **`libs/shared/tailwind-ui/src/lib/badge-input/badge-list/edit-popover/edit-popover.stories.tsx`** (Create)
   - Add stories demonstrating the new editing behavior
   - Test different states: default, editing, focused
   - Test keyboard navigation

3. **`libs/shared/tailwind-ui/src/lib/badge-input/badge-list/badge-list.tsx`**
   - May need minor updates if trigger behavior changes

4. **`libs/shared/tailwind-ui/src/lib/badge-input/badge-input.stories.tsx`** (Update)
   - Update existing stories to reflect new click-to-open behavior
   - Add scenarios for testing the popover

### Test Updates
5. **`libs/shared/tailwind-ui/src/lib/badge-input/badge-list/edit-popover/edit-popover.spec.tsx`** (Create)
   - Add tests for the new Popover behavior
   - Test click-to-open functionality
   - Test focus management
   - Test keyboard accessibility (Escape to close)
   - Test edit mode transitions

### Related Files (No Changes Required, For Reference)
- `/Users/limonikas/workspace/bublik-home/bublik-docker/bublik-ui/libs/shared/tailwind-ui/src/lib/popover/popover.tsx` - Popover component
- `/Users/limonikas/workspace/bublik-home/bublik-docker/bublik-ui/libs/shared/tailwind-ui/src/lib/badge-input/badge-input.tsx` - Parent component
- `/Users/limonikas/workspace/bublik-home/bublik-docker/bublik-ui/libs/bublik/features/history/src/lib/history-global-search-form/global-search-form/sections/test-section.tsx` - Usage example
- `/Users/limonikas/workspace/bublik-home/bublik-docker/bublik-ui/libs/bublik/features/history/src/lib/history-global-search-form/global-search-form/sections/run-section.tsx` - Usage example
- `/Users/limonikas/workspace/bublik-home/bublik-docker/bublik-ui/libs/bublik/features/history/src/lib/history-global-search-form/global-search-form/sections/verdict-section.tsx` - Usage example

## Detailed Implementation Steps

### Step 1: Refactor EditPopover to use Popover

**Changes to `edit-popover.tsx`:**

```typescript
/* SPDX-License-Identifier: Apache-2.0 */
/* SPDX-FileCopyrightText: 2021-2023 OKTET Labs Ltd. */
import React, {
  KeyboardEvent,
  ReactNode,
  RefObject,
  ChangeEvent,
  useState,
  useRef,
  MouseEvent
} from 'react';

import { BadgeItem } from '../../types';
import { useBadgeInputContext } from '../../context';
import { Popover, PopoverContent, PopoverTrigger } from '../../../popover';
import { toast } from '../../../utils';
import { useCopyToClipboard } from '@/shared/hooks';

export type EditContentState = 'editing' | 'default';

export interface EditPopoverContentProps {
  state: EditContentState;
  defaultValue: string;
  onDeleteClick: () => void;
  onEditClick: () => void;
  onValueChange: (value: string) => void;
  onCopyClick: () => void;
  onClose?: () => void; // New prop for explicit close
}

const EditPopoverContent = (props: EditPopoverContentProps) => {
  const {
    onDeleteClick,
    onEditClick,
    state,
    onValueChange,
    onCopyClick,
    defaultValue,
    onClose
  } = props;
  const [input, setInput] = useState(defaultValue);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (e: KeyboardEvent) => {
    if (e.key === 'Enter') {
      onValueChange(input);
    } else if (e.key === 'Escape') {
      onClose?.();
    }
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
  };

  const handleEditClick = (_: MouseEvent) => {
    onEditClick();
    queueMicrotask(() => inputRef.current?.focus());
  };

  const handleSaveClick = () => {
    onValueChange(input);
  };

  const handleCancelClick = () => {
    setInput(defaultValue);
    onClose?.();
  };

  return (
    <div className="bg-white rounded-lg shadow-xl border border-gray-200">
      {state === 'default' && (
        <div className="flex items-center divide-x divide-gray-200">
          <button
            className="px-4 py-2.5 text-xs font-semibold text-gray-700 hover:bg-gray-100 transition-colors first:rounded-l-lg"
            onClick={onDeleteClick}
            type="button"
          >
            delete
          </button>
          <button
            className="px-4 py-2.5 text-xs font-semibold text-gray-700 hover:bg-gray-100 transition-colors"
            onClick={handleEditClick}
            type="button"
          >
            edit
          </button>
          <button
            className="px-4 py-2.5 text-xs font-semibold text-gray-700 hover:bg-gray-100 transition-colors last:rounded-r-lg"
            onClick={onCopyClick}
            type="button"
          >
            copy
          </button>
        </div>
      )}
      {state === 'editing' && (
        <div className="px-4 py-3">
          <input
            className="w-full text-sm font-medium border border-gray-300 rounded-lg px-3 py-2 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-shadow"
            type="text"
            value={input}
            onChange={handleChange}
            onKeyDown={handleSubmit}
            onClick={(e) => e.stopPropagation()}
            spellCheck={false}
            ref={inputRef}
            autoFocus
          />
          <div className="flex gap-2 mt-3">
            <button
              className="flex-1 px-3 py-2 text-xs font-semibold bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors"
              onClick={handleSaveClick}
              type="button"
            >
              Save
            </button>
            <button
              className="flex-1 px-3 py-2 text-xs font-semibold border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors"
              onClick={handleCancelClick}
              type="button"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export type EditPopoverProps = {
  badge: BadgeItem;
  children?: ReactNode;
  listRef: RefObject<HTMLUListElement>;
};

export const EditPopover = ({ badge, listRef, children }: EditPopoverProps) => {
  const { onDeleteClick, onBadgeEdit } = useBadgeInputContext();
  const [state, setState] = useState<EditContentState>('default');
  const [isOpen, setIsOpen] = useState(false);

  const handleDeleteClick = () => {
    onDeleteClick(badge.id);
    setIsOpen(false);
  };

  const handleEditClick = () => {
    setState('editing');
  };

  const handleSubmit = (value: string) => {
    onBadgeEdit(badge, value.trim());
    setState('default');
    setIsOpen(false);
  };

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (!open) {
      setState('default');
    }
  };

  const [, copy] = useCopyToClipboard({
    onSuccess(copiedText) {
      toast.success(`Copied ${copiedText} to clipboard`);
    }
  });

  const handleCopy = () => {
    copy(badge.value);
  };

  return (
    <Popover open={isOpen} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        {children}
      </PopoverTrigger>
      <PopoverContent
        side="top"
        align="center"
        sideOffset={8}
        className="p-0 w-auto min-w-[240px] max-w-[400px]"
        onOpenAutoFocus={(event) => event.preventDefault()}
      >
        <EditPopoverContent
          state={state}
          onDeleteClick={handleDeleteClick}
          onEditClick={handleEditClick}
          onCopyClick={handleCopy}
          onValueChange={handleSubmit}
          defaultValue={badge.value}
          onClose={() => setIsOpen(false)}
        />
      </PopoverContent>
    </Popover>
  );
};
```

### Step 2: Create EditPopover Stories

**Create `edit-popover.stories.tsx`:**

```typescript
/* SPDX-License-Identifier: Apache-2.0 */
/* SPDX-FileCopyrightText: 2021-2023 OKTET Labs Ltd. */
import { useState, useRef } from 'react';
import { StoryFn, Meta } from '@storybook/react';

import { EditPopover } from './edit-popover';
import { withBackground } from '../../storybook-bg';
import { BadgeItem } from '../../types';
import { BadgeInputContext } from '../../context';

export default {
  component: EditPopover,
  title: 'Badge Input/Edit Popover',
  decorators: [withBackground],
  parameters: {
    layout: 'centered'
  }
} as Meta<typeof EditPopover>;

const mockBadge: BadgeItem = {
  id: 'badge-1',
  value: 'parameter=value',
  originalValue: 'parameter=value'
};

const Template: StoryFn<typeof EditPopover> = (args) => {
  const [badges, setBadges] = useState<BadgeItem[]>([mockBadge]);
  const listRef = useRef<HTMLUListElement>(null);

  const handleBadgeEdit = (badge: BadgeItem, newValue: string) => {
    setBadges((prev) =>
      prev.map((b) => (b.id === badge.id ? { ...b, value: newValue, originalValue: newValue } : b))
    );
  };

  const handleDeleteClick = (id: string) => {
    setBadges((prev) => prev.filter((b) => b.id !== id));
  };

  return (
    <div className="w-[400px] p-8">
      <BadgeInputContext.Provider value={{ onBadgeEdit: handleBadgeEdit, onDeleteClick: handleDeleteClick }}>
        <EditPopover {...args} listRef={listRef}>
          <div className="inline-flex items-center py-0.5 px-2 rounded bg-badge-0 text-sm font-medium cursor-pointer hover:shadow-md transition-shadow">
            {args.badge.value}
          </div>
        </EditPopover>
      </BadgeInputContext.Provider>
    </div>
  );
};

export const Default = {
  render: Template,
  args: {
    badge: mockBadge
  }
};

export const LongValue = {
  render: Template,
  args: {
    badge: {
      id: 'badge-long',
      value: 'very_long_parameter_name=very_long_value_string_that_should_wrap',
      originalValue: 'very_long_parameter_name=very_long_value_string_that_should_wrap'
    }
  }
};
```

### Step 3: Create EditPopover Tests

**Create `edit-popover.spec.tsx`:**

```typescript
/* SPDX-License-Identifier: Apache-2.0 */
/* SPDX-FileCopyrightText: 2021-2023 OKTET Labs Ltd. */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { EditPopover } from './edit-popover';
import { BadgeItem } from '../../types';
import { BadgeInputContext } from '../../context';

const mockBadge: BadgeItem = {
  id: 'test-badge-1',
  value: 'parameter=value',
  originalValue: 'parameter=value'
};

const mockContext = {
  onBadgeEdit: vi.fn(),
  onDeleteClick: vi.fn()
};

const renderWithWrapper = (badge: BadgeItem = mockBadge) => {
  return render(
    <BadgeInputContext.Provider value={mockContext}>
      <EditPopover badge={badge} listRef={useRef(null)}>
        <button data-testid="trigger">Badge Trigger</button>
      </EditPopover>
    </BadgeInputContext.Provider>
  );
};

describe('EditPopover', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should not render popover content initially', () => {
    renderWithWrapper();
    expect(screen.queryByText('delete')).not.toBeInTheDocument();
    expect(screen.queryByText('edit')).not.toBeInTheDocument();
    expect(screen.queryByText('copy')).not.toBeInTheDocument();
  });

  it('should open popover when trigger is clicked', async () => {
    const user = userEvent.setup();
    renderWithWrapper();

    await user.click(screen.getByTestId('trigger'));

    expect(screen.getByText('delete')).toBeInTheDocument();
    expect(screen.getByText('edit')).toBeInTheDocument();
    expect(screen.getByText('copy')).toBeInTheDocument();
  });

  it('should close popover when clicking outside', async () => {
    const user = userEvent.setup();
    renderWithWrapper();

    await user.click(screen.getByTestId('trigger'));
    expect(screen.getByText('edit')).toBeInTheDocument();

    await user.click(document.body);
    await waitFor(() => {
      expect(screen.queryByText('edit')).not.toBeInTheDocument();
    });
  });

  it('should call onDeleteClick when delete button is clicked', async () => {
    const user = userEvent.setup();
    renderWithWrapper();

    await user.click(screen.getByTestId('trigger'));
    await user.click(screen.getByText('delete'));

    expect(mockContext.onDeleteClick).toHaveBeenCalledWith('test-badge-1');
  });

  it('should switch to edit mode when edit button is clicked', async () => {
    const user = userEvent.setup();
    renderWithWrapper();

    await user.click(screen.getByTestId('trigger'));
    await user.click(screen.getByText('edit'));

    expect(screen.getByRole('textbox')).toBeInTheDocument();
    expect(screen.getByText('Save')).toBeInTheDocument();
    expect(screen.getByText('Cancel')).toBeInTheDocument();
  });

  it('should focus input field when entering edit mode', async () => {
    const user = userEvent.setup();
    renderWithWrapper();

    await user.click(screen.getByTestId('trigger'));
    await user.click(screen.getByText('edit'));

    const input = screen.getByRole('textbox');
    expect(input).toHaveFocus();
  });

  it('should save changes when Save button is clicked', async () => {
    const user = userEvent.setup();
    renderWithWrapper();

    await user.click(screen.getByTestId('trigger'));
    await user.click(screen.getByText('edit'));

    const input = screen.getByRole('textbox');
    await user.clear(input);
    await user.type(input, 'new_parameter=new_value');
    await user.click(screen.getByText('Save'));

    expect(mockContext.onBadgeEdit).toHaveBeenCalledWith(
      mockBadge,
      'new_parameter=new_value'
    );
  });

  it('should save changes when Enter key is pressed', async () => {
    const user = userEvent.setup();
    renderWithWrapper();

    await user.click(screen.getByTestId('trigger'));
    await user.click(screen.getByText('edit'));

    const input = screen.getByRole('textbox');
    await user.clear(input);
    await user.type(input, 'new_parameter=new_value{Enter}');

    expect(mockContext.onBadgeEdit).toHaveBeenCalledWith(
      mockBadge,
      'new_parameter=new_value'
    );
  });

  it('should cancel changes when Cancel button is clicked', async () => {
    const user = userEvent.setup();
    renderWithWrapper();

    await user.click(screen.getByTestId('trigger'));
    await user.click(screen.getByText('edit'));

    const input = screen.getByRole('textbox');
    await user.clear(input);
    await user.type(input, 'changed_value');
    await user.click(screen.getByText('Cancel'));

    expect(mockContext.onBadgeEdit).not.toHaveBeenCalled();
  });

  it('should cancel changes when Escape key is pressed', async () => {
    const user = userEvent.setup();
    renderWithWrapper();

    await user.click(screen.getByTestId('trigger'));
    await user.click(screen.getByText('edit'));

    const input = screen.getByRole('textbox');
    await user.clear(input);
    await user.type(input, 'changed_value{Escape}');

    expect(mockContext.onBadgeEdit).not.toHaveBeenCalled();
  });

  it('should close popover when Escape key is pressed in default mode', async () => {
    const user = userEvent.setup();
    renderWithWrapper();

    await user.click(screen.getByTestId('trigger'));
    expect(screen.getByText('edit')).toBeInTheDocument();

    fireEvent.keyDown(document, { key: 'Escape' });

    await waitFor(() => {
      expect(screen.queryByText('edit')).not.toBeInTheDocument();
    });
  });
});
```

### Step 4: Update BadgeInput Stories

**Update `badge-input.stories.tsx`** to showcase the new behavior:

The existing stories should work with the new implementation since the component interface hasn't changed. However, it would be good to add:
- A note about the new click-to-open behavior
- Example of editing a badge
- Keyboard navigation examples

### Step 5: Manual Testing

Test the changes thoroughly in the actual history page:
1. Navigate to the history page
2. Add some badges (parameters, labels, branches, etc.)
3. Try clicking on a badge
4. Verify the popover opens and stays open
5. Test editing functionality
6. Test delete functionality
7. Test copy functionality
8. Test keyboard navigation (Tab, Enter, Escape)
9. Test focus management
10. Test clicking outside to close

## Benefits of This Approach

1. **Better UX**: Users can edit badges without the popup closing unexpectedly
2. **Accessibility**: Improved keyboard navigation and focus management
3. **Larger form area**: More space for editing, easier to click targets
4. **Standard pattern**: Popover is the standard UI pattern for editing operations
5. **Reduced frustration**: No more disappearing forms when moving the cursor
6. **Better mobile support**: Click-based interactions work better on touch devices

## Potential Issues and Mitigations

### Issue 1: User Expectation Change
Users may expect hover-based behavior from before.
**Mitigation**: Add a visual cue (cursor pointer, hover effect) to indicate badges are clickable. Add a tooltip or visual hint for first-time users.

### Issue 2: Breaking Changes
**Mitigation**: The change from hover to click is a UX improvement, not a breaking API change. The component interface remains the same.

### Issue 3: Performance
**Mitigation**: Popover is a lightweight component and won't impact performance.

### Issue 4: Backwards Compatibility
**Mitigation**: The BadgeInput component interface doesn't change, only the internal implementation of EditPopover.

## Testing Strategy

### Unit Tests
- Test EditPopover state management
- Test open/close behavior
- Test edit mode transitions
- Test keyboard navigation

### Integration Tests
- Test BadgeInput with EditPopover
- Test form submission with edited badges
- Test delete/copy functionality

### Manual Testing Checklist
- [ ] Popover opens when clicking a badge
- [ ] Popover closes when clicking outside
- [ ] Popover closes when pressing Escape
- [ ] Edit mode activates when clicking "edit" button
- [ ] Input field receives focus in edit mode
- [ ] Can type and edit badge value
- [ ] Save button submits changes
- [ ] Cancel button reverts changes
- [ ] Enter key submits changes
- [ ] Escape key cancels changes
- [ ] Delete button removes badge
- [ ] Copy button copies value to clipboard
- [ ] Popover stays open when moving cursor to popover content
- [ ] Popover has proper z-index (appears above other elements)
- [ ] Works on mobile/touch devices
- [ ] Long badge values display correctly
- [ ] Multiple badges can be edited independently

## Timeline Estimate

- **Step 1**: Refactor EditPopover (2-3 hours)
- **Step 2**: Create EditPopover stories (1-2 hours)
- **Step 3**: Create EditPopover tests (2-3 hours)
- **Step 4**: Update BadgeInput stories (0.5-1 hour)
- **Step 5**: Manual testing and refinement (2-3 hours)

**Total Estimated Time**: 7.5-12 hours

## Rollout Plan

1. Make the changes in a feature branch
2. Implement the EditPopover refactoring
3. Create tests and stories
4. Test thoroughly in Storybook
5. Test in the history page context
6. Verify all existing BadgeInput usage still works
7. Create pull request with detailed description
8. Code review
9. Merge to main branch
10. Deploy to staging environment
11. Final testing in staging
12. Production deployment

## Conclusion

This implementation plan addresses the core issue of the inconvenient parameter editing form by switching from a hover-triggered tooltip to a click-triggered popover with proper focus management and a larger, more accessible editing interface. The changes are minimal in scope but provide a significant improvement to user experience.

The key benefits are:
1. Users can edit badges without fear of the form closing
2. Larger, more accessible editing interface
3. Better keyboard navigation and accessibility
4. Standard UI pattern that users are familiar with
5. Improved support for touch/mobile devices
