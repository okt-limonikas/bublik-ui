# Implementation Plan: Make user setting for changing default open level in the log

## Overview
This plan describes the implementation of a user-configurable setting for the default expansion level in the log view. Currently, the log table hardcodes the expansion level to `1`, which means only the first level of nested rows is expanded by default. This feature will allow users to customize this behavior.

## Current State Analysis

### 1. How Log Open Level is Currently Handled

**File:** `libs/bublik/features/session-log/src/lib/v1/log-blocks/log-table/log-table.hooks.ts`

The expansion level is controlled by the `getInitialExpandedState` function (lines 304-347):

```typescript
const getInitialExpandedState = (
  id: string,
  data: LogTableData[],
  levelToExpandTo = 1  // Currently hardcoded to 1
): ExpandedState => {
  // Determines which rows should be expanded based on level
  const shouldExpand =
    currentDepth <= levelToExpandTo - 1 || hasDescendantWithMI(row);
  // ...
}
```

This function is called by `useLogTableExpandedState` hook (lines 354-363):

```typescript
export const useLogTableExpandedState = ({
  id,
  data
}: UseLogTableExpandedState) => {
  const [expanded, setExpanded] = useState<ExpandedState>(
    getInitialExpandedState(id, data, 1)  // Hardcoded value
  );

  return { expanded, setExpanded };
};
```

### 2. How User Settings are Stored and Managed

**Location:** `libs/bublik/features/user-preferences/`

User preferences use a schema-based approach with Zod validation:

**File:** `libs/bublik/features/user-preferences/src/lib/user-preferences-form/user-preference.types.ts`

```typescript
export const UserPreferencesSchema = z
  .object({
    history: z
      .object({
        defaultMode: z
          .enum(['linear', 'aggregation', 'measurements'])
          .default('linear')
      })
      .default({ defaultMode: 'linear' }),
    log: z
      .object({ preferLegacyLog: z.boolean().default(false) })
      .default({ preferLegacyLog: false })
  })
  .default({
    history: { defaultMode: 'linear' },
    log: { preferLegacyLog: false }
  })
  .catch({
    history: { defaultMode: 'linear' },
    log: { preferLegacyLog: false }
  });
```

**Storage:** LocalStorage via the `useLocalStorage` hook (key: `'user-preferences'`)

**File:** `libs/bublik/features/user-preferences/src/lib/user-preferences-form/user-preferences.hooks.ts`

```typescript
export function useUserPreferences() {
  const USER_PREFERENCES_KEY = 'user-preferences';
  const [userPreferences, setUserPreferences] =
    useLocalStorage<UserPreferences>(
      USER_PREFERENCES_KEY,
      USER_PREFERENCES_DEFAULTS
    );

  return { userPreferences, setUserPreferences };
}
```

**UI Component:** `libs/bublik/features/user-preferences/src/lib/user-preferences-form/user-preferences.component.tsx`

## Implementation Plan

### Phase 1: Update User Preferences Schema

**File:** `libs/bublik/features/user-preferences/src/lib/user-preferences-form/user-preference.types.ts`

**Changes:**
1. Add `defaultOpenLevel` property to the `log` section of the schema
2. Set reasonable default value (recommend `1` to maintain current behavior)
3. Add validation to ensure the value is a positive integer (0 or greater)

```typescript
export const UserPreferencesSchema = z
  .object({
    history: z
      .object({
        defaultMode: z
          .enum(['linear', 'aggregation', 'measurements'])
          .default('linear')
      })
      .default({ defaultMode: 'linear' }),
    log: z
      .object({ 
        preferLegacyLog: z.boolean().default(false),
        defaultOpenLevel: z.number().int().min(0).default(1)
      })
      .default({ preferLegacyLog: false, defaultOpenLevel: 1 })
  })
  .default({
    history: { defaultMode: 'linear' },
    log: { preferLegacyLog: false, defaultOpenLevel: 1 }
  })
  .catch({
    history: { defaultMode: 'linear' },
    log: { preferLegacyLog: false, defaultOpenLevel: 1 }
  });
```

### Phase 2: Add UI Control for Default Open Level

**File:** `libs/bublik/features/user-preferences/src/lib/user-preferences-form/user-preferences.component.tsx`

**Changes:**
1. Add a new field in the form to configure the default open level
2. Use a number input or radio buttons for better UX
3. Provide clear label and description explaining what the setting does

```tsx
// Add after the "Legacy Logs" checkbox (around line 87)
<div>
  <label className="text-sm font-medium leading-none mb-2 block">
    Default Log Expansion Level
  </label>
  <Controller
    name="log.defaultOpenLevel"
    control={control}
    render={({ field }) => (
      <div className="flex gap-2">
        {[0, 1, 2, 3].map((level) => (
          <ButtonTw
            key={level}
            type="button"
            size="sm"
            variant={field.value === level ? 'default' : 'outline'}
            onClick={() => field.onChange(level)}
            className="w-12"
          >
            {level}
          </ButtonTw>
        ))}
      </div>
    )}
  />
  <p className="text-sm text-text-menu mt-1.5">
    Set how many levels of nested log entries to expand by default (0 = all collapsed)
  </p>
</div>
```

### Phase 3: Update Log Table to Use User Preference

**File:** `libs/bublik/features/session-log/src/lib/v1/log-blocks/log-table/log-table.hooks.ts`

**Changes:**
1. Update `useLogTableExpandedState` to accept an optional `defaultOpenLevel` parameter
2. Pass this parameter to `getInitialExpandedState`
3. Keep backward compatibility by defaulting to `1` if not provided

```typescript
interface UseLogTableExpandedState {
  id: string;
  data: LogTableData[];
  defaultOpenLevel?: number;  // Add this parameter
}

export const useLogTableExpandedState = ({
  id,
  data,
  defaultOpenLevel = 1  // Default to 1 for backward compatibility
}: UseLogTableExpandedState) => {
  const [expanded, setExpanded] = useState<ExpandedState>(
    getInitialExpandedState(id, data, defaultOpenLevel)
  );

  return { expanded, setExpanded };
};
```

### Phase 4: Wire User Preference to Log Table

**File:** `libs/bublik/features/session-log/src/lib/v1/log-blocks/log-table/log-table.component.tsx`

**Changes:**
1. Import `useUserPreferences` hook
2. Extract the `defaultOpenLevel` from user preferences
3. Pass it to `useLogTableExpandedState`

```typescript
// Add import at the top
import { useUserPreferences } from '@/bublik/features/user-preferences';

// In BlockLogTable component
export const BlockLogTable = (props: LogTableBlock & { id: string }) => {
  const { id, data } = props;

  // Get user preferences
  const { userPreferences } = useUserPreferences();

  // 1. State
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const { setExpanded, expanded } = useLogTableExpandedState({ 
    id, 
    data,
    defaultOpenLevel: userPreferences.log.defaultOpenLevel 
  });
  // ... rest of the component
};
```

**Note:** Since `BlockLogTable` is a feature component that might be used in different contexts (e.g., stories, tests), we need to ensure it works without user preferences. The default value in the hook will handle this.

### Phase 5: Handle Edge Cases and Migration

**Considerations:**

1. **Existing users without this setting**: The `.catch()` clause in the schema will handle this by providing the default value of `1`

2. **Invalid values**: The Zod validation (`z.number().int().min(0)`) will ensure only valid integers >= 0 are accepted

3. **UI feedback**: When user changes the setting, log tables should reflect the change on next load. Current logs won't update until refreshed, which is acceptable behavior

4. **Maximum level**: While we don't enforce a maximum level, the UI only offers levels 0-3. Users can manually expand deeper levels if needed using the "Nesting Level" filter in the toolbar

## Files to Modify

### Summary

1. **`libs/bublik/features/user-preferences/src/lib/user-preferences-form/user-preference.types.ts`**
   - Update `UserPreferencesSchema` to include `log.defaultOpenLevel`
   - Update `USER_PREFERENCES_DEFAULTS` with new default

2. **`libs/bublik/features/user-preferences/src/lib/user-preferences-form/user-preferences.component.tsx`**
   - Add UI control for `defaultOpenLevel` configuration

3. **`libs/bublik/features/session-log/src/lib/v1/log-blocks/log-table/log-table.hooks.ts`**
   - Update `UseLogTableExpandedState` interface to accept optional `defaultOpenLevel`
   - Update `useLogTableExpandedState` to pass `defaultOpenLevel` to `getInitialExpandedState`

4. **`libs/bublik/features/session-log/src/lib/v1/log-blocks/log-table/log-table.component.tsx`**
   - Import `useUserPreferences`
   - Extract `defaultOpenLevel` from preferences
   - Pass to `useLogTableExpandedState`

## Testing Requirements

### Unit Tests

1. **Test `getInitialExpandedState` with different levels**
   - Verify level 0 expands nothing
   - Verify level 1 expands only depth 0
   - Verify level 2 expands depths 0 and 1
   - Verify rows with MI descendants are always expanded

2. **Test user preferences schema**
   - Verify default value is set correctly
   - Verify validation accepts valid integers
   - Verify validation rejects negative numbers
   - Verify validation rejects non-integers

### Integration Tests

1. **Test user preference persistence**
   - Change preference in UI
   - Verify it's saved to localStorage
   - Verify it's loaded correctly on page refresh

2. **Test log table behavior**
   - Load log with different default levels
   - Verify correct expansion behavior
   - Verify toolbar depth buttons still work correctly

### Manual Testing Checklist

- [ ] Settings page shows new "Default Log Expansion Level" field
- [ ] Default level is set to 1 (current behavior)
- [ ] Changing to 0 collapses all log entries
- [ ] Changing to 2 expands two levels by default
- [ ] Changing to 3 expands three levels by default
- [ ] Navigation to log page respects the setting
- [ ] Refreshing log page preserves the setting
- [ ] Toolbar depth buttons can override the default
- [ ] Existing users without this setting get default of 1
- [ ] localStorage persists the setting across sessions

## Implementation Approach

### Recommended Approach: Incremental Changes

1. **Start with schema update** (Phase 1) - Safest change, minimal risk
2. **Add UI control** (Phase 2) - Allows users to configure the setting
3. **Update hook** (Phase 3) - Prepare the log table to accept the parameter
4. **Wire to preferences** (Phase 4) - Connect everything together

This approach allows testing at each phase and makes debugging easier if issues arise.

### Alternative Approach: Context Provider

**Consideration:** An alternative would be to pass the defaultOpenLevel through the existing `SettingsContext` in `settings.context.tsx`.

**Pros:**
- Centralized settings management for log table
- Consistent with existing pattern (wordBreak setting)

**Cons:**
- Requires more extensive refactoring
- The current setting context is already being used for a different purpose
- User preferences need to be accessible at the context level anyway

**Decision:** Recommended to stick with the direct approach of importing and using `useUserPreferences` in `BlockLogTable`, as it's simpler and follows the existing pattern used in `log-page.tsx`.

## Backward Compatibility

The implementation maintains full backward compatibility:

1. **Default value of 1**: Maintains current behavior for all existing users
2. **Optional parameter**: The hook works without the preference if unavailable
3. **Schema catch clause**: Handles missing properties gracefully
4. **Type safety**: Zod validation ensures type safety

## Performance Considerations

- Reading from localStorage is synchronous and fast
- The preference is read once per component mount
- No performance impact on log rendering
- No network requests required

## Future Enhancements

Potential future improvements could include:

1. **Per-log-type defaults**: Different expansion levels for different log types (e.g., error logs vs. info logs)
2. **Remember last level**: Option to remember the last expanded level used
3. **Quick toggle**: Button in log toolbar to temporarily override default without changing settings
4. **Maximum level setting**: Allow users to configure UI for higher levels if needed

## Estimated Effort

- **Phase 1 (Schema)**: 30 minutes
- **Phase 2 (UI)**: 1 hour
- **Phase 3 (Hook)**: 30 minutes
- **Phase 4 (Integration)**: 1 hour
- **Testing**: 2-3 hours

**Total Estimated Time**: 5-6 hours

## Conclusion

This plan provides a straightforward, backward-compatible implementation that integrates seamlessly with the existing user preferences system. The changes are minimal and focused, reducing the risk of introducing bugs while delivering the requested functionality.
