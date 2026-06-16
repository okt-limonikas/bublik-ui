/* SPDX-License-Identifier: Apache-2.0 */
/* SPDX-FileCopyrightText: 2024-2026 OKTET LTD */
import { describe, expect, it } from 'vitest';

import { NodeEntity, RunData, RunsData, RUN_STATUS } from '@/shared/types';

import {
	buildFilterSummary,
	buildRunsProgressRows,
	sortRunsNewestFirst
} from './runs-progress.utils';

const baseStats = {
	abnormal: 0,
	failed: 0,
	failed_unexpected: 0,
	passed: 1,
	passed_unexpected: 0,
	skipped: 0,
	skipped_unexpected: 0
};

function createRun(id: number, start: string): RunsData {
	return {
		id,
		start,
		finish: start,
		relevant_tags: [],
		important_tags: [],
		metadata: [],
		stats: {
			tests_total: 1,
			tests_total_nok: 0,
			tests_total_nok_percent: 0,
			tests_total_ok: 1,
			tests_total_ok_percent: 100,
			tests_total_plan_percent: 100
		},
		status: 'ok',
		status_by_nok: 'ok',
		conclusion: RUN_STATUS.Ok
	};
}

function createRoot(testStats = baseStats): RunData {
	return {
		result_id: 1,
		test_id: 1,
		exec_seqno: 1,
		parent_id: null,
		type: NodeEntity.Package,
		test_name: 'root',
		period: '',
		path: ['root'],
		stats: testStats,
		children: [
			{
				result_id: 2,
				test_id: 2,
				exec_seqno: 1,
				parent_id: 1,
				type: NodeEntity.Test,
				test_name: 'procedure',
				period: '',
				path: ['root', 'procedure'],
				stats: testStats,
				children: []
			}
		]
	};
}

function createRootWithRepeatedTests(firstExecSeqno: number, secondExecSeqno: number): RunData {
	const root = createRoot(baseStats);

	root.children = [
		{
			...root.children[0],
			result_id: 2,
			exec_seqno: firstExecSeqno,
			stats: { ...baseStats, failed_unexpected: firstExecSeqno === 1 ? 1 : 0 }
		},
		{
			...root.children[0],
			result_id: 3,
			exec_seqno: secondExecSeqno,
			stats: { ...baseStats, failed_unexpected: secondExecSeqno === 1 ? 1 : 0 }
		}
	];

	return root;
}

describe('runs progress utils', () => {
	it('sorts runs newest first', () => {
		expect(
			sortRunsNewestFirst([
				createRun(1, '2024-01-01T00:00:00Z'),
				createRun(2, '2024-01-03T00:00:00Z'),
				createRun(3, '2024-01-02T00:00:00Z')
			]).map((run) => run.id)
		).toEqual([2, 3, 1]);
	});

	it('builds matrix tree rows and classifies improvements against older run', () => {
		const rows = buildRunsProgressRows([
			{
				run: createRun(2, '2024-01-02T00:00:00Z'),
				root: createRoot(baseStats)
			},
			{
				run: createRun(1, '2024-01-01T00:00:00Z'),
				root: createRoot({ ...baseStats, failed_unexpected: 1 })
			}
		]);

		expect(rows).toHaveLength(1);
		expect(rows[0].name).toBe('root');
		expect(rows[0].children).toHaveLength(1);
		expect(rows[0].children[0].name).toBe('procedure');
		expect(rows[0].children[0].cells[0].trend).toBe('improved');
	});

	it('matches repeated nodes by test id occurrence sorted by exec seqno', () => {
		const rows = buildRunsProgressRows([
			{
				run: createRun(2, '2024-01-02T00:00:00Z'),
				root: createRootWithRepeatedTests(2, 1)
			},
			{
				run: createRun(1, '2024-01-01T00:00:00Z'),
				root: createRootWithRepeatedTests(1, 2)
			}
		]);

		expect(rows[0].children).toHaveLength(2);
		expect(rows[0].children[0].cells[0].node?.exec_seqno).toBe(1);
		expect(rows[0].children[0].cells[0].previousNode?.exec_seqno).toBe(1);
	});

	it('summarizes active filters', () => {
		const params = new URLSearchParams({
			runData: 'conf=a;target=b',
			tagExpr: 'nightly',
			startDate: '2024-01-01',
			finishDate: '2024-01-02'
		});

		expect(buildFilterSummary(params)).toEqual([
			{ label: 'Metas', value: 'conf=a, target=b' },
			{ label: 'Tag expression', value: 'nightly' },
			{ label: 'Range', value: '2024-01-01 - 2024-01-02' }
		]);
	});
});
