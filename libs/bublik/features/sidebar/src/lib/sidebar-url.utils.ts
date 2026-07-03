/* SPDX-License-Identifier: Apache-2.0 */
/* SPDX-FileCopyrightText: 2024-2026 OKTET LTD */

import { createPath, parsePath } from 'react-router-dom';
import {
	compressToEncodedURIComponent,
	decompressFromEncodedURIComponent
} from 'lz-string';

import { SIDEBAR_PREFIX } from '@/shared/types';

import {
	DASHBOARD_SIDEBAR_KEYS,
	HISTORY_SIDEBAR_KEYS,
	LOG_SIDEBAR_KEYS,
	MEASUREMENTS_SIDEBAR_KEYS,
	RUNS_SIDEBAR_KEYS,
	RUN_SIDEBAR_KEYS,
	SHARED_SIDEBAR_KEYS,
	SIDEBAR_STATE_PARAM
} from './sidebar-state.constants';

type SidebarStateValue = string | string[];
type SidebarState = Record<string, SidebarStateValue>;
type EncodedParamInput = string | (string | null)[] | null | undefined;
type CompactSidebarState = [number, Record<string, SidebarStateValue>];

export const SIDEBAR_STATE_MAX_LENGTH = 1500;

/**
 * Value convention: a value starting with `/` is a full URL, anything else
 * for a URL key is a search string for that key's fixed pathname.
 * Default-equal entries are omitted entirely.
 */
const SIDEBAR_STATE_VERSION = 3;

const SIDEBAR_KEY_ALIASES = {
	[RUNS_SIDEBAR_KEYS.SELECTED]: 'rs',
	[RUNS_SIDEBAR_KEYS.LAST_LIST]: 'rll',
	[RUNS_SIDEBAR_KEYS.LAST_CHARTS]: 'rlc',
	[RUNS_SIDEBAR_KEYS.LAST_PROGRESS]: 'rlpr',
	[RUNS_SIDEBAR_KEYS.LAST_COMPARE]: 'rlp',
	[RUNS_SIDEBAR_KEYS.LAST_MULTIPLE]: 'rlm',
	[RUNS_SIDEBAR_KEYS.LAST_MODE]: 'rm',
	[RUN_SIDEBAR_KEYS.LAST_DETAILS]: 'rd',
	[RUN_SIDEBAR_KEYS.LAST_REPORT]: 'rr',
	[RUN_SIDEBAR_KEYS.LAST_MODE]: 'rnm',
	[MEASUREMENTS_SIDEBAR_KEYS.LAST_MEASUREMENTS]: 'mmu',
	[MEASUREMENTS_SIDEBAR_KEYS.LAST_MODE]: 'mm',
	[LOG_SIDEBAR_KEYS.LAST_LOG]: 'll',
	[LOG_SIDEBAR_KEYS.LAST_MODE]: 'lm',
	[HISTORY_SIDEBAR_KEYS.LAST_LINEAR]: 'hl',
	[HISTORY_SIDEBAR_KEYS.LAST_AGGREGATION]: 'ha',
	[HISTORY_SIDEBAR_KEYS.LAST_TREND]: 'ht',
	[HISTORY_SIDEBAR_KEYS.LAST_SERIES]: 'hs',
	[HISTORY_SIDEBAR_KEYS.LAST_STACKED]: 'hk',
	[HISTORY_SIDEBAR_KEYS.LAST_MODE]: 'hm',
	[SHARED_SIDEBAR_KEYS.CURRENT_RUN_ID]: 'cr',
	[DASHBOARD_SIDEBAR_KEYS.LAST_URL]: 'du'
} as const;

const SIDEBAR_KEY_ALIAS_MAP: Record<string, string> = SIDEBAR_KEY_ALIASES;

const SIDEBAR_ALIAS_KEYS = Object.fromEntries(
	Object.entries(SIDEBAR_KEY_ALIAS_MAP).map(([key, alias]) => [alias, key])
) as Record<string, string>;

const URL_STATE_KEYS = new Set<string>([
	RUNS_SIDEBAR_KEYS.LAST_LIST,
	RUNS_SIDEBAR_KEYS.LAST_CHARTS,
	RUNS_SIDEBAR_KEYS.LAST_PROGRESS,
	RUNS_SIDEBAR_KEYS.LAST_COMPARE,
	RUNS_SIDEBAR_KEYS.LAST_MULTIPLE,
	RUN_SIDEBAR_KEYS.LAST_DETAILS,
	RUN_SIDEBAR_KEYS.LAST_REPORT,
	MEASUREMENTS_SIDEBAR_KEYS.LAST_MEASUREMENTS,
	LOG_SIDEBAR_KEYS.LAST_LOG,
	HISTORY_SIDEBAR_KEYS.LAST_LINEAR,
	HISTORY_SIDEBAR_KEYS.LAST_AGGREGATION,
	HISTORY_SIDEBAR_KEYS.LAST_TREND,
	HISTORY_SIDEBAR_KEYS.LAST_SERIES,
	HISTORY_SIDEBAR_KEYS.LAST_STACKED,
	DASHBOARD_SIDEBAR_KEYS.LAST_URL
]);

/**
 * Keys whose pathname never changes are stored as bare search strings — the
 * pathname is re-attached on decode. Values that do start with `/` (dynamic
 * paths, unexpected pathnames, old payloads) pass through untouched.
 */
const SIDEBAR_KEY_PATHNAMES: Record<string, string> = {
	[RUNS_SIDEBAR_KEYS.LAST_LIST]: '/runs',
	[RUNS_SIDEBAR_KEYS.LAST_CHARTS]: '/runs',
	[RUNS_SIDEBAR_KEYS.LAST_PROGRESS]: '/runs',
	[RUNS_SIDEBAR_KEYS.LAST_COMPARE]: '/compare',
	[RUNS_SIDEBAR_KEYS.LAST_MULTIPLE]: '/multiple',
	[HISTORY_SIDEBAR_KEYS.LAST_LINEAR]: '/history',
	[HISTORY_SIDEBAR_KEYS.LAST_AGGREGATION]: '/history',
	[HISTORY_SIDEBAR_KEYS.LAST_TREND]: '/history',
	[HISTORY_SIDEBAR_KEYS.LAST_SERIES]: '/history',
	[HISTORY_SIDEBAR_KEYS.LAST_STACKED]: '/history',
	[DASHBOARD_SIDEBAR_KEYS.LAST_URL]: '/dashboard'
};

/**
 * Compact-form values that the per-feature hooks reconstruct on their own
 * (`lastListUrl || '/runs'`, `lastMode || 'linear'`, …) — storing them in `_s`
 * adds length without adding information, so they are dropped on encode.
 */
const SIDEBAR_KEY_DEFAULTS: Record<string, string> = {
	[RUNS_SIDEBAR_KEYS.LAST_MODE]: 'list',
	[RUNS_SIDEBAR_KEYS.LAST_CHARTS]: 'mode=charts',
	[RUNS_SIDEBAR_KEYS.LAST_PROGRESS]: 'mode=progress',
	[RUN_SIDEBAR_KEYS.LAST_MODE]: 'details',
	[HISTORY_SIDEBAR_KEYS.LAST_MODE]: 'linear',
	[LOG_SIDEBAR_KEYS.LAST_MODE]: 'treeAndinfoAndlog',
	[MEASUREMENTS_SIDEBAR_KEYS.LAST_MODE]: 'default'
};

const SIDEBAR_STATE_PRUNE_ORDER = [
	DASHBOARD_SIDEBAR_KEYS.LAST_URL,
	HISTORY_SIDEBAR_KEYS.LAST_STACKED,
	HISTORY_SIDEBAR_KEYS.LAST_SERIES,
	HISTORY_SIDEBAR_KEYS.LAST_TREND,
	HISTORY_SIDEBAR_KEYS.LAST_AGGREGATION,
	HISTORY_SIDEBAR_KEYS.LAST_LINEAR,
	MEASUREMENTS_SIDEBAR_KEYS.LAST_MEASUREMENTS,
	LOG_SIDEBAR_KEYS.LAST_LOG,
	RUN_SIDEBAR_KEYS.LAST_REPORT,
	RUN_SIDEBAR_KEYS.LAST_DETAILS,
	RUNS_SIDEBAR_KEYS.LAST_MULTIPLE,
	RUNS_SIDEBAR_KEYS.LAST_COMPARE,
	RUNS_SIDEBAR_KEYS.LAST_PROGRESS,
	RUNS_SIDEBAR_KEYS.LAST_CHARTS,
	RUNS_SIDEBAR_KEYS.LAST_LIST,
	HISTORY_SIDEBAR_KEYS.LAST_MODE,
	MEASUREMENTS_SIDEBAR_KEYS.LAST_MODE,
	LOG_SIDEBAR_KEYS.LAST_MODE,
	RUN_SIDEBAR_KEYS.LAST_MODE,
	RUNS_SIDEBAR_KEYS.LAST_MODE,
	RUNS_SIDEBAR_KEYS.SELECTED,
	SHARED_SIDEBAR_KEYS.CURRENT_RUN_ID
];

function getEncodedValue(input: EncodedParamInput): string | null | undefined {
	if (Array.isArray(input)) {
		return input[0] ?? null;
	}

	return input;
}

function isStringArray(value: unknown): value is string[] {
	return (
		Array.isArray(value) && value.every((item) => typeof item === 'string')
	);
}

function normalizeSidebarState(value: unknown): SidebarState {
	if (!value || typeof value !== 'object' || Array.isArray(value)) {
		return {};
	}

	const normalized: SidebarState = {};

	for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
		if (typeof entry === 'string' || isStringArray(entry)) {
			normalized[key] = entry;
		}
	}

	return normalized;
}

function isCompactSidebarState(value: unknown): value is CompactSidebarState {
	return (
		Array.isArray(value) &&
		value.length === 2 &&
		value[0] === SIDEBAR_STATE_VERSION &&
		!!value[1] &&
		typeof value[1] === 'object' &&
		!Array.isArray(value[1])
	);
}

function normalizeSidebarStateValue(
	key: string,
	value: SidebarStateValue
): SidebarStateValue | null {
	if (isStringArray(value)) {
		const normalizedValues = value.filter(Boolean);
		return normalizedValues.length > 0 ? normalizedValues : null;
	}

	const normalizedValue = URL_STATE_KEYS.has(key)
		? stripSidebarParamsFromUrl(value)
		: value;

	return normalizedValue ? normalizedValue : null;
}

function toCompactValue(key: string, value: string): string {
	const pathname = SIDEBAR_KEY_PATHNAMES[key];
	if (!pathname) {
		return value;
	}

	if (value === pathname) {
		return '';
	}

	if (value.startsWith(`${pathname}?`)) {
		return value.slice(pathname.length + 1);
	}

	return value;
}

function fromCompactValue(key: string, value: string): string {
	if (value.startsWith('/')) {
		return value;
	}

	const pathname = SIDEBAR_KEY_PATHNAMES[key];
	if (!pathname) {
		return value;
	}

	return value ? `${pathname}?${value}` : pathname;
}

function getCompactDefault(
	key: string,
	sidebarState: SidebarState
): string | null {
	const staticDefault = SIDEBAR_KEY_DEFAULTS[key];
	if (staticDefault !== undefined) {
		return staticDefault;
	}

	const runId = sidebarState[SHARED_SIDEBAR_KEYS.CURRENT_RUN_ID];
	if (typeof runId === 'string' && runId) {
		if (key === RUN_SIDEBAR_KEYS.LAST_DETAILS) {
			return `/runs/${runId}`;
		}
		if (key === LOG_SIDEBAR_KEYS.LAST_LOG) {
			return `/log/${runId}`;
		}
	}

	return null;
}

function decodeSidebarState(value: string): SidebarState {
	const decodedState = decodeCompressedState<unknown>(value);
	if (!isCompactSidebarState(decodedState)) {
		return {};
	}

	const normalized: SidebarState = {};

	for (const [alias, entry] of Object.entries(decodedState[1])) {
		const key = SIDEBAR_ALIAS_KEYS[alias];
		if (!key || !(typeof entry === 'string' || isStringArray(entry))) {
			continue;
		}

		const expandedValue =
			typeof entry === 'string' ? fromCompactValue(key, entry) : entry;
		const normalizedValue = normalizeSidebarStateValue(key, expandedValue);
		if (normalizedValue) {
			normalized[key] = normalizedValue;
		}
	}

	// URLs omitted on encode as equal to the CURRENT_RUN_ID-derived default
	// must be re-materialized: the run id is mutable, so once it changes the
	// omitted URL would otherwise be re-derived from the wrong run.
	const runId = normalized[SHARED_SIDEBAR_KEYS.CURRENT_RUN_ID];
	if (typeof runId === 'string' && runId) {
		normalized[RUN_SIDEBAR_KEYS.LAST_DETAILS] ??= `/runs/${runId}`;
		normalized[LOG_SIDEBAR_KEYS.LAST_LOG] ??= `/log/${runId}`;
	}

	return normalized;
}

function compactSidebarState(sidebarState: SidebarState): CompactSidebarState {
	const compactState: Record<string, SidebarStateValue> = {};

	for (const [key, value] of Object.entries(sidebarState)) {
		const alias = SIDEBAR_KEY_ALIAS_MAP[key];
		if (!alias) {
			continue;
		}

		const normalizedValue = normalizeSidebarStateValue(key, value);
		if (!normalizedValue) {
			continue;
		}

		if (isStringArray(normalizedValue)) {
			compactState[alias] = normalizedValue;
			continue;
		}

		const compactValue = toCompactValue(key, normalizedValue);
		if (
			!compactValue ||
			compactValue === getCompactDefault(key, sidebarState)
		) {
			continue;
		}

		compactState[alias] = compactValue;
	}

	return [SIDEBAR_STATE_VERSION, compactState];
}

function isEmptyCompactState(sidebarState: SidebarState): boolean {
	return Object.keys(compactSidebarState(sidebarState)[1]).length === 0;
}

function encodeSidebarState(sidebarState: SidebarState): string {
	return encodeCompressedState(compactSidebarState(sidebarState));
}

function pruneSidebarState(sidebarState: SidebarState): SidebarState {
	const prunedState = { ...sidebarState };
	let encodedState = encodeSidebarState(prunedState);

	for (const key of SIDEBAR_STATE_PRUNE_ORDER) {
		if (encodedState.length <= SIDEBAR_STATE_MAX_LENGTH) {
			return prunedState;
		}

		delete prunedState[key];
		encodedState = encodeSidebarState(prunedState);
	}

	if (encodedState.length <= SIDEBAR_STATE_MAX_LENGTH) {
		return prunedState;
	}

	return {};
}

function tryParseJson<T>(value: string): T | undefined {
	try {
		return JSON.parse(value) as T;
	} catch {
		return undefined;
	}
}

function parseLegacyJsonState<T>(value: string): T | undefined {
	const directValue = tryParseJson<T>(value);
	if (directValue !== undefined) {
		return directValue;
	}

	return tryParseJson<T>(decodeURIComponent(value));
}

function removeLegacySidebarParams(searchParams: URLSearchParams): void {
	const keysToRemove: string[] = [];

	searchParams.forEach((_, key) => {
		if (key.startsWith(`${SIDEBAR_PREFIX}.`)) {
			keysToRemove.push(key);
		}
	});

	keysToRemove.forEach((key) => searchParams.delete(key));
}

/**
 * Encodes any serializable value to a URI-safe compressed string.
 */
export function encodeCompressedState(value: unknown): string {
	return compressToEncodedURIComponent(JSON.stringify(value));
}

/**
 * Decodes a URI-safe lz-string compressed state value.
 */
export function decodeCompressedState<T>(value: string): T | null {
	const json = decompressFromEncodedURIComponent(value);
	if (!json) {
		return null;
	}

	const parsed = tryParseJson<T>(json);
	return parsed === undefined ? null : parsed;
}

let cachedEncodedState: string | null = null;
let cachedSidebarState: SidebarState = {};

/**
 * Reads compressed sidebar state from `_s` URL param. The same encoded value
 * is read many times per render across the nav hooks, so the last decode is
 * memoized; callers get a copy (arrays included) because
 * `updateSidebarStateSearchParams` mutates the returned map.
 */
export function getSidebarState(searchParams: URLSearchParams): SidebarState {
	const encodedState = searchParams.get(SIDEBAR_STATE_PARAM);

	if (!encodedState) {
		return {};
	}

	if (encodedState !== cachedEncodedState) {
		cachedSidebarState = decodeSidebarState(encodedState);
		cachedEncodedState = encodedState;
	}

	const copy: SidebarState = {};
	for (const [key, value] of Object.entries(cachedSidebarState)) {
		copy[key] = Array.isArray(value) ? [...value] : value;
	}

	return copy;
}

/**
 * Returns a string value from compressed sidebar state.
 */
export function getSidebarStateString(
	searchParams: URLSearchParams,
	key: string
): string | null {
	const value = getSidebarState(searchParams)[key];
	return typeof value === 'string' ? value : null;
}

/**
 * Returns a string array value from compressed sidebar state.
 */
export function getSidebarStateStringArray(
	searchParams: URLSearchParams,
	key: string
): string[] {
	const value = getSidebarState(searchParams)[key];
	return isStringArray(value) ? value : [];
}

/**
 * Updates a key in compressed sidebar state map.
 */
export function setSidebarStateValue(
	sidebarState: SidebarState,
	key: string,
	value: SidebarStateValue | null | undefined
): void {
	if (value === null || value === undefined) {
		delete sidebarState[key];
		return;
	}

	sidebarState[key] = value;
}

/**
 * Applies updater to compressed sidebar state and writes back to `_s`.
 * States that compact to nothing (only default-equal entries) remove the
 * param entirely, so default browsing produces clean URLs.
 */
export function updateSidebarStateSearchParams(
	searchParams: URLSearchParams,
	updater: (sidebarState: SidebarState) => void
): URLSearchParams | null {
	return getUpdatedSearchParams(searchParams, (newParams) => {
		removeLegacySidebarParams(newParams);

		const sidebarState = getSidebarState(newParams);
		updater(sidebarState);
		const prunedState = pruneSidebarState(normalizeSidebarState(sidebarState));

		if (isEmptyCompactState(prunedState)) {
			newParams.delete(SIDEBAR_STATE_PARAM);
			return;
		}

		newParams.set(SIDEBAR_STATE_PARAM, encodeSidebarState(prunedState));
	});
}

export function getUpdatedSearchParams(
	searchParams: URLSearchParams,
	updater: (newParams: URLSearchParams) => void
): URLSearchParams | null {
	const newParams = new URLSearchParams(searchParams);
	updater(newParams);

	return newParams.toString() === searchParams.toString() ? null : newParams;
}

/**
 * Strips sidebar params from a URL to avoid recursive state growth.
 */
export function stripSidebarParamsFromUrl(url: string): string {
	const path = parsePath(url);
	if (!path.search) {
		return url;
	}

	const params = new URLSearchParams(path.search);

	const keysToRemove: string[] = [];
	params.forEach((value, key) => {
		if (
			key.startsWith(`${SIDEBAR_PREFIX}.`) ||
			key === SIDEBAR_STATE_PARAM ||
			key === 'project' ||
			(key === 'mode' && value === 'default')
		) {
			keysToRemove.push(key);
		}
	});
	keysToRemove.forEach((key) => params.delete(key));

	const search = params.toString();
	return createPath({
		pathname: path.pathname ?? '',
		search: search ? `?${search}` : '',
		hash: path.hash
	});
}

/**
 * Reads the `mode` query param and validates it against an allow-list,
 * returning the default when it is absent or unknown. Shared by the
 * per-feature sidebar navs.
 */
export function getModeFromSearch<T extends string>(
	search: string,
	allowedModes: readonly T[],
	defaultMode: T
): T {
	const mode = new URLSearchParams(search).get('mode');
	return mode && allowedModes.includes(mode as T) ? (mode as T) : defaultMode;
}

/**
 * Gets base URL without mode parameter.
 */
export function getBaseUrl(url: string): string {
	const path = parsePath(url);
	if (!path.search) {
		return url;
	}

	const params = new URLSearchParams(path.search);
	params.delete('mode');
	const search = params.toString();
	return createPath({
		pathname: path.pathname ?? '',
		search: search ? `?${search}` : '',
		hash: path.hash
	});
}

/**
 * Adds mode parameter to URL.
 */
export function addModeToUrl(baseUrl: string, mode: string): string {
	const path = parsePath(baseUrl);
	const params = new URLSearchParams(path.search ?? '');

	if (mode === 'default') {
		params.delete('mode');
	} else {
		params.set('mode', mode);
	}

	const search = params.toString();
	return createPath({
		pathname: path.pathname ?? '',
		search: search ? `?${search}` : '',
		hash: path.hash
	});
}

/**
 * Generic function to extract ID from URL using a regex pattern.
 */
export function extractIdFromUrl(url: string, pattern: RegExp): string | null {
	const match = url.match(pattern);
	return match ? match[1] : null;
}

/**
 * Extracts runId from a run URL like /runs/86793 or /runs/86793/report
 */
export function extractRunIdFromUrl(url: string): string | null {
	return extractIdFromUrl(url, /\/runs\/(\d+)/);
}

/**
 * Extracts runId from a log URL like /log/86793 or /log/86793?mode=...
 */
export function extractRunIdFromLogUrl(url: string): string | null {
	return extractIdFromUrl(url, /\/log\/(\d+)/);
}

/**
 * Decodes compressed state first, then falls back to plain JSON.
 */
export function decodeCompressedOrJsonState<T>(
	input: EncodedParamInput
): T | null | undefined {
	const rawValue = getEncodedValue(input);

	if (rawValue === null || rawValue === undefined) {
		return rawValue;
	}

	const compressedValue = decodeCompressedState<T>(rawValue);
	if (compressedValue !== null) {
		return compressedValue;
	}

	return parseLegacyJsonState<T>(rawValue);
}

/**
 * Returns true if value is encoded as compressed state.
 */
export function isCompressedStateValue(value: string): boolean {
	return decodeCompressedState<unknown>(value) !== null;
}