/* SPDX-License-Identifier: Apache-2.0 */
/* SPDX-FileCopyrightText: 2024-2026 OKTET LTD */
import {
	sortFn_alphanumeric,
	sortFn_datetime,
	sortFn_text
} from '@tanstack/react-table';

/**
 * Built-in sort functions that `sortFn: 'auto'` picks from.
 * TanStack Table v9 only resolves registered functions, so tables that sort
 * by inferred value type register these to keep v8 behaviour.
 */
export const AUTO_SORT_FNS = {
	alphanumeric: sortFn_alphanumeric,
	datetime: sortFn_datetime,
	text: sortFn_text
};
