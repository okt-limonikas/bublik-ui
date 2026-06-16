/* SPDX-License-Identifier: Apache-2.0 */
/* SPDX-FileCopyrightText: 2024-2026 OKTET LTD */
import { CSSProperties, WheelEvent, useMemo, useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';

import { LinkWithProject } from '@/bublik/features/projects';
import { RUN_STATUS } from '@/shared/types';
import {
	BadgeList,
	BadgeListItem,
	CardHeader,
	ConclusionBadge,
	Icon,
	Skeleton,
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

const ROW_HEIGHT = 44;
const HEADER_HEIGHT = 132;
const LEFT_COLUMN_WIDTH = 360;
const RUN_COLUMN_WIDTH = 286;

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

	const rowVirtualizer = useVirtualizer({
		count: rows.length,
		getScrollElement: () => parentRef.current,
		estimateSize: () => ROW_HEIGHT,
		overscan: 10
	});
	const columnVirtualizer = useVirtualizer({
		count: runs.length,
		getScrollElement: () => parentRef.current,
		estimateSize: () => RUN_COLUMN_WIDTH,
		horizontal: true,
		overscan: 3
	});

	const virtualRows = rowVirtualizer.getVirtualItems();
	const virtualColumns = columnVirtualizer.getVirtualItems();
	const totalWidth = LEFT_COLUMN_WIDTH + columnVirtualizer.getTotalSize();
	const totalHeight = HEADER_HEIGHT + rowVirtualizer.getTotalSize();

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
				<Legend />
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
								{rows.length} procedures across {runs.length} runs
							</span>
						</div>
						{virtualColumns.map((virtualColumn) => {
							const run = runs[virtualColumn.index].run;

							return (
								<RunHeaderCell
									key={virtualColumn.key}
									run={run}
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
						const row = rows[virtualRow.index];

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
								<RowHeaderCell row={row} />
								{virtualColumns.map((virtualColumn) => (
									<ResultCell
										key={`${virtualColumn.key}-${row.id}`}
										cell={row.cells[virtualColumn.index]}
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
	style
}: {
	run: RunsProgressRun['run'];
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
			<div className="mt-2 max-h-[68px] overflow-hidden">
				<BadgeList badges={tags} className="bg-badge-6" />
			</div>
		</div>
	);
}

function RowHeaderCell({ row }: { row: RunsProgressRow }) {
	return (
		<div
			className="sticky left-0 z-20 flex h-full items-center border-r border-border-primary bg-white px-3 text-xs font-medium text-text-primary"
			style={{ width: LEFT_COLUMN_WIDTH }}
		>
			<div
				className="min-w-0"
				style={{ paddingLeft: Math.min(row.depth, 8) * 10 }}
			>
				<div className="truncate">{row.name}</div>
				<div className="truncate text-[0.625rem] text-text-secondary">
					{row.path.join('/')}
				</div>
			</div>
		</div>
	);
}

function ResultCell({
	cell,
	style
}: {
	cell: RunsProgressRow['cells'][number];
	style: CSSProperties;
}) {
	const stats = getNodeStats(cell.node);
	const total = getStatsTotal(stats);
	const hasNok =
		stats.failed_unexpected || stats.abnormal || stats.passed_unexpected;
	const hasSkipped = stats.skipped || stats.skipped_unexpected;

	return (
		<div
			className={cn(
				'absolute top-0 flex h-full items-center justify-between gap-2 border-r border-border-primary px-3 text-[0.6875rem] font-medium',
				getResultCellClassName(cell.trend, Boolean(hasNok), Boolean(hasSkipped))
			)}
			style={style}
		>
			{cell.node ? (
				<>
					<span className="text-text-secondary">total {total}</span>
					<div className="flex items-center gap-2">
						<Counter
							label="P"
							value={stats.passed}
							className="text-text-expected"
						/>
						<Counter
							label="F"
							value={stats.failed + stats.failed_unexpected}
							className="text-text-unexpected"
						/>
						<Counter
							label="S"
							value={stats.skipped + stats.skipped_unexpected}
							className="text-text-secondary"
						/>
						<TrendPill trend={cell.trend} />
					</div>
				</>
			) : (
				<span className="text-text-secondary">No data</span>
			)}
		</div>
	);
}

function Counter(props: { label: string; value: number; className?: string }) {
	return (
		<span className={cn('tabular-nums', props.className)}>
			{props.label}:{props.value}
		</span>
	);
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
