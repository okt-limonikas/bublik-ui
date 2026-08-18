/* SPDX-License-Identifier: Apache-2.0 */
/* SPDX-FileCopyrightText: 2024-2026 OKTET LTD */

/** Every mode the history page renders, as spelled in `?mode=`. */
export const HISTORY_PAGE_MODES = [
	'linear',
	'aggregation',
	'measurements',
	'measurements-by-iteration',
	'measurements-combined'
] as const;

export type HistoryPageMode = (typeof HISTORY_PAGE_MODES)[number];

/** A missing or unknown `?mode=` falls back to the list of results. */
export function resolveHistoryMode(mode?: string | null): HistoryPageMode {
	return HISTORY_PAGE_MODES.includes(mode as HistoryPageMode)
		? (mode as HistoryPageMode)
		: 'linear';
}
