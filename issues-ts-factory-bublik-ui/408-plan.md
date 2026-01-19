# Issue #408: Implementation Plan - Add `prj` parameter to Import Runs

## Overview

This plan details the implementation required to add support for the `prj` parameter when importing runs. The `prj` parameter should work similarly to the `force` parameter - it should be:
1. Extractable from pasted URLs
2. Settable via a global project selector
3. Added to the import URL when submitting runs

## Current State Analysis

### Existing Implementation
- **Project Selector**: The form already has a project selector at the top (lines 191-196 in import-run-form.component.tsx) that can set a project for all runs
- **Project Field**: The form schema includes a `project` field for each run (import/index.ts, line 14)
- **URL Generation**: The URL generation adds a `project` parameter (parse-import-url.ts, line 12, 20-22)
- **Paste Handler**: The paste handler extracts `force`, `from`, and `to` parameters but NOT `project` or `prj` (import-run-form.component.tsx, lines 96-113)

### Key Finding
The functionality to specify a project already exists, but it uses `project` as the parameter key instead of `prj`. The backend API has been updated to use `prj`, so the frontend needs to be updated accordingly.

## Implementation Plan

### 1. Update URL Parameter Key (`project` → `prj`)

**File**: `libs/services/bublik-api/src/lib/endpoints/import/parse-import-url.ts`

**Change Required**:
```typescript
// Line 12: Change from
const PROJECT_PARAM_KEY = 'project';

// To:
const PROJECT_PARAM_KEY = 'prj';
```

**Impact**: This will ensure that when runs are imported, the URL contains `prj=<project_id>` instead of `project=<project_id>`.

---

### 2. Update Paste Handler to Extract `prj` Parameter

**File**: `libs/bublik/features/run-import/src/lib/import-run-form/import-run-form.component.tsx`

**Change Required**: Modify the `handlePaste` function to extract the `prj` parameter from pasted URLs.

**Current Code** (lines 96-113):
```typescript
const parsedUrls = urlArray
    .map((v) => new URL(v))
    .map((u) => {
        const urlPieces = [u.protocol, '//', u.host, u.pathname];
        const url = urlPieces.join('');
        const force = u.searchParams.get('force') === 'true';
        const fromStr = u.searchParams.get('from');
        const toStr = u.searchParams.get('to');

        if (!fromStr || !toStr) return { url, force, range: null };

        const range = {
            startDate: new Date(fromStr),
            endDate: new Date(toStr)
        };

        return { url, force, range };
    });
```

**Updated Code**:
```typescript
const parsedUrls = urlArray
    .map((v) => new URL(v))
    .map((u) => {
        const urlPieces = [u.protocol, '//', u.host, u.pathname];
        const url = urlPieces.join('');
        const force = u.searchParams.get('force') === 'true';
        const fromStr = u.searchParams.get('from');
        const toStr = u.searchParams.get('to');
        const prjStr = u.searchParams.get('prj') || u.searchParams.get('project'); // Support both for backward compatibility

        let project = null;
        if (prjStr) {
            const prjId = parseInt(prjStr);
            if (!isNaN(prjId)) {
                project = prjId;
            }
        }

        if (!fromStr || !toStr) return { url, force, range: null, project };

        const range = {
            startDate: new Date(fromStr),
            endDate: new Date(toStr)
        };

        return { url, force, range, project };
    });
```

**Impact**: When users paste URLs containing `prj=<id>` or `project=<id>` parameters, the project ID will be extracted and populated in the form fields.

---

### 3. Add Tests for `prj` Parameter

**File**: `libs/services/bublik-api/src/lib/endpoints/import/parse-import-url.spec.ts`

**New Tests to Add**:

```typescript
describe('getUrl', () => {
    // ... existing tests ...

    it('should add the "prj" parameter when run.project is provided', () => {
        const run = { url: 'https://example.com', force: false, range: null, project: 42 };
        const result = getUrl(run);

        const expectedUrl = 'https://example.com/?prj=42';
        expect(result.href).toBe(expectedUrl);
    });

    it('should combine all parameters correctly', () => {
        const startDate = new Date('2023-01-01');
        const endDate = new Date('2023-01-31');
        const run = {
            url: 'https://example.com',
            force: true,
            range: { startDate, endDate },
            project: 123
        };
        const result = getUrl(run);

        const expectedUrl = 'https://example.com/?prj=123&force=true&from=2023-01-01&to=2023-01-31';
        expect(result.href).toBe(expectedUrl);
    });
});

describe('runToImportUrl', () => {
    // ... existing tests ...

    it('should generate the correct import URL with prj parameter', () => {
        const run = {
            url: 'https://example.com/',
            force: true,
            range: {
                startDate: new Date('2023-01-01'),
                endDate: new Date('2023-01-31')
            },
            project: 456
        };

        const result = runToImportUrl(run);

        const expectedUrl = `?url=https://example.com&prj=456&force=true&from=2023-01-01&to=2023-01-31`;

        expect(result).toBe(expectedUrl);
    });
});
```

**Impact**: Ensures that the `prj` parameter is correctly added to import URLs and that all combinations of parameters work together.

---

### 4. Update Existing Tests (if any reference `project` parameter)

**Files to Check**:
- `libs/services/bublik-api/src/lib/endpoints/import/parse-import-url.spec.ts`
- Any snapshot tests in `libs/bublik/features/run-import/src/lib/import-run-form/__snapshots__/`

**Action**: Review all test files to ensure they don't have hardcoded expectations for `project=` in URLs. Update any tests that verify URL structure to expect `prj=` instead.

---

## Implementation Approach

### Phase 1: Core Changes
1. Update the `PROJECT_PARAM_KEY` constant in `parse-import-url.ts`
2. Update the paste handler in `import-run-form.component.tsx` to extract `prj` parameter

### Phase 2: Testing
1. Add new unit tests for the `prj` parameter
2. Review and update existing tests
3. Run all tests to ensure no regressions

### Phase 3: Verification
1. Manually test the import form functionality:
   - Verify project selector works
   - Verify pasting URLs with `prj=` parameter works
   - Verify importing runs includes the `prj` parameter in the URL
   - Verify backward compatibility with `project=` parameter (if needed)
2. Test edge cases:
   - Invalid project IDs
   - Non-numeric project IDs
   - URLs with both `prj` and `project` parameters
   - URLs without project parameters

---

## Files to Modify

| File | Change Type | Priority |
|------|-------------|----------|
| `libs/services/bublik-api/src/lib/endpoints/import/parse-import-url.ts` | Change parameter key | High |
| `libs/bublik/features/run-import/src/lib/import-run-form/import-run-form.component.tsx` | Update paste handler | High |
| `libs/services/bublik-api/src/lib/endpoints/import/parse-import-url.spec.ts` | Add tests | Medium |
| Snapshot files (if needed) | Update snapshots | Low |

---

## No Changes Required

The following files do NOT need changes because they already handle projects correctly:
- `libs/shared/types/src/lib/import/index.ts` - Schema already includes `project` field
- `libs/bublik/features/run-import/src/lib/import-run-form/import-run-form.component.tsx` (except paste handler) - Project selector already implemented
- `libs/bublik/features/run-import/src/lib/import-run-form/import-run-form.container.tsx` - Already fetches and passes projects to form

---

## Backward Compatibility

The implementation should support both `prj` and `project` parameters in pasted URLs for a smooth transition:
1. Extract `prj` parameter first
2. Fall back to `project` parameter if `prj` is not found
3. Always use `prj` when generating URLs for the API

---

## Testing Strategy

### Unit Tests
- Test URL generation with `prj` parameter
- Test URL generation with all parameters combined
- Test paste handler extraction of `prj` parameter
- Test paste handler with backward compatibility (`project` parameter)

### Integration Tests
- Test the complete flow: select project → paste URL → verify `prj` in generated URL
- Test the complete flow: paste URL with `prj` → verify form fields populated correctly

### Manual Testing Checklist
- [ ] Open import form
- [ ] Select a project from the dropdown
- [ ] Enter a URL and verify the import URL includes `prj=<id>`
- [ ] Paste a URL containing `prj=<id>` and verify the project field is populated
- [ ] Paste a URL containing `project=<id>` and verify the project field is populated (backward compatibility)
- [ ] Verify all runs can have the same project selected
- [ ] Verify "No Project (Default)" option works
- [ ] Verify the "Force Import" checkbox still works alongside project selection
- [ ] Verify date range selectors still work alongside project selection
- [ ] Check for any console errors or warnings

---

## Estimated Effort

- Core Changes: 1-2 hours
- Testing: 1-2 hours
- Documentation/Code Review: 1 hour

**Total Estimated Time**: 3-5 hours

---

## Risks and Mitigation

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|-----------|
| Breaking existing functionality | Low | High | Comprehensive testing, backward compatibility support |
| API contract mismatch | Low | Medium | Verify with backend team that `prj` is the correct parameter |
| Test failures due to URL structure changes | Medium | Low | Update all snapshot tests and assertions |

---

## Acceptance Criteria

1. ✅ Import URLs use `prj` parameter instead of `project`
2. ✅ Paste handler extracts `prj` parameter from pasted URLs
3. ✅ Backward compatibility: paste handler also extracts `project` parameter
4. ✅ All existing tests pass
5. ✅ New tests added for `prj` parameter functionality
6. ✅ Project selector continues to work as expected
7. ✅ Manual testing confirms the feature works end-to-end

---

## Additional Notes

- The issue mentions that the feature should be "common for all URLs (like force)". This is already implemented - the project selector at the top of the form sets the project for all runs, similar to the "Force Import" checkbox.
- The UI already displays clear guidance about project precedence (lines 197-217 in import-run-form.component.tsx), which doesn't need to change.
- No type changes are needed as the schema already supports the `project` field.
