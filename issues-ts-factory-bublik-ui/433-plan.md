# Implementation Plan for Issue #433: Add Editor for Markdown

## Summary
Add a markdown editor component to the "New Bug" feature that allows users to view, edit, and copy markdown-formatted bug reports. The editor should provide both edit and preview modes, similar to popular markdown editors.

## Current State Analysis

### Current Implementation
- **Location**: `/libs/bublik/features/log-preview-drawer/src/new-bug.component.tsx`
- **Current Behavior**: Markdown is generated and displayed as plain text in a `<pre>` tag (lines 548-555)
- **Features**:
  - Generates markdown bug report with test details, verdicts, artifacts, branches, revisions, parameters, and logs
  - Copies markdown to clipboard with "Copy Markdown" button
  - Shows generated markdown in read-only format
  - User can modify filters (#Scenario, #T: Verdict) which updates the markdown

### Limitations
- No markdown preview - users see raw markdown syntax
- Cannot edit the generated markdown content
- Cannot see how the markdown will render before copying
- No syntax highlighting or formatting assistance

### Available Resources
- **Monaco Editor** (v4.7.0): Already installed and used in configs page (`/apps/bublik/src/pages/configs/components/editor.component.tsx`)
- **react-shiki** (installed): Currently used for code highlighting - can potentially be used for markdown preview
- **Tailwind-UI**: Existing component library structure

## Implementation Plan

### Phase 1: Install Additional Dependencies

**File**: `/package.json`

**Add dependencies**:
```json
{
  "dependencies": {
    "react-markdown": "^9.0.0",
    "remark-gfm": "^4.0.0",
    "rehype-raw": "^7.0.0",
    "rehype-sanitize": "^6.0.0"
  }
}
```

**Rationale**:
- `react-markdown`: Core markdown renderer
- `remark-gfm`: GitHub Flavored Markdown support (tables, strikethrough, task lists)
- `rehype-raw`: Allow HTML in markdown for flexibility
- `rehype-sanitize`: Security - sanitize HTML to prevent XSS attacks

---

### Phase 2: Create MarkdownEditor Component

#### 2.1 Create Component File

**File**: `/libs/shared/tailwind-ui/src/lib/markdown-editor/markdown-editor.component.tsx`

```typescript
/* SPDX-License-Identifier: Apache-2.0 */
/* SPDX-FileCopyrightText: 2024 OKTET LTD */
import {
  ComponentProps,
  forwardRef,
  useImperativeHandle,
  useRef,
  useState
} from 'react';
import MonacoEditor, { Monaco, OnMount } from '@monaco-editor/react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize from 'rehype-sanitize';

import {
  ButtonTw,
  CardHeader,
  cn,
  Icon,
  Separator,
  ToggleSwitch
} from '@/shared/tailwind-ui';

import editorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker';

// eslint-disable-next-line no-restricted-globals
self.MonacoEnvironment = {
  getWorker(_, label) {
    return new editorWorker();
  }
};

export interface MarkdownEditorRef {
  getValue: () => string;
  setValue: (value: string) => void;
}

export interface MarkdownEditorProps extends ComponentProps<typeof MonacoEditor> {
  label?: ComponentProps<typeof CardHeader>['label'];
  readOnly?: boolean;
  showPreview?: boolean;
  onCopy?: () => void;
  toolbar?: React.ReactNode;
}

const MarkdownEditor = forwardRef<MarkdownEditorRef, MarkdownEditorProps>(
  ({ label, readOnly, showPreview = true, onCopy, toolbar, className, ...props }, ref) => {
    const [monaco, setMonaco] = useState<Monaco>();
    const [value, setValue] = useState(props.value || '');
    const [isPreviewMode, setIsPreviewMode] = useState(false);
    const editorRef = useRef<Parameters<OnMount>[0] | null>(null);

    useImperativeHandle(ref, () => ({
      getValue: () => value,
      setValue: (newValue: string) => {
        setValue(newValue);
        if (editorRef.current) {
          editorRef.current.setValue(newValue);
        }
      }
    }), [value]);

    function handleEditorWillMount(monacoInstance: Monaco) {
      // Monaco doesn't have built-in markdown language support
      // We'll use a simple approach with text language
      setMonaco(monacoInstance);
    }

    const handleEditorDidMount: OnMount = (editor, monacoInstance) => {
      editorRef.current = editor;
    };

    function handleEditorChange(value: string | undefined) {
      setValue(value || '');
    }

    return (
      <div className="flex flex-col h-full">
        <CardHeader label={label || 'Markdown Editor'}>
          <div className="flex items-center gap-4">
            {toolbar}
            <Separator orientation="vertical" className="h-4" />
            <div className="flex items-center gap-2">
              <span className="text-sm">Edit</span>
              <ToggleSwitch
                checked={isPreviewMode}
                onCheckedChange={setIsPreviewMode}
                label="Preview"
              />
              <span className="text-sm">Preview</span>
            </div>
            {onCopy && (
              <ButtonTw
                variant="secondary"
                size="xss"
                onClick={onCopy}
                disabled={readOnly}
              >
                <Icon name="Copy" className="size-5 mr-1.5" />
                <span>Copy</span>
              </ButtonTw>
            )}
          </div>
        </CardHeader>
        
        <div className={cn('flex-1 overflow-hidden', className)}>
          {isPreviewMode ? (
            <div className="h-full overflow-auto p-4 prose prose-sm max-w-none">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                rehypePlugins={[rehypeRaw, rehypeSanitize]}
              >
                {value}
              </ReactMarkdown>
            </div>
          ) : (
            <MonacoEditor
              language="markdown"
              beforeMount={handleEditorWillMount}
              onMount={handleEditorDidMount}
              onChange={handleEditorChange}
              value={value}
              options={{
                readOnly,
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
                wordWrap: 'on',
                automaticLayout: true
              }}
              className="[&_.line-numbers]:before:!content-none"
              loading={null}
              {...props}
            />
          )}
        </div>
      </div>
    );
  }
);

export { MarkdownEditor };
```

#### 2.2 Create Index File

**File**: `/libs/shared/tailwind-ui/src/lib/markdown-editor/index.ts`

```typescript
/* SPDX-License-Identifier: Apache-2.0 */
/* SPDX-FileCopyrightText: 2024 OKTET LTD */
export * from './markdown-editor.component';
```

#### 2.3 Create Stories File

**File**: `/libs/shared/tailwind-ui/src/lib/markdown-editor/markdown-editor.stories.tsx`

```typescript
/* SPDX-License-Identifier: Apache-2.0 */
/* SPDX-FileCopyrightText: 2024 OKTET LTD */
import type { Meta } from '@storybook/react';
import { withBackground } from '../storybook-bg';
import { MarkdownEditor } from './markdown-editor.component';

const Story: Meta<typeof MarkdownEditor> = {
  component: MarkdownEditor,
  title: 'components/Markdown Editor',
  decorators: [withBackground]
};
export default Story;

const sampleMarkdown = `# Test Report

## Test Details
- **Test Name**: My Test
- **Path**: \`/path/to/test\`

## Verdicts
| Value |
|-------|
| PASSED |
| FAILED |

## Links
[Go To Full Log](https://example.com)
`;

export const Default = {
  args: {
    label: 'Bug Report',
    value: sampleMarkdown,
    readOnly: false,
    showPreview: true
  }
};

export const ReadOnly = {
  args: {
    label: 'Bug Report',
    value: sampleMarkdown,
    readOnly: true,
    showPreview: true
  }
};

export const WithoutPreview = {
  args: {
    label: 'Bug Report',
    value: sampleMarkdown,
    readOnly: false,
    showPreview: false
  }
};
```

#### 2.4 Create Spec File

**File**: `/libs/shared/tailwind-ui/src/lib/markdown-editor/markdown-editor.spec.tsx`

```typescript
/* SPDX-License-Identifier: Apache-2.0 */
/* SPDX-FileCopyrightText: 2024 OKTET LTD */
import { render, screen } from '@testing-library/react';
import { MarkdownEditor, MarkdownEditorRef } from './markdown-editor.component';
import userEvent from '@testing-library/user-event';

describe('MarkdownEditor', () => {
  it('should render label', () => {
    render(<MarkdownEditor label="Test Label" value="Test content" />);
    expect(screen.getByText('Test Label')).toBeInTheDocument();
  });

  it('should render markdown content', () => {
    render(<MarkdownEditor value="# Heading\n\nContent" />);
    expect(screen.getByText('Heading')).toBeInTheDocument();
  });

  it('should toggle between edit and preview modes', async () => {
    const user = userEvent.setup();
    render(<MarkdownEditor value="# Test" showPreview />);
    
    const toggle = screen.getByLabelText('Preview');
    await user.click(toggle);
    
    // Verify preview mode is active
    expect(screen.getByText('Test')).toBeInTheDocument();
  });

  it('should be readonly when readOnly prop is true', () => {
    render(<MarkdownEditor value="Test" readOnly />);
    const editor = screen.getByRole('textbox');
    expect(editor).toHaveAttribute('readonly');
  });
});
```

---

### Phase 3: Update Tailwind-UI Exports

**File**: `/libs/shared/tailwind-ui/src/index.ts`

**Change**: Add export for markdown-editor

```typescript
// Add to the list of exports
export * from './lib/markdown-editor';
```

---

### Phase 4: Integrate MarkdownEditor into New Bug Component

**File**: `/libs/bublik/features/log-preview-drawer/src/new-bug.component.tsx`

**Changes Required**:

#### 4.1 Import MarkdownEditor

```typescript
import { MarkdownEditor, MarkdownEditorRef } from '@/shared/tailwind-ui';
```

#### 4.2 Add Ref for Editor Control

```typescript
const markdownEditorRef = useRef<MarkdownEditorRef>(null);
```

#### 4.3 Replace Markdown Display (lines 547-569)

**Current code** (lines 547-569):
```tsx
<div className="overflow-auto px-4 py-6 flex-1">
  <pre
    className={cn(
      'transition-all border border-border-primary rounded-md hover:border-primary whitespace-break-spaces overflow-wrap-anywhere',
      'text-xs p-2'
    )}
  >
    {markdown}
  </pre>
</div>
<div
  className="px-4 py-2 flex items-center mt-auto"
  style={{ boxShadow: 'rgba(0, 0, 0, 0.1) 0px 0px 15px 0px' }}
>
  <ButtonTw
    variant="primary"
    size="sm"
    onClick={handleBugCopyClick}
    className="w-full"
  >
    Copy Markdown
  </ButtonTw>
</div>
```

**Replace with**:
```tsx
<MarkdownEditor
  ref={markdownEditorRef}
  label={
    <div className="flex items-center gap-2">
      <span className="text-text-primary text-[0.75rem] font-semibold leading-[0.875rem]">
        New Bug
      </span>
      <Separator orientation="vertical" className="h-4" />
      <ButtonTw
        size="xss"
        variant="outline"
        state={isScenarioActive && 'active'}
        onClick={handleScenarioClick}
      >
        #Scenario
      </ButtonTw>
      <ButtonTw
        size="xss"
        variant="outline"
        state={isVerdictActive && 'active'}
        onClick={handleVerdictClick}
        disabled={!haveVerdict}
      >
        #T: Verdict
      </ButtonTw>
    </div>
  }
  value={markdown}
  readOnly={false}
  showPreview={true}
  onCopy={handleBugCopyClick}
  toolbar={
    <>
      <Tooltip content="Format Markdown">
        <ButtonTw
          variant="secondary"
          size="xss"
          onClick={handleFormatClick}
        >
          <Icon name="Edit" className="size-5 mr-1.5" />
          <span>Format</span>
        </ButtonTw>
      </Tooltip>
    </>
  }
/>
```

#### 4.4 Update Copy Handler

```typescript
const handleBugCopyClick = async () => {
  const currentMarkdown = markdownEditorRef.current?.getValue() || markdown;
  await copy(currentMarkdown)
    .then(() => toast.success('Successfully copied!'))
    .catch(() => toast.error('Failed to copy!'));
};
```

#### 4.5 Add Format Handler (Optional)

```typescript
function handleFormatClick() {
  const currentValue = markdownEditorRef.current?.getValue() || markdown;
  // Add simple markdown formatting if needed
  // This could add consistent spacing, fix tables, etc.
  toast.info('Markdown formatting not implemented yet');
}
```

---

## Implementation Approach

### Step 1: Set Up Environment (30 minutes)
1. Run `pnpm install react-markdown remark-gfm rehype-raw rehype-sanitize`
2. Verify Monaco Editor supports markdown language
3. Create markdown-editor directory structure

### Step 2: Create MarkdownEditor Component (2-3 hours)
1. Implement markdown-editor.component.tsx
2. Add necessary TypeScript types
3. Configure Monaco Editor for markdown
4. Implement preview toggle functionality
5. Add copy functionality
6. Create index.ts export file

### Step 3: Add Tests (1-2 hours)
1. Create markdown-editor.stories.tsx with examples
2. Create markdown-editor.spec.tsx with unit tests
3. Test component in Storybook
4. Verify all scenarios: read-only, editable, preview mode

### Step 4: Integrate into New Bug Component (1 hour)
1. Update imports in new-bug.component.tsx
2. Replace plain text display with MarkdownEditor
3. Add ref for editor control
4. Update copy handler to use ref
5. Test integration in the drawer

### Step 5: Styling and Polish (1 hour)
1. Adjust preview styles using Tailwind prose classes
2. Ensure proper overflow handling
3. Verify responsive behavior
4. Test with various markdown content sizes

### Step 6: Documentation (30 minutes)
1. Add JSDoc comments to component
2. Update component story with usage examples
3. Document any custom markdown extensions used

---

## Files to Create

| File | Type | Priority |
|------|------|----------|
| `/libs/shared/tailwind-ui/src/lib/markdown-editor/markdown-editor.component.tsx` | New | High |
| `/libs/shared/tailwind-ui/src/lib/markdown-editor/index.ts` | New | High |
| `/libs/shared/tailwind-ui/src/lib/markdown-editor/markdown-editor.stories.tsx` | New | Medium |
| `/libs/shared/tailwind-ui/src/lib/markdown-editor/markdown-editor.spec.tsx` | New | Medium |

## Files to Modify

| File | Change Type | Priority |
|------|-------------|----------|
| `/package.json` | Add dependencies | High |
| `/libs/shared/tailwind-ui/src/index.ts` | Add export | High |
| `/libs/bublik/features/log-preview-drawer/src/new-bug.component.tsx` | Replace markdown display | High |

---

## Testing Strategy

### Unit Tests

**File**: `/libs/shared/tailwind-ui/src/lib/markdown-editor/markdown-editor.spec.tsx`

Test cases:
1. Component renders with label
2. Markdown content displays correctly
3. Edit/Preview toggle works
4. Copy button triggers callback
5. Read-only mode disables editing
6. Ref methods (getValue/setValue) work correctly

### Integration Tests

Test in New Bug drawer:
1. Open "New Bug" drawer
2. Verify markdown displays correctly
3. Switch to preview mode
4. Verify markdown renders properly with formatting
5. Edit markdown content
6. Switch back to edit mode - verify changes persist
7. Copy markdown
8. Verify clipboard contains updated content
9. Test filter buttons (#Scenario, #T: Verdict)
10. Verify markdown updates when filters change

### Manual Testing Checklist

**Markdown Rendering**:
- [ ] Headers (h1-h6) render correctly
- [ ] Bold and italic text displays properly
- [ ] Lists (ordered and unordered) render correctly
- [ ] Links are clickable and formatted
- [ ] Tables render with proper borders and alignment
- [ ] Code blocks (inline and fenced) display with syntax highlighting
- [ ] Blockquotes render correctly
- [ ] Horizontal rules display

**Editor Functionality**:
- [ ] Can type and edit markdown
- [ ] Toggle between edit and preview works
- [ ] Copy button copies current content
- [ ] Read-only mode prevents editing
- [ ] Long markdown scrolls properly
- [ ] Editor fits in drawer without overflow

**Integration**:
- [ ] Markdown updates when filters change
- [ ] All existing button functionality works
- [ ] Drawer opens and closes correctly
- [ ] No console errors or warnings

### Edge Cases to Test

1. Empty markdown content
2. Very long markdown (1000+ lines)
3. Markdown with special characters
4. Markdown with HTML (sanitization)
5. Invalid markdown syntax
6. Multiple code blocks in a single document
7. Tables with many columns
8. Nested lists
9. Links with special characters

---

## UI/UX Considerations

### Design Decisions

1. **Split View**: Instead of side-by-side split, use a toggle between edit and preview modes
   - Reason: Drawer has limited space, toggle provides better mobile experience
   - Future enhancement: Could add side-by-side for larger screens

2. **Default Mode**: Start in edit mode
   - Reason: Users primarily want to edit the generated markdown
   - Preview is for verification before copying

3. **Button Placement**: Keep toolbar in CardHeader
   - Consistent with existing ConfigEditor component
   - Familiar UX pattern

4. **Monaco for Markdown**: Use Monaco with markdown language
   - Consistent with existing code editor
   - Provides better UX than textarea
   - Future: Could add syntax highlighting and validation

### Styling

- Use Tailwind's `prose` class for markdown preview styling
- Consistent with existing drawer and card components
- Responsive design for various drawer sizes

### Accessibility

- Keyboard navigation support
- Screen reader compatibility
- Proper focus management
- ARIA labels for toggle and buttons

---

## Potential Enhancements (Future Work)

1. **Syntax Highlighting**: Add markdown syntax highlighting in editor
2. **Live Preview**: Side-by-side edit and preview on larger screens
3. **Markdown Toolbar**: Add formatting buttons (bold, italic, list, etc.)
4. **Spell Check**: Integrate spell checking for markdown content
5. **Export Options**: Export as PDF or HTML
6. **Templates**: Add markdown templates for common bug report formats
7. **Auto-save**: Save draft to local storage
8. **Markdown Linting**: Add validation for markdown syntax

---

## Risk Analysis

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|-----------|
| Monaco doesn't support markdown language | Low | Medium | Fallback to textarea or use custom language definition |
| react-markdown performance issues with large content | Medium | Medium | Implement lazy loading or pagination for preview |
| XSS vulnerabilities from rendered markdown | Low | High | Use rehype-sanitize, validate all inputs |
| Breaking existing New Bug functionality | Low | High | Comprehensive testing, preserve all existing props |
| Drawer overflow with large markdown | Medium | Low | Implement proper scrolling and overflow handling |

---

## Backward Compatibility

This change is backward compatible:
- No API changes to other components
- New Bug drawer functionality preserved
- All existing buttons and filters work as before
- Copy functionality improved but compatible

---

## Estimated Effort

- **Phase 1**: 30 minutes (install dependencies)
- **Phase 2**: 2-3 hours (create MarkdownEditor component)
- **Phase 3**: 1-2 hours (add tests)
- **Phase 4**: 1 hour (integrate into New Bug)
- **Phase 5**: 1 hour (styling and polish)
- **Phase 6**: 30 minutes (documentation)

**Total Estimated Time**: 6-8 hours

---

## Acceptance Criteria

1. ✅ MarkdownEditor component created with edit and preview modes
2. ✅ Component integrated into New Bug drawer
3. ✅ Users can toggle between edit and preview
4. ✅ Markdown renders correctly with proper formatting
5. ✅ Copy button works with edited content
6. ✅ All existing New Bug functionality preserved
7. ✅ Component has unit tests
8. ✅ Component has Storybook stories
9. ✅ No console errors or warnings
10. ✅ Manual testing confirms feature works end-to-end

---

## References

- **Issue**: #433 Add editor for markdown
- **Monaco Editor Docs**: https://microsoft.github.io/monaco-editor/
- **React Markdown**: https://github.com/remarkjs/react-markdown
- **Related Components**:
  - `/apps/bublik/src/pages/configs/components/editor.component.tsx` (Monaco Editor example)
  - `/libs/bublik/features/log-preview-drawer/src/new-bug.component.tsx` (Usage location)
  - `/libs/shared/tailwind-ui/src/lib/text-area/text-area.tsx` (Similar component pattern)

---

## Additional Notes

- The Monaco Editor markdown language support is basic; consider adding custom language features in future iterations
- The react-shiki library (already installed) could be used for code highlighting in markdown preview if needed
- Keep the implementation simple for MVP; add enhancements based on user feedback
- Ensure the markdown sanitizer is properly configured to allow safe formatting
- Consider adding markdown presets/templates for different bug report types
