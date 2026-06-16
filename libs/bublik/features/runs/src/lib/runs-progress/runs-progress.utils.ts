/* SPDX-License-Identifier: Apache-2.0 */
/* SPDX-FileCopyrightText: 2024-2026 OKTET LTD */
import { NodeEntity, RunData, RunsData, RunStats } from '@/shared/types';

import {
	RunsProgressFilterSummary,
	RunsProgressRow,
	RunsProgressRun,
	RunsProgressTrend
} from './runs-progress.types';

const EMPTY_STATS: RunStats = {
	abnormal: 0,
	failed: 0,
	failed_unexpected: 0,
	passed: 0,
	passed_unexpected: 0,
	skipped: 0,
	skipped_unexpected: 0
};

function getNodeKey(node: RunData): string {
	const path = node.path.length ? node.path.join('/') : node.test_name;

	return `${node.type}:${path}`;
}

function flattenRunNodes(root: RunData): RunData[] {
	const nodes: RunData[] = [];

	function visit(node: RunData) {
		if (node.type === NodeEntity.Test) nodes.push(node);

		node.children.forEach(visit);
	}

	visit(root);

	return nodes;
}

function getStatsBadness(node: RunData | null): number | null {
	if (!node) return null;

	const stats = node.stats;

	return (
		stats.abnormal * 4 +
		stats.failed_unexpected * 4 +
		stats.failed * 2 +
		stats.passed_unexpected * 2 +
		stats.skipped_unexpected +
		stats.skipped
	);
}

function getStatsTotal(stats: RunStats): number {
	return (
		stats.abnormal +
		stats.failed +
		stats.failed_unexpected +
		stats.passed +
		stats.passed_unexpected +
		stats.skipped +
		stats.skipped_unexpected
	);
}

function getNodeStats(node: RunData | null): RunStats {
	return node?.stats ?? EMPTY_STATS;
}

function getNodeTrend(
	node: RunData | null,
	previousNode: RunData | null
): RunsProgressTrend {
	if (node && !previousNode) return 'added';
	if (!node && previousNode) return 'removed';
	if (!node && !previousNode) return 'same';

	const badness = getStatsBadness(node);
	const previousBadness = getStatsBadness(previousNode);

	if (badness === previousBadness) return 'same';
	if (badness === null || previousBadness === null) return 'changed';
	if (badness < previousBadness) return 'improved';
	if (badness > previousBadness) return 'regressed';

	return 'changed';
}

function buildRunsProgressRows(runs: RunsProgressRun[]): RunsProgressRow[] {
	const rowByKey = new Map<string, Omit<RunsProgressRow, 'cells'>>();
	const nodeMaps = runs.map(({ root }) => {
		const nodeMap = new Map<string, RunData>();

		flattenRunNodes(root).forEach((node) => {
			const key = getNodeKey(node);
			nodeMap.set(key, node);

			if (!rowByKey.has(key)) {
				rowByKey.set(key, {
					id: key,
					name: node.test_name,
					path: node.path,
					depth: Math.max(node.path.length - 1, 0)
				});
			}
		});

		return nodeMap;
	});

	return Array.from(rowByKey.values())
		.sort((left, right) => left.path.join('/').localeCompare(right.path.join('/')))
		.map((row) => ({
			...row,
			cells: runs.map(({ run }, runIndex) => {
				const node = nodeMaps[runIndex].get(row.id) ?? null;
				const previousNode = nodeMaps[runIndex + 1]?.get(row.id) ?? null;

				return {
					runId: run.id,
					node,
					previousNode,
					trend: getNodeTrend(node, previousNode)
				};
			})
		}));
}

function sortRunsNewestFirst(runs: RunsData[]): RunsData[] {
	return [...runs].sort((left, right) => {
		return new Date(right.start).getTime() - new Date(left.start).getTime();
	});
}

function buildFilterSummary(searchParams: URLSearchParams): RunsProgressFilterSummary[] {
	const summary: RunsProgressFilterSummary[] = [];
	const runData = searchParams.get('runData');
	const tagExpr = searchParams.get('tagExpr');
	const calendarMode = searchParams.get('calendarMode');
	const duration = searchParams.get('duration');
	const startDate = searchParams.get('startDate');
	const finishDate = searchParams.get('finishDate');

	if (runData) summary.push({ label: 'Metas', value: runData.split(';').join(', ') });
	if (tagExpr) summary.push({ label: 'Tag expression', value: tagExpr });
	if (calendarMode === 'duration' && duration) {
		summary.push({ label: 'Range', value: duration });
	} else if (startDate || finishDate) {
		summary.push({ label: 'Range', value: `${startDate || '...'} - ${finishDate || '...'}` });
	}

	return summary;
}

export {
	buildFilterSummary,
	buildRunsProgressRows,
	getNodeStats,
	getStatsTotal,
	sortRunsNewestFirst
};
