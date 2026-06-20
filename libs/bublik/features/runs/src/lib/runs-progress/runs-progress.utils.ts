/* SPDX-License-Identifier: Apache-2.0 */
/* SPDX-FileCopyrightText: 2024-2026 OKTET LTD */
import { RunData, RunsData, RunStats } from '@/shared/types';

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

type AnnotatedNode = {
	key: string;
	parentKey: string | null;
	node: RunData;
	depth: number;
};

function annotateRunNodes(root: RunData): AnnotatedNode[] {
	const nodes: AnnotatedNode[] = [];

	function visit(
		node: RunData,
		parentKey: string | null,
		depth: number,
		key: string
	) {
		nodes.push({ key, parentKey, node, depth });

		const childrenByTestId = new Map<number, RunData[]>();

		node.children.forEach((child) => {
			childrenByTestId.set(child.test_id, [
				...(childrenByTestId.get(child.test_id) ?? []),
				child
			]);
		});

		childrenByTestId.forEach((children) => {
			children.sort((left, right) => left.exec_seqno - right.exec_seqno);
		});

		[...node.children]
			.sort((left, right) => left.exec_seqno - right.exec_seqno)
			.forEach((child) => {
				const siblings = childrenByTestId.get(child.test_id) ?? [];
				const occurrence =
					siblings.findIndex(
						(sibling) => sibling.exec_seqno === child.exec_seqno
					) + 1;
				const childKey = `${key}/${child.type}:${child.test_id}:${occurrence}`;

				visit(child, key, depth + 1, childKey);
			});
	}

	visit(root, null, 0, `${root.type}:${root.test_id}:1`);

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

function getUnexpectedTotal(stats: RunStats): number {
	return (
		stats.passed_unexpected + stats.failed_unexpected + stats.skipped_unexpected
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
	const rowByKey = new Map<string, RunsProgressRow>();
	const nodeMaps = runs.map(({ root }) => {
		const nodeMap = new Map<string, RunData>();

		annotateRunNodes(root).forEach(({ key, parentKey, node, depth }) => {
			nodeMap.set(key, node);

			if (!rowByKey.has(key)) {
				rowByKey.set(key, {
					id: key,
					name: node.test_name,
					type: node.type,
					path: node.path,
					depth,
					cells: [],
					children: []
				});
			}

			const row = rowByKey.get(key);
			const parent = parentKey ? rowByKey.get(parentKey) : null;

			if (row && parent && !parent.children.some((child) => child.id === row.id)) {
				parent.children.push(row);
			}
		});

		return nodeMap;
	});

	rowByKey.forEach((row) => {
		row.cells = runs.map(({ run }, runIndex) => {
				const node = nodeMaps[runIndex].get(row.id) ?? null;
				const previousNode = nodeMaps[runIndex + 1]?.get(row.id) ?? null;

				return {
					runId: run.id,
					node,
					previousNode,
					trend: getNodeTrend(node, previousNode)
				};
			});
	});

	return Array.from(rowByKey.values()).filter((row) => row.depth === 0);
}

function rowHasChange(row: RunsProgressRow): boolean {
	return row.cells.some((cell) => cell.trend !== 'same');
}

/**
 * Keeps rows that changed between runs plus all of their ancestors, so the tree
 * context around a change survives the filter. A subtree is kept when the row
 * itself changed or any of its descendants changed.
 */
function filterChangedRows(rows: RunsProgressRow[]): RunsProgressRow[] {
	function visit(row: RunsProgressRow): RunsProgressRow | null {
		const children = row.children
			.map(visit)
			.filter((child): child is RunsProgressRow => child !== null);

		if (!children.length && !rowHasChange(row)) return null;

		return { ...row, children };
	}

	return rows
		.map(visit)
		.filter((row): row is RunsProgressRow => row !== null);
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
	filterChangedRows,
	getNodeStats,
	getStatsTotal,
	getUnexpectedTotal,
	rowHasChange,
	sortRunsNewestFirst
};
