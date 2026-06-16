/* SPDX-License-Identifier: Apache-2.0 */
/* SPDX-FileCopyrightText: 2024-2026 OKTET LTD */
import { CSSProperties, WheelEvent, useMemo, useRef, useState } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';

import { LinkWithProject } from '@/bublik/features/projects';
import { RUN_STATUS } from '@/shared/types';
import {
	BadgeList,
	BadgeListItem,
	ButtonTw,
	CardHeader,
	ConclusionBadge,
	DropdownMenu,
	DropdownMenuCheckboxItem,
	DropdownMenuContent,
	DropdownMenuLabel,
	DropdownMenuTrigger,
	Icon,
	Separator,
	Skeleton,
	TableNode,
	cn
} from '@/shared/tailwind-ui';
import { BublikEmptyState, BublikErrorState } from '@/bublik/features/ui-state';

import {
	RunsProgressFilterSummary,
	RunsProgressRow,
	RunsProgressRun,
	RunsProgressTrend
} from './runs-progress.types';
import { getNodeStats, getStatsTotal } from './runs-progress.utils';

const ROW_HEIGHT = 46;
const HEADER_HEIGHT = 158;
const LEFT_COLUMN_WIDTH = 360;
const MIN_RUN_COLUMN_WIDTH = 340;
const METRIC_COLUMN_WIDTH = 92;

type RunsProgressColumnId =
	| 'total'
	| 'passedExpected'
	| 'passedUnexpected'
	| 'failedExpected'
	| 'failedUnexpected'
	| 'skippedExpected'
	| 'skippedUnexpected'
	| 'abnormal'
	| 'trend';

type RunsProgressColumn = {
	id: RunsProgressColumnId;
	label: string;
	shortLabel: string;
	trendDirection: 'higher-is-better' | 'lower-is-better' | 'neutral';
};

const RESULT_COLUMNS: RunsProgressColumn[] = [
	{ id: 'total', label: 'Total', shortLabel: 'Total', trendDirection: 'neutral' },
	{
		id: 'passedExpected',
		label: 'Passed expected',
		shortLabel: 'Passed exp.',
		trendDirection: 'higher-is-better'
	},
	{
		id: 'passedUnexpected',
		label: 'Passed unexpected',
		shortLabel: 'Passed unexp.',
		trendDirection: 'lower-is-better'
	},
	{
		id: 'failedExpected',
		label: 'Failed expected',
		shortLabel: 'Failed exp.',
		trendDirection: 'lower-is-better'
	},
	{
		id: 'failedUnexpected',
		label: 'Failed unexpected',
		shortLabel: 'Failed unexp.',
		trendDirection: 'lower-is-better'
	},
	{
		id: 'skippedExpected',
		label: 'Skipped expected',
		shortLabel: 'Skipped exp.',
		trendDirection: 'lower-is-better'
	},
	{
		id: 'skippedUnexpected',
		label: 'Skipped unexpected',
		shortLabel: 'Skipped unexp.',
		trendDirection: 'lower-is-better'
	},
	{
		id: 'abnormal',
		label: 'Abnormal',
		shortLabel: 'Abnormal',
		trendDirection: 'lower-is-better'
	},
	{ id: 'trend', label: 'Overall trend', shortLabel: 'Trend', trendDirection: 'neutral' }
];

const DEFAULT_VISIBLE_COLUMNS: RunsProgressColumnId[] = [
	'total',
	'passedExpected',
	'passedUnexpected',
	'failedExpected',
	'failedUnexpected',
	'skippedExpected',
	'skippedUnexpected',
	'abnormal',
	'trend'
];

function RunsProgressLoading() {
	return (
		<main className="flex flex-col bg-white rounded-md">
			<CardHeader label="Runs Progress" />
			<Skeleton className="h-[calc(100vh-220px)] rounded-none" />
		</main>
	);
}

function RunsProgressEmpty() {
	return (
		<BublikEmptyState
			title="No progress data"
			description="No run stats are available for the current filters"
			className="h-[calc(100vh-256px)]"
		/>
	);
}

function RunsProgressError({ error = {} }: { error?: unknown }) {
	return <BublikErrorState error={error} className="h-[calc(100vh-256px)]" />;
}

interface RunsProgressProps {
	runs: RunsProgressRun[];
	rows: RunsProgressRow[];
	filters: RunsProgressFilterSummary[];
	isFetching?: boolean;
}

function RunsProgress(props: RunsProgressProps) {
	const { runs, rows, filters, isFetching } = props;
	const parentRef = useRef<HTMLDivElement>(null);
	const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});
	const [visibleColumnIds, setVisibleColumnIds] = useState<RunsProgressColumnId[]>(
		DEFAULT_VISIBLE_COLUMNS
	);

	const visibleRows = useMemo(
		() => getVisibleRows(rows, expandedRows),
		[expandedRows, rows]
	);
	const expandableRowIds = useMemo(() => getExpandableRowIds(rows), [rows]);
	const visibleColumns = useMemo(
		() => RESULT_COLUMNS.filter((column) => visibleColumnIds.includes(column.id)),
		[visibleColumnIds]
	);
	const runColumnWidth = Math.max(
		MIN_RUN_COLUMN_WIDTH,
		visibleColumns.length * METRIC_COLUMN_WIDTH
	);

	const rowVirtualizer = useVirtualizer({
		count: visibleRows.length,
		getScrollElement: () => parentRef.current,
		estimateSize: () => ROW_HEIGHT,
		overscan: 10
	});
	const columnVirtualizer = useVirtualizer({
		count: runs.length,
		getScrollElement: () => parentRef.current,
		estimateSize: () => runColumnWidth,
		horizontal: true,
		overscan: 3
	});

	const virtualRows = rowVirtualizer.getVirtualItems();
	const virtualColumns = columnVirtualizer.getVirtualItems();
	const totalWidth = LEFT_COLUMN_WIDTH + columnVirtualizer.getTotalSize();
	const totalHeight = HEADER_HEIGHT + rowVirtualizer.getTotalSize();

	function handleRowToggle(rowId: string) {
		const row = visibleRows.find((row) => row.id === rowId);

		if (!row || row.depth === 0) return;

		setExpandedRows((state) => ({
			...state,
			[rowId]: !(state[rowId] ?? false)
		}));
	}

	function handleExpandAll() {
		setExpandedRows(
			Object.fromEntries(expandableRowIds.map((rowId) => [rowId, true]))
		);
	}

	function handleCollapseAll() {
		setExpandedRows({});
	}

	function handleWheel(event: WheelEvent<HTMLDivElement>) {
		const element = parentRef.current;

		if (!element) return;
		if (Math.abs(event.deltaX) > Math.abs(event.deltaY)) return;
		if (element.scrollWidth <= element.clientWidth) return;

		element.scrollLeft += event.deltaY;
		event.preventDefault();
	}

	return (
		<main className={cn('bg-white rounded-md', isFetching && 'opacity-40')}>
			<CardHeader label="Runs Progress">
				<div className="flex items-center gap-4">
					<Legend />
					<div className="flex items-center gap-2">
						<ButtonTw variant="secondary" size="xss" onClick={handleExpandAll}>
							Open all levels
						</ButtonTw>
						<ButtonTw variant="secondary" size="xss" onClick={handleCollapseAll}>
							Collapse
						</ButtonTw>
					</div>
					<ColumnsVisibility
						visibleColumnIds={visibleColumnIds}
						onVisibleColumnIdsChange={setVisibleColumnIds}
					/>
				</div>
			</CardHeader>
			<FilterSummary filters={filters} />
			<div
				ref={parentRef}
				onWheel={handleWheel}
				className="relative h-[calc(100vh-140px)] overflow-auto overscroll-contain border-t border-border-primary"
			>
				<div
					className="relative"
					style={{ width: totalWidth, height: totalHeight }}
				>
					<div
						className="sticky top-0 z-30 bg-white border-b border-border-primary"
						style={{ width: totalWidth, height: HEADER_HEIGHT }}
					>
						<div
							className="sticky left-0 z-40 flex h-full flex-col justify-end gap-2 bg-white px-4 py-3 border-r border-border-primary"
							style={{ width: LEFT_COLUMN_WIDTH }}
						>
							<span className="text-[0.6875rem] font-semibold uppercase text-text-menu">
								Test procedures
							</span>
							<span className="text-xs text-text-secondary">
								{visibleRows.length} visible rows across {runs.length} runs
							</span>
						</div>
						{virtualColumns.map((virtualColumn) => {
							const run = runs[virtualColumn.index].run;

							return (
								<RunHeaderCell
									key={virtualColumn.key}
									run={run}
									columns={visibleColumns}
									style={{
										width: virtualColumn.size,
										transform: `translateX(${
											LEFT_COLUMN_WIDTH + virtualColumn.start
										}px)`
									}}
								/>
							);
						})}
					</div>
					{virtualRows.map((virtualRow) => {
						const row = visibleRows[virtualRow.index];

						return (
							<div
								key={virtualRow.key}
								className="absolute left-0 border-b border-border-primary"
								style={{
									top: 0,
									width: totalWidth,
									height: virtualRow.size,
									transform: `translateY(${HEADER_HEIGHT + virtualRow.start}px)`
								}}
							>
								<RowHeaderCell
									row={row}
									isExpanded={isRowExpanded(row, expandedRows)}
									onToggle={handleRowToggle}
								/>
								{virtualColumns.map((virtualColumn) => (
									<ResultCell
										key={`${virtualColumn.key}-${row.id}`}
										cell={row.cells[virtualColumn.index]}
										columns={visibleColumns}
										style={{
											width: virtualColumn.size,
											transform: `translateX(${
												LEFT_COLUMN_WIDTH + virtualColumn.start
											}px)`
										}}
									/>
								))}
							</div>
						);
					})}
				</div>
			</div>
		</main>
	);
}

function getVisibleRows(
	rows: RunsProgressRow[],
	expandedRows: Record<string, boolean>
): RunsProgressRow[] {
	const visibleRows: RunsProgressRow[] = [];

	function visit(row: RunsProgressRow) {
		visibleRows.push(row);

		if (!isRowExpanded(row, expandedRows)) return;

		row.children.forEach(visit);
	}

	rows.forEach(visit);

	return visibleRows;
}

function isRowExpanded(
	row: RunsProgressRow,
	expandedRows: Record<string, boolean>
): boolean {
	if (row.depth === 0) return true;

	return expandedRows[row.id] ?? false;
}

function getExpandableRowIds(rows: RunsProgressRow[]): string[] {
	const rowIds: string[] = [];

	function visit(row: RunsProgressRow) {
		if (row.children.length && row.depth > 0) rowIds.push(row.id);

		row.children.forEach(visit);
	}

	rows.forEach(visit);

	return rowIds;
}

function ColumnsVisibility({
	visibleColumnIds,
	onVisibleColumnIdsChange
}: {
	visibleColumnIds: RunsProgressColumnId[];
	onVisibleColumnIdsChange: (columnIds: RunsProgressColumnId[]) => void;
}) {
	const [isOpen, setIsOpen] = useState(false);

	function handleColumnChange(columnId: RunsProgressColumnId, isChecked: boolean) {
		if (isChecked) {
			onVisibleColumnIdsChange(
				RESULT_COLUMNS.map((column) => column.id).filter(
					(id) => id === columnId || visibleColumnIds.includes(id)
				)
			);
			return;
		}

		if (visibleColumnIds.length === 1) return;

		onVisibleColumnIdsChange(visibleColumnIds.filter((id) => id !== columnId));
	}

	return (
		<DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
			<DropdownMenuTrigger asChild>
				<ButtonTw variant="secondary" size="xss" state={isOpen && 'active'}>
					Columns
					<Icon name="ArrowShortSmall" className="ml-1.5" />
				</ButtonTw>
			</DropdownMenuTrigger>
			<DropdownMenuContent collisionPadding={{ right: 15 }} className="w-56">
				<DropdownMenuLabel className="text-xs">Result Columns</DropdownMenuLabel>
				<Separator className="h-px my-1 -mx-1" />
				{RESULT_COLUMNS.map((column) => (
					<DropdownMenuCheckboxItem
						key={column.id}
						checked={visibleColumnIds.includes(column.id)}
						onCheckedChange={(isChecked) =>
							handleColumnChange(column.id, Boolean(isChecked))
						}
						className="text-xs"
					>
						{column.label}
					</DropdownMenuCheckboxItem>
				))}
			</DropdownMenuContent>
		</DropdownMenu>
	);
}

function FilterSummary({ filters }: { filters: RunsProgressFilterSummary[] }) {
	if (!filters.length) return null;

	return (
		<div className="flex flex-wrap items-center gap-2 px-4 py-2 border-t border-border-primary bg-primary-wash/40">
			<span className="text-[0.6875rem] font-semibold uppercase text-text-menu">
				Current filters
			</span>
			{filters.map((filter) => (
				<span
					key={filter.label}
					className="rounded bg-white px-2 py-1 text-[0.6875rem] font-medium text-text-primary shadow-sm"
				>
					{filter.label}: {filter.value}
				</span>
			))}
		</div>
	);
}

function Legend() {
	return (
		<div className="flex items-center gap-2 text-[0.6875rem] font-medium text-text-secondary">
			<LegendItem className="bg-bg-ok/15" label="OK" />
			<LegendItem className="bg-bg-warning/15" label="Skipped" />
			<LegendItem className="bg-bg-error/15" label="NOK" />
			<LegendItem className="bg-diff-added" label="Improved" />
			<LegendItem className="bg-diff-removed" label="Regressed" />
		</div>
	);
}

function LegendItem(props: { className: string; label: string }) {
	return (
		<span className="inline-flex items-center gap-1">
			<span className={cn('size-2 rounded-full', props.className)} />
			{props.label}
		</span>
	);
}

function RunHeaderCell({
	run,
	columns,
	style
}: {
	run: RunsProgressRun['run'];
	columns: RunsProgressColumn[];
	style: CSSProperties;
}) {
	const tags = useMemo<BadgeListItem[]>(() => {
		return [...run.important_tags, ...run.metadata, ...run.relevant_tags]
			.filter(Boolean)
			.slice(0, 8)
			.map((tag) => ({ payload: tag }));
	}, [run.important_tags, run.metadata, run.relevant_tags]);

	return (
		<div
			className="absolute top-0 h-full border-r border-border-primary bg-white px-3 py-2"
			style={style}
		>
			<div className="flex items-center justify-between gap-2">
				<LinkWithProject
					to={`/runs/${run.id}`}
					className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
				>
					<Icon name="BoxArrowRight" size={16} />
					{run.id}
				</LinkWithProject>
				<ConclusionBadge status={run.conclusion as RUN_STATUS} />
			</div>
			<div className="mt-1 truncate text-[0.6875rem] text-text-secondary">
				{formatDate(run.start)}
			</div>
			<div className="mt-2 max-h-[58px] overflow-hidden">
				<BadgeList badges={tags} className="bg-badge-6" />
			</div>
			<div
				className="absolute bottom-0 left-0 right-0 grid border-t border-border-primary bg-primary-wash/40 text-[0.625rem] font-semibold uppercase text-text-menu"
				style={{
					gridTemplateColumns: `repeat(${columns.length}, minmax(0, 1fr))`
				}}
			>
				{columns.map((column) => (
					<div
						key={column.id}
						className="truncate border-r border-border-primary px-2 py-1 last:border-r-0"
					>
						{column.shortLabel}
					</div>
				))}
			</div>
		</div>
	);
}

function RowHeaderCell({
	row,
	isExpanded,
	onToggle
}: {
	row: RunsProgressRow;
	isExpanded: boolean;
	onToggle: (rowId: string) => void;
}) {
	const canExpand = row.children.length > 0;
	const canToggle = canExpand && row.depth > 0;

	return (
		<div
			className="sticky left-0 z-20 flex h-full items-center border-r border-border-primary bg-white px-2 text-xs font-medium text-text-primary"
			style={{ width: LEFT_COLUMN_WIDTH }}
		>
			<div className="flex min-w-0 flex-1 items-center">
				<TableNode
					nodeName={row.name}
					nodeType={row.type}
					depth={row.depth}
					onClick={() => canToggle && onToggle(row.id)}
					isExpanded={canExpand ? isExpanded : undefined}
					disabled={!canToggle}
				/>
			</div>
		</div>
	);
}

function ResultCell({
	cell,
	columns,
	style
}: {
	cell: RunsProgressRow['cells'][number];
	columns: RunsProgressColumn[];
	style: CSSProperties;
}) {
	const stats = getNodeStats(cell.node);
	const previousStats = getNodeStats(cell.previousNode);
	const hasNok =
		stats.failed_unexpected || stats.abnormal || stats.passed_unexpected;
	const hasSkipped = stats.skipped || stats.skipped_unexpected;
	const cellTrend = getCellTrend(columns, stats, previousStats, cell.trend);

	return (
		<div
			className={cn(
				'absolute top-0 grid h-full items-center border-r border-border-primary text-[0.6875rem] font-medium',
				getResultCellClassName(cellTrend, Boolean(hasNok), Boolean(hasSkipped))
			)}
			style={{
				...style,
				gridTemplateColumns: `repeat(${columns.length}, minmax(0, 1fr))`
			}}
		>
			{cell.node ? (
				columns.map((column) => (
					<ResultColumnValue
						key={column.id}
						column={column}
						stats={stats}
						previousStats={previousStats}
						trend={cell.trend}
					/>
				))
			) : (
				<span className="col-span-full px-3 text-text-secondary">No data</span>
			)}
		</div>
	);
}

function ResultColumnValue({
	column,
	stats,
	previousStats,
	trend
}: {
	column: RunsProgressColumn;
	stats: ReturnType<typeof getNodeStats>;
	previousStats: ReturnType<typeof getNodeStats>;
	trend: RunsProgressTrend;
}) {
	if (column.id === 'trend') {
		return (
			<div className="flex min-w-0 justify-center px-2">
				<TrendPill trend={trend} />
			</div>
		);
	}

	const value = getMetricValue(column.id, stats);
	const previousValue = getMetricValue(column.id, previousStats);
	const delta = getMetricDelta(value, previousValue, column.trendDirection);

	return (
		<div className="flex min-w-0 items-center justify-end gap-1 border-r border-border-primary px-2 last:border-r-0">
			<span className={cn('tabular-nums', getMetricTextClassName(column.id))}>
				{value}
			</span>
			<DeltaPill delta={delta} />
		</div>
	);
}

type MetricDeltaStatus = 'improved' | 'regressed' | 'changed';

type MetricDelta = {
	label: string;
	status: MetricDeltaStatus;
} | null;

function getMetricDelta(
	value: number,
	previousValue: number,
	direction: RunsProgressColumn['trendDirection']
): MetricDelta {
	if (direction === 'neutral' || value === previousValue) return null;

	let status: MetricDeltaStatus = 'changed';

	if (value > previousValue) {
		status = direction === 'higher-is-better' ? 'improved' : 'regressed';
	} else {
		status = direction === 'higher-is-better' ? 'regressed' : 'improved';
	}

	if (previousValue === 0) return { label: 'new', status };
	if (value === 0) return { label: 'cleared', status };

	const percent = Math.round(((value - previousValue) / previousValue) * 100);
	const sign = percent > 0 ? '+' : '';

	return { label: `${sign}${percent}%`, status };
}

function DeltaPill({ delta }: { delta: MetricDelta }) {
	if (!delta) return null;

	return (
		<span
			className={cn(
				'rounded px-1 py-0.5 text-[0.5625rem] font-semibold uppercase leading-none',
				delta.status === 'improved' && 'bg-diff-added text-text-primary',
				delta.status === 'regressed' && 'bg-diff-removed text-text-primary',
				delta.status === 'changed' && 'bg-white/70 text-text-secondary'
			)}
		>
			{delta.label}
		</span>
	);
}

function getMetricValue(
	columnId: Exclude<RunsProgressColumnId, 'trend'>,
	stats: ReturnType<typeof getNodeStats>
): number {
	switch (columnId) {
		case 'total':
			return getStatsTotal(stats);
		case 'passedExpected':
			return stats.passed;
		case 'failedExpected':
			return stats.failed;
		case 'failedUnexpected':
			return stats.failed_unexpected;
		case 'passedUnexpected':
			return stats.passed_unexpected;
		case 'skippedExpected':
			return stats.skipped;
		case 'skippedUnexpected':
			return stats.skipped_unexpected;
		case 'abnormal':
			return stats.abnormal;
	}
}

function getMetricTextClassName(columnId: RunsProgressColumnId): string {
	if (columnId === 'passedExpected') return 'text-text-expected';
	if (
		columnId === 'failedExpected' ||
		columnId === 'failedUnexpected' ||
		columnId === 'passedUnexpected' ||
		columnId === 'abnormal'
	) {
		return 'text-text-unexpected';
	}

	return 'text-text-secondary';
}

function getCellTrend(
	columns: RunsProgressColumn[],
	stats: ReturnType<typeof getNodeStats>,
	previousStats: ReturnType<typeof getNodeStats>,
	fallback: RunsProgressTrend
): RunsProgressTrend {
	let hasImproved = false;
	let hasRegressed = false;

	columns.forEach((column) => {
		if (column.id === 'trend') return;

		const delta = getMetricDelta(
			getMetricValue(column.id, stats),
			getMetricValue(column.id, previousStats),
			column.trendDirection
		);

		if (delta?.status === 'improved') hasImproved = true;
		if (delta?.status === 'regressed') hasRegressed = true;
	});

	if (hasRegressed) return 'regressed';
	if (hasImproved) return 'improved';

	return fallback;
}

function TrendPill({ trend }: { trend: RunsProgressTrend }) {
	if (trend === 'same') return null;

	const labelByTrend: Record<RunsProgressTrend, string> = {
		added: '+',
		removed: '-',
		improved: 'better',
		regressed: 'worse',
		changed: 'changed',
		same: ''
	};

	return (
		<span className="rounded bg-white/70 px-1.5 py-0.5 text-[0.625rem] uppercase text-text-primary">
			{labelByTrend[trend]}
		</span>
	);
}

function getResultCellClassName(
	trend: RunsProgressTrend,
	hasNok: boolean,
	hasSkipped: boolean
): string {
	if (trend === 'regressed' || trend === 'removed') return 'bg-diff-removed';
	if (trend === 'improved' || trend === 'added') return 'bg-diff-added';
	if (hasNok) return 'bg-bg-error/10';
	if (hasSkipped) return 'bg-bg-warning/10';

	return 'bg-bg-ok/10';
}

function formatDate(value: string): string {
	const date = new Date(value);

	if (Number.isNaN(date.getTime())) return value;

	return date.toLocaleString();
}

export {
	RunsProgress,
	RunsProgressEmpty,
	RunsProgressError,
	RunsProgressLoading
};
