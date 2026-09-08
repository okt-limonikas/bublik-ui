/* SPDX-License-Identifier: Apache-2.0 */
/* SPDX-FileCopyrightText: 2026 OKTET LTD */
import type { ResultRow } from './issue-results-table.types';

export function issueResultRunId(
	runId: number | string | undefined,
	row: ResultRow
): number | string | undefined {
	return runId ?? row.run_id;
}

/**
 * The test's own name, which is all the row has.
 *
 * `generate_results_details` names the test but not the package chain above
 * it — the run tree assembles that from the tree endpoint, not from a result.
 * This used to join a `path` the classified-result listings never returned.
 */
export function issueResultTestName(row: ResultRow): string {
	return row.name ?? '';
}
