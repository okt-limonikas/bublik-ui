/* SPDX-License-Identifier: Apache-2.0 */
/* SPDX-FileCopyrightText: 2024-2026 OKTET LTD */
import { addDays, differenceInCalendarDays, format, parseISO } from 'date-fns';

import { RunData, RunsData, RunStats } from '@/shared/types';
import { formatTimeToAPI } from '@/shared/utils';

import {
	RunsProgressFilterSummary,
	RunsProgressGroup,
	RunsProgressRow,
	RunsProgressRun,
	RunsProgressTrend,
	RunsProgressTrendDirection
} from './runs-progress.types';

const OTHER_GROUP_ID = '__other__';

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
					objective: node.objective,
					cells: [],
					children: []
				});
			}

			const row = rowByKey.get(key);
			const parent = parentKey ? rowByKey.get(parentKey) : null;

			if (
				row &&
				parent &&
				!parent.children.some((child) => child.id === row.id)
			) {
				parent.children.push(row);
			}
		});

		return nodeMap;
	});

	rowByKey.forEach((row) => {
		row.cells = runs.map(({ run, groupId }, runIndex) => {
			const node = nodeMaps[runIndex].get(row.id) ?? null;
			// The trend baseline is the next (older) run, but only when it shares
			// this run's group, so grouped views compare like-for-like and the
			// oldest run of a group has no baseline.
			const previousRun = runs[runIndex + 1];
			const sameGroup = previousRun ? previousRun.groupId === groupId : false;
			const previousNode = sameGroup
				? nodeMaps[runIndex + 1]?.get(row.id) ?? null
				: null;

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

	return rows.map(visit).filter((row): row is RunsProgressRow => row !== null);
}

/** Metadata/tag items are `KEY=VALUE`; the key is the part before the first `=`. */
function getMetadataKey(item: string): string {
	const index = item.indexOf('=');

	return index === -1 ? item : item.slice(0, index);
}

/** Distinct metadata keys across all runs, sorted for a stable group-by menu. */
function getMetadataKeys(runs: RunsData[]): string[] {
	const keys = new Set<string>();

	runs.forEach((run) => {
		run.metadata.filter(Boolean).forEach((item) => {
			keys.add(getMetadataKey(item));
		});
	});

	return Array.from(keys).sort((left, right) => left.localeCompare(right));
}

/** Value of the run's `key=...` metadata item, or null when the key is absent. */
function getRunGroupValue(run: RunsData, key: string): string | null {
	const prefix = `${key}=`;
	const item = run.metadata.find((entry) => entry.startsWith(prefix));

	return item ? item.slice(prefix.length) : null;
}

// Calendar anchor for time-frame bucketing: 1 Jan 2024 is a Monday, so a 7-day
// window aligns to ISO weeks (Mon–Sun). Bucket boundaries are derived from the
// calendar alone (not from the present run set), so the same run always lands in
// the same window regardless of the selected date range.
const GROUP_TIME_ANCHOR = new Date(2024, 0, 1);

type TimeBucket = { id: string; label: string };

/**
 * Maps a run to its fixed N-day calendar window. The run's local start day is
 * measured in whole days from {@link GROUP_TIME_ANCHOR}; flooring by `days` keeps
 * windows calendar-stable. The label is a single day (`Jun 23`) for 1-day windows
 * and a span (`Jun 16 – 22`) otherwise.
 */
function getTimeBucket(run: RunsData, days: number): TimeBucket {
	const runDay = parseISO(formatTimeToAPI(parseISO(run.start)));
	const index = Math.floor(
		differenceInCalendarDays(runDay, GROUP_TIME_ANCHOR) / days
	);
	const start = addDays(GROUP_TIME_ANCHOR, index * days);
	const end = addDays(start, days - 1);
	const label =
		days === 1
			? format(start, 'MMM d')
			: `${format(start, 'MMM d')} – ${format(end, 'MMM d')}`;

	return { id: String(index), label };
}

type GroupByOptions = {
	/** N-day calendar window for the outer band; null disables time grouping. */
	timeFrameDays: number | null;
	/** Metadata key for the inner partition; null disables metadata grouping. */
	metaKey: string | null;
};

type GroupRunsResult = {
	orderedRuns: RunsProgressRun[];
	/** Finest partition: drives the lower band, trend baselines, and h/l nav. */
	groups: RunsProgressGroup[];
	/** Outer time band, populated only when both dimensions are active. */
	timeGroups: RunsProgressGroup[];
};

/**
 * Buckets runs into up to two nested levels: an outer calendar time window and an
 * inner metadata-value partition. Same-window/same-configuration runs sit together
 * so runs can be reviewed in dated batches.
 *
 * The leaf `groups` is always the *finest* partition present — meta-only behaves
 * exactly as the original single-key grouping, time-only yields one band of dated
 * windows, and both yields metadata groups nested under each window. Each run's
 * composite `groupId` (`time|meta`) resets the trend baseline at the inner-most
 * boundary. `timeGroups` (the outer band) is only filled when both dimensions are
 * active. Runs keep their incoming (newest-first) order within a leaf; time windows
 * order newest-first, metadata values by first appearance, with a trailing
 * "No <key>" bucket for runs missing the key. With neither dimension the runs pass
 * through unchanged.
 */
function groupRuns(
	runs: RunsProgressRun[],
	{ timeFrameDays, metaKey }: GroupByOptions
): GroupRunsResult {
	if (!timeFrameDays && !metaKey) {
		return { orderedRuns: runs, groups: [], timeGroups: [] };
	}

	type Leaf = {
		groupId: string;
		timeId: string;
		timeLabel: string;
		metaLabel: string;
		members: RunsProgressRun[];
	};

	const leaves = new Map<string, Leaf>();
	const leafOrder: string[] = [];

	runs.forEach((progressRun) => {
		const time = timeFrameDays
			? getTimeBucket(progressRun.run, timeFrameDays)
			: { id: '', label: '' };
		const metaValue = metaKey
			? getRunGroupValue(progressRun.run, metaKey) ?? OTHER_GROUP_ID
			: '';
		const groupId = `${time.id}|${metaValue}`;

		if (!leaves.has(groupId)) {
			leaves.set(groupId, {
				groupId,
				timeId: time.id,
				timeLabel: time.label,
				metaLabel: metaValue === OTHER_GROUP_ID ? `No ${metaKey}` : metaValue,
				members: []
			});
			leafOrder.push(groupId);
		}

		leaves.get(groupId)?.members.push({ ...progressRun, groupId });
	});

	// Time windows newest-first; metadata values keep first-appearance order within
	// a window. The incoming runs are already newest-first, so a stable sort by the
	// numeric (descending) time index alone reorders windows without disturbing the
	// metadata order inside each one.
	const orderedLeaves = timeFrameDays
		? [...leafOrder].sort((left, right) => {
				const leftTime = Number(leaves.get(left)?.timeId);
				const rightTime = Number(leaves.get(right)?.timeId);

				return rightTime - leftTime;
		  })
		: leafOrder;

	const orderedRuns: RunsProgressRun[] = [];
	const groups: RunsProgressGroup[] = [];
	const timeGroups: RunsProgressGroup[] = [];
	const showTimeBand = Boolean(timeFrameDays) && Boolean(metaKey);

	orderedLeaves.forEach((groupId) => {
		const leaf = leaves.get(groupId);

		if (!leaf) return;

		const startIndex = orderedRuns.length;

		groups.push({
			id: groupId,
			// With both dimensions the time is shown in the outer band, so the leaf
			// reads as just the metadata value; otherwise it carries the active label.
			label: showTimeBand
				? leaf.metaLabel
				: timeFrameDays
				? leaf.timeLabel
				: leaf.metaLabel,
			startIndex,
			runCount: leaf.members.length
		});

		if (showTimeBand) {
			const lastTimeGroup = timeGroups[timeGroups.length - 1];

			if (lastTimeGroup && lastTimeGroup.id === leaf.timeId) {
				lastTimeGroup.runCount += leaf.members.length;
			} else {
				timeGroups.push({
					id: leaf.timeId,
					label: leaf.timeLabel,
					startIndex,
					runCount: leaf.members.length
				});
			}
		}

		orderedRuns.push(...leaf.members);
	});

	return { orderedRuns, groups, timeGroups };
}

/**
 * Restricts runs to the selected date window so the progress matrix shows only
 * runs whose start day falls within [startDate, finishDate]. Both bounds are the
 * resolved `yyyy-MM-dd` strings from `useRunsQuery` (empty string = no bound on
 * that side) and both ends are inclusive, matching the backend's semantics. With
 * no bounds the runs pass through unchanged (the capped/unbounded path).
 */
function filterRunsByDateWindow(
	runs: RunsData[],
	startDate: string,
	finishDate: string
): RunsData[] {
	if (!startDate && !finishDate) return runs;

	return runs.filter((run) => {
		const runDay = formatTimeToAPI(parseISO(run.start));

		if (startDate && runDay < startDate) return false;
		if (finishDate && runDay > finishDate) return false;

		return true;
	});
}

function sortRunsNewestFirst(runs: RunsData[]): RunsData[] {
	return [...runs].sort((left, right) => {
		return new Date(right.start).getTime() - new Date(left.start).getTime();
	});
}

type MetricChangeKind = 'bad' | 'good' | 'neutral';

type MetricChange = { kind: MetricChangeKind; magnitude: number } | null;

/**
 * Classifies how a metric moved vs the older run so the cell can be toned:
 * `good` (green) / `bad` (red) for metrics with a real direction, `neutral`
 * (yellow) for metrics that merely changed. `magnitude` is the absolute count
 * delta — the number of tests that changed state — which drives tint intensity.
 *
 * With no baseline (the oldest run of a group) there is nothing to compare, so
 * only a bad-type metric with a non-zero value reads as a regression; good/neutral
 * metrics stay clean rather than lighting up a freshly-appeared column.
 */
function getMetricChange(
	direction: RunsProgressTrendDirection,
	value: number,
	previousValue: number,
	hasPrevious: boolean
): MetricChange {
	if (!hasPrevious) {
		return direction === 'lower-is-better' && value > 0
			? { kind: 'bad', magnitude: value }
			: null;
	}

	if (value === previousValue) return null;

	const rose = value > previousValue;
	const magnitude = Math.abs(value - previousValue);

	if (direction === 'neutral') return { kind: 'neutral', magnitude };

	// higher-is-better: a rise is the improvement; lower-is-better: a rise is the
	// regression.
	const roseIsGood = direction === 'higher-is-better';

	return { kind: rose === roseIsGood ? 'good' : 'bad', magnitude };
}

// Full literal class strings per kind/intensity so Tailwind's scanner can see
// them — building the arbitrary value dynamically would not be picked up. `bad`
// uses the unexpected red (#f95c78), `good` the passed green (#65cd84), `neutral`
// a muted amber (hsl 40 60% 52%) so an informational change reads softer than a
// regression. The `boost` set deepens each hue so a selected cell reads as
// "more red"/"greener"/"more amber".
const TONE_TIERS: Record<
	MetricChangeKind,
	{
		base: [string, string, string, string];
		boost: [string, string, string, string];
	}
> = {
	bad: {
		base: [
			'bg-[rgba(249,92,120,0.08)]',
			'bg-[rgba(249,92,120,0.14)]',
			'bg-[rgba(249,92,120,0.22)]',
			'bg-[rgba(249,92,120,0.32)]'
		],
		boost: [
			'bg-[rgba(249,92,120,0.3)]',
			'bg-[rgba(249,92,120,0.42)]',
			'bg-[rgba(249,92,120,0.55)]',
			'bg-[rgba(249,92,120,0.68)]'
		]
	},
	good: {
		base: [
			'bg-[rgba(101,205,132,0.08)]',
			'bg-[rgba(101,205,132,0.14)]',
			'bg-[rgba(101,205,132,0.22)]',
			'bg-[rgba(101,205,132,0.32)]'
		],
		boost: [
			'bg-[rgba(101,205,132,0.3)]',
			'bg-[rgba(101,205,132,0.42)]',
			'bg-[rgba(101,205,132,0.55)]',
			'bg-[rgba(101,205,132,0.68)]'
		]
	},
	neutral: {
		base: [
			'bg-[hsl(40_60%_52%_/_0.05)]',
			'bg-[hsl(40_60%_52%_/_0.09)]',
			'bg-[hsl(40_60%_52%_/_0.14)]',
			'bg-[hsl(40_60%_52%_/_0.20)]'
		],
		boost: [
			'bg-[hsl(40_60%_52%_/_0.20)]',
			'bg-[hsl(40_60%_52%_/_0.27)]',
			'bg-[hsl(40_60%_52%_/_0.35)]',
			'bg-[hsl(40_60%_52%_/_0.44)]'
		]
	}
};

// Tiered tint by the magnitude of the change so "a bit worse" reads clearly less
// intense than "much worse": 1 / 2–4 / 5–9 / 10+ tests changed.
function toneTierClassName(
	magnitude: number,
	kind: MetricChangeKind,
	boost = false
): string {
	const tiers = TONE_TIERS[kind][boost ? 'boost' : 'base'];

	if (magnitude >= 10) return tiers[3];
	if (magnitude >= 5) return tiers[2];
	if (magnitude >= 2) return tiers[1];

	return tiers[0];
}

/** Change-aware background tone for a metric cell; '' when nothing changed. */
function getMetricToneClassName(
	direction: RunsProgressTrendDirection,
	value: number,
	previousValue: number,
	hasPrevious: boolean,
	boost = false
): string {
	const change = getMetricChange(direction, value, previousValue, hasPrevious);

	if (!change) return '';

	return toneTierClassName(change.magnitude, change.kind, boost);
}

type MetricDeltaStatus = 'improved' | 'regressed' | 'changed';

type MetricDelta = {
	amount: number;
	increased: boolean;
	title: string;
	status: MetricDeltaStatus;
} | null;

/** The per-cell delta shown as a trend arrow; null when the value is unchanged. */
function getMetricDelta(
	value: number,
	previousValue: number,
	direction: RunsProgressTrendDirection
): MetricDelta {
	if (value === previousValue) return null;

	const diff = value - previousValue;
	const sign = diff > 0 ? '+' : '';

	let status: MetricDeltaStatus = 'changed';

	if (direction !== 'neutral') {
		if (value > previousValue) {
			status = direction === 'higher-is-better' ? 'improved' : 'regressed';
		} else {
			status = direction === 'higher-is-better' ? 'regressed' : 'improved';
		}
	}

	const percent =
		previousValue === 0
			? null
			: Math.round(((value - previousValue) / previousValue) * 100);
	const title =
		percent === null
			? `${sign}${diff} vs previous run`
			: `${sign}${diff} (${percent > 0 ? '+' : ''}${percent}%) vs previous run`;

	return {
		amount: Math.abs(diff),
		increased: diff > 0,
		title,
		status
	};
}

function buildFilterSummary(
	searchParams: URLSearchParams
): RunsProgressFilterSummary[] {
	const summary: RunsProgressFilterSummary[] = [];
	const runData = searchParams.get('runData');
	const tagExpr = searchParams.get('tagExpr');
	const calendarMode = searchParams.get('calendarMode');
	const duration = searchParams.get('duration');
	const startDate = searchParams.get('startDate');
	const finishDate = searchParams.get('finishDate');

	if (runData)
		summary.push({ label: 'Metas', value: runData.split(';').join(', ') });
	if (tagExpr) summary.push({ label: 'Tag expression', value: tagExpr });
	if (calendarMode === 'duration' && duration) {
		summary.push({ label: 'Range', value: duration });
	} else if (startDate || finishDate) {
		summary.push({
			label: 'Range',
			value: `${startDate || '...'} - ${finishDate || '...'}`
		});
	}

	return summary;
}

export type { MetricChange, MetricDelta, MetricDeltaStatus };

export {
	buildFilterSummary,
	buildRunsProgressRows,
	filterChangedRows,
	filterRunsByDateWindow,
	getMetadataKey,
	getMetadataKeys,
	getMetricChange,
	getMetricDelta,
	getMetricToneClassName,
	getNodeStats,
	getRunGroupValue,
	getStatsTotal,
	getUnexpectedTotal,
	groupRuns,
	rowHasChange,
	sortRunsNewestFirst,
	toneTierClassName
};
