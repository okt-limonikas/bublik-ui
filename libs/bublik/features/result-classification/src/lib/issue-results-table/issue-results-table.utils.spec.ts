/* SPDX-License-Identifier: Apache-2.0 */
/* SPDX-FileCopyrightText: 2026 OKTET LTD */
import { describe, expect, it } from 'vitest';

import {
	issueResultRunId,
	issueResultTestName
} from './issue-results-table.utils';
import type { ResultRow } from './issue-results-table.types';

const row = (over: Partial<ResultRow> = {}): ResultRow => ({
	name: 'ethtool_reset',
	result_id: 1,
	iteration_id: 2,
	run_id: 11,
	has_measurements: false,
	has_error: true,
	expected_results: [],
	obtained_result: { result_type: 'FAILED', verdicts: [] },
	comments: [],
	parameters: [],
	start: '2026-01-01T00:00:00Z',
	...over
});

describe('issueResultTestName', () => {
	// The classified-result listings go through `generate_results_details`,
	// which names the test but carries no package chain to prefix it with.
	it('is the test name the row carries', () => {
		expect(issueResultTestName(row())).toBe('ethtool_reset');
	});

	it('is empty when the row does not name a test', () => {
		expect(issueResultTestName(row({ name: '' }))).toBe('');
	});
});

describe('issueResultRunId', () => {
	it('prefers the scope it was rendered in', () => {
		expect(issueResultRunId(7243, row({ run_id: 11 }))).toBe(7243);
	});

	it('falls back to the row when there is no run scope', () => {
		expect(issueResultRunId(undefined, row({ run_id: 11 }))).toBe(11);
	});
});
