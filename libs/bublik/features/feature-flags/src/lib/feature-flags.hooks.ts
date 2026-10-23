/* SPDX-License-Identifier: Apache-2.0 */
/* SPDX-FileCopyrightText: 2026 OKTET LTD */
import { useCallback, useMemo } from 'react';

import { useLocalStorage } from '@/shared/hooks';

import {
	FEATURE_FLAGS,
	FEATURE_FLAGS_STORAGE_KEY,
	FeatureFlagId,
	FeatureFlagsState,
	isFeatureFlagId
} from './feature-flags.registry';

// A stable reference: `useLocalStorage` keys its snapshot on the initial value.
const NO_FLAGS: FeatureFlagsState = {};

/** Keeps only known flags with boolean values, so a stale or hand-edited entry is ignored. */
const sanitize = (stored: unknown): FeatureFlagsState => {
	if (!stored || typeof stored !== 'object') return NO_FLAGS;

	const result: FeatureFlagsState = {};

	for (const [key, value] of Object.entries(stored)) {
		if (isFeatureFlagId(key) && typeof value === 'boolean') result[key] = value;
	}

	return result;
};

/**
 * All feature flags and their switches. The state lives in localStorage, so
 * every caller, and every tab, sees the same value without a provider.
 */
function useFeatureFlags(): {
	flags: Record<FeatureFlagId, boolean>;
	isEnabled: (id: FeatureFlagId) => boolean;
	setFlag: (id: FeatureFlagId, enabled: boolean) => void;
	resetFlags: () => void;
} {
	const [stored, setStored] = useLocalStorage<FeatureFlagsState>(
		FEATURE_FLAGS_STORAGE_KEY,
		NO_FLAGS
	);

	const flags = useMemo(() => {
		const known = sanitize(stored);

		return Object.fromEntries(
			FEATURE_FLAGS.map((flag) => [flag.id, known[flag.id] ?? false])
		) as Record<FeatureFlagId, boolean>;
	}, [stored]);

	const isEnabled = useCallback((id: FeatureFlagId) => flags[id], [flags]);

	const setFlag = useCallback(
		(id: FeatureFlagId, enabled: boolean) =>
			setStored((previous) => ({ ...sanitize(previous), [id]: enabled })),
		[setStored]
	);

	const resetFlags = useCallback(() => setStored(NO_FLAGS), [setStored]);

	return { flags, isEnabled, setFlag, resetFlags };
}

/** One flag: whether it is on, and a setter for it. */
function useFeatureFlag(
	id: FeatureFlagId
): [enabled: boolean, setEnabled: (enabled: boolean) => void] {
	const { flags, setFlag } = useFeatureFlags();
	const setEnabled = useCallback(
		(enabled: boolean) => setFlag(id, enabled),
		[id, setFlag]
	);

	return [flags[id], setEnabled];
}

export { useFeatureFlags, useFeatureFlag };
