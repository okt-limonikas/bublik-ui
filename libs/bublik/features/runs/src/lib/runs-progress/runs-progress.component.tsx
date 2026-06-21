/* SPDX-License-Identifier: Apache-2.0 */
/* SPDX-FileCopyrightText: 2024-2026 OKTET LTD */
import {
	CSSProperties,
	ReactNode,
	memo,
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState
} from 'react';
import { VirtualItem, useVirtualizer } from '@tanstack/react-virtual';
import {
	DndContext,
	DragEndEvent,
	PointerSensor,
	closestCenter,
	useSensor,
	useSensors
} from '@dnd-kit/core';
import {
	SortableContext,
	arrayMove,
	useSortable,
	verticalListSortingStrategy
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

import { LinkWithProject } from '@/bublik/features/projects';
import { routes } from '@/router';
import { RUN_STATUS, RunData } from '@/shared/types';
import {
	Badge,
	BadgeList,
	BadgeListItem,
	BadgeVariants,
	ButtonTw,
	CardHeader,
	Checkbox,
	ConclusionHoverCard,
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuLabel,
	DropdownMenuRadioGroup,
	DropdownMenuRadioItem,
	DropdownMenuTrigger,
	HoverCard,
	Icon,
	Separator,
	Skeleton,
	TableNode,
	cn,
	getRunStatusInfo
} from '@/shared/tailwind-ui';
import { BublikEmptyState, BublikErrorState } from '@/bublik/features/ui-state';

import {
	RunsProgressFilterSummary,
	RunsProgressGroup,
	RunsProgressRow,
	RunsProgressRun,
	RunsProgressTrendDirection
} from './runs-progress.types';
import {
	MetricDelta,
	getMetricDelta,
	getMetricToneClassName,
	getNodeStats,
	getStatsTotal,
	getUnexpectedTotal
} from './runs-progress.utils';
import {
	Sparkline,
	SparklineHoverChart,
	SparklinePoint
} from './runs-progress.sparkline';

const ROW_HEIGHT = 34;
const HEADER_STRIP_HEIGHT = 34;
const HEADER_HEIGHT = 162;
// Band drawn above the run headers when runs are grouped by a metadata key.
const GROUP_HEADER_HEIGHT = 28;
const LEFT_COLUMN_WIDTH = 380;
const SPARKLINE_WIDTH = 76;
// Objective is rendered as its own divider-separated column after the sparkline;
// it widens the pinned left area only while toggled on.
const OBJECTIVE_COLUMN_WIDTH = 200;
// Cycled per group so neighbouring groups stay visually distinct.
const GROUP_COLORS = [
	'bg-badge-1',
	'bg-badge-2',
	'bg-badge-3',
	'bg-badge-5',
	'bg-badge-6',
	'bg-badge-7'
];
// Each metric keeps a constant width so cell content never compresses/overflows as
// columns are shown/hidden; the run column simply grows with the metric count.
const METRIC_COLUMN_WIDTH = 104;

type RunsProgressColumnId =
	| 'total'
	| 'run'
	| 'passedExpected'
	| 'unexpected'
	| 'abnormal'
	| 'passedUnexpected'
	| 'failedExpected'
	| 'failedUnexpected'
	| 'skippedExpected'
	| 'skippedUnexpected';

type RunsProgressColumn = {
	id: RunsProgressColumnId;
	label: string;
	shortLabel: string;
	trendDirection: RunsProgressTrendDirection;
	badgeVariant: BadgeVariants;
	icon: ReactNode;
};

const EXPECTED_ICON = (
	<Icon
		name="InformationCircleCheckmark"
		size={14}
		className="text-text-expected"
	/>
);
const UNEXPECTED_ICON = (
	<Icon
		name="InformationCircleExclamationMark"
		size={14}
		className="text-text-unexpected"
	/>
);
const ABNORMAL_ICON = (
	<Icon
		name="InformationCircleQuestionMark"
		size={14}
		className="text-text-unexpected"
	/>
);

// Order mirrors the run-table badge columns (badge-columns.tsx): Total, Run,
// Unexpected (all), Passed/Failed expected, Passed/Failed unexpected,
// Skipped expected/unexpected, Abnormal.
const RESULT_COLUMNS: RunsProgressColumn[] = [
	{
		id: 'total',
		label: 'Total',
		shortLabel: 'Total',
		trendDirection: 'neutral',
		badgeVariant: BadgeVariants.PrimaryActive,
		icon: null
	},
	{
		id: 'run',
		label: 'Run',
		shortLabel: 'Run',
		trendDirection: 'neutral',
		badgeVariant: BadgeVariants.PrimaryActive,
		icon: null
	},
	{
		id: 'unexpected',
		label: 'Unexpected (all)',
		shortLabel: 'Unexp.',
		trendDirection: 'lower-is-better',
		badgeVariant: BadgeVariants.UnexpectedActive,
		icon: UNEXPECTED_ICON
	},
	{
		id: 'passedExpected',
		label: 'Passed expected',
		shortLabel: 'Passed',
		trendDirection: 'higher-is-better',
		badgeVariant: BadgeVariants.ExpectedActive,
		icon: EXPECTED_ICON
	},
	{
		id: 'failedExpected',
		label: 'Failed expected',
		shortLabel: 'Failed exp.',
		trendDirection: 'neutral',
		badgeVariant: BadgeVariants.ExpectedActive,
		icon: EXPECTED_ICON
	},
	{
		id: 'passedUnexpected',
		label: 'Passed unexpected',
		shortLabel: 'Passed unexp.',
		trendDirection: 'lower-is-better',
		badgeVariant: BadgeVariants.UnexpectedActive,
		icon: UNEXPECTED_ICON
	},
	{
		id: 'failedUnexpected',
		label: 'Failed unexpected',
		shortLabel: 'Failed unexp.',
		trendDirection: 'lower-is-better',
		badgeVariant: BadgeVariants.UnexpectedActive,
		icon: UNEXPECTED_ICON
	},
	{
		id: 'skippedExpected',
		label: 'Skipped expected',
		shortLabel: 'Skipped exp.',
		trendDirection: 'neutral',
		badgeVariant: BadgeVariants.ExpectedActive,
		icon: EXPECTED_ICON
	},
	{
		id: 'skippedUnexpected',
		label: 'Skipped unexpected',
		shortLabel: 'Skipped unexp.',
		trendDirection: 'lower-is-better',
		badgeVariant: BadgeVariants.UnexpectedActive,
		icon: UNEXPECTED_ICON
	},
	{
		id: 'abnormal',
		label: 'Abnormal',
		shortLabel: 'Abnormal',
		trendDirection: 'lower-is-better',
		badgeVariant: BadgeVariants.Unexpected,
		icon: ABNORMAL_ICON
	}
];

// Maps a runs-progress metric column to the run-table `ColumnId` value that the
// run page understands as a results filter (via the `resultFilter` query param).
// These strings must mirror `ColumnId` in the run feature
// (libs/bublik/features/run/.../run-table/types). They are intentionally inlined
// as literals — `ColumnId` is a cross-lib `const enum` whose values don't survive
// babel compilation, and they are frozen ("DO NOT CHANGE — breaks URL links").
const RUNS_PROGRESS_COL_TO_RUN_COLUMN_ID: Record<RunsProgressColumnId, string> =
	{
		total: 'TOTAL',
		run: 'RUN',
		unexpected: 'UNEXPECTED_TOTAL',
		passedExpected: 'PASSED_EXPECTED',
		failedExpected: 'FAILED_EXPECTED',
		passedUnexpected: 'PASSED_UNEXPECTED',
		failedUnexpected: 'FAILED_UNEXPECTED',
		skippedExpected: 'SKIPPED_EXPECTED',
		skippedUnexpected: 'SKIPPED_UNEXPECTED',
		abnormal: 'ABNORMAL'
	};

const DEFAULT_VISIBLE_COLUMNS: RunsProgressColumnId[] = [
	'run',
	'unexpected',
	'passedUnexpected',
	'failedUnexpected',
	'skippedUnexpected',
	'abnormal'
];

const ALL_COLUMN_IDS: RunsProgressColumnId[] = RESULT_COLUMNS.map(
	(column) => column.id
);
const COLUMN_BY_ID = new Map<RunsProgressColumnId, RunsProgressColumn>(
	RESULT_COLUMNS.map((column) => [column.id, column])
);

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
	groups: RunsProgressGroup[];
	groupKey: string | null;
	availableGroupKeys: string[];
	onGroupKeyChange: (groupKey: string | null) => void;
	filters: RunsProgressFilterSummary[];
	isFetching?: boolean;
	// The run window was capped (no date boundary selected); show the latest `cap`
	// of `total` runs and prompt the user to narrow by dates to see all.
	isCapped?: boolean;
	total?: number;
	cap?: number;
}

function RunsProgress(props: RunsProgressProps) {
	const {
		runs,
		rows,
		groups,
		groupKey,
		availableGroupKeys,
		onGroupKeyChange,
		isFetching,
		isCapped,
		total,
		cap
	} = props;
	const parentRef = useRef<HTMLDivElement>(null);
	const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});
	// Objective is per-test text shown in the pinned left column; off by default
	// and toggled from the Columns dropdown.
	const [showObjective, setShowObjective] = useState(false);
	// Active sort keys, newest click last. Each key targets one run's metric column
	// so the same metric can be sorted independently per run (Shift adds keys).
	const [sorting, setSorting] = useState<RunsProgressSort[]>([]);
	// A clicked cell pins a highlight that survives scrolling (and virtualized rows
	// mounting/unmounting). Tracks the run too, so the clicked run's metric column
	// can be bracketed top-to-bottom while the same metric in other runs only tints.
	const [pinnedCell, setPinnedCell] = useState<{
		rowId: string;
		runId: number;
		columnId: RunsProgressColumnId;
	} | null>(null);
	// The cell currently under the pointer drives the hover crosshair. It is
	// suppressed while a cell is pinned (clicking replaces the crosshair with the
	// persistent selection). Updated only when the pointer crosses into a new cell.
	const [hoveredCell, setHoveredCell] = useState<{
		rowId: string;
		runId: number;
		columnId: RunsProgressColumnId;
	} | null>(null);
	// A jump-to-cell briefly pulses the target so the eye catches where it landed.
	// Separate from the pin (which persists) so the flash can clear on its own timer.
	const [flashCell, setFlashCell] = useState<{
		rowId: string;
		runId: number;
		columnId: RunsProgressColumnId;
	} | null>(null);
	const flashTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	// Clear any pending flash timer if the matrix unmounts mid-pulse.
	useEffect(
		() => () => {
			if (flashTimeoutRef.current !== null)
				clearTimeout(flashTimeoutRef.current);
		},
		[]
	);

	// Stable so the memoized matrix cells don't re-render when RunsProgress re-renders
	// on scroll.
	const handleTogglePin = useCallback(
		(rowId: string, runId: number, columnId: RunsProgressColumnId) => {
			setHoveredCell(null);
			setPinnedCell((current) =>
				current &&
				current.rowId === rowId &&
				current.runId === runId &&
				current.columnId === columnId
					? null
					: { rowId, runId, columnId }
			);
		},
		[]
	);
	const handleHoverCell = useCallback(
		(rowId: string, runId: number, columnId: RunsProgressColumnId) => {
			setHoveredCell((current) =>
				current &&
				current.rowId === rowId &&
				current.runId === runId &&
				current.columnId === columnId
					? current
					: { rowId, runId, columnId }
			);
		},
		[]
	);
	const handleClearHover = useCallback(() => setHoveredCell(null), []);
	const [visibleColumnIds, setVisibleColumnIds] = useState<
		RunsProgressColumnId[]
	>(DEFAULT_VISIBLE_COLUMNS);
	// Full ordering of every metric column (visible or not); the dropdown lets the
	// user drag to reorder, and visibleColumns is derived by walking this order.
	const [columnOrder, setColumnOrder] =
		useState<RunsProgressColumnId[]>(ALL_COLUMN_IDS);

	// Cell N of every row aligns with run N, so a runId resolves to a cell index.
	const runIndexById = useMemo(
		() =>
			new Map(runs.map((progressRun, index) => [progressRun.run.id, index])),
		[runs]
	);
	// Cycle a metric header: unsorted → desc → asc → removed. Shift-click keeps the
	// other keys (multi-sort); a plain click collapses to just this one.
	const handleSort = useCallback(
		(runId: number, columnId: RunsProgressColumnId, additive: boolean) => {
			setSorting((current) => {
				const existing = current.find(
					(sort) => sort.runId === runId && sort.columnId === columnId
				);
				const others = additive
					? current.filter(
							(sort) => !(sort.runId === runId && sort.columnId === columnId)
					  )
					: [];

				if (!existing) return [...others, { runId, columnId, desc: true }];
				if (existing.desc) return [...others, { runId, columnId, desc: false }];

				return others;
			});
		},
		[]
	);
	const baseRows = useMemo(
		() => sortRows(rows, sorting, runIndexById),
		[rows, sorting, runIndexById]
	);
	const visibleRows = useMemo(
		() => getVisibleRows(baseRows, expandedRows),
		[baseRows, expandedRows]
	);
	// Row id → index in the visible list, so a jump can vertically center the row.
	const rowIndexById = useMemo(
		() => new Map(visibleRows.map((row, index) => [row.id, index])),
		[visibleRows]
	);
	const expandableRowIds = useMemo(
		() => getExpandableRowIds(baseRows),
		[baseRows]
	);
	const visibleColumns = useMemo(
		() =>
			columnOrder
				.map((id) => COLUMN_BY_ID.get(id))
				.filter(
					(column): column is RunsProgressColumn =>
						column !== undefined && visibleColumnIds.includes(column.id)
				),
		[columnOrder, visibleColumnIds]
	);
	const runColumnWidth = visibleColumns.length * METRIC_COLUMN_WIDTH;
	// The pinned left area grows when the Objective column is shown; every matrix
	// offset is measured from this width.
	const leftColumnWidth =
		LEFT_COLUMN_WIDTH + (showObjective ? OBJECTIVE_COLUMN_WIDTH : 0);
	// The group band only takes space while grouping is active.
	const groupBandHeight = groups.length ? GROUP_HEADER_HEIGHT : 0;
	const headerHeight = HEADER_HEIGHT + groupBandHeight;

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

	// The horizontal virtualizer caches its size estimate, so it keeps the old run
	// column width when metric columns are toggled. Re-measure whenever the per-run
	// width changes so cells resize to the new column count instead of overflowing.
	useEffect(() => {
		columnVirtualizer.measure();
	}, [columnVirtualizer, runColumnWidth]);

	// Clicking a point in a row's sparkline scrolls that run's column into view and
	// pins the cell so the eye lands on it. Prefers the unexpected metric (the usual
	// reason to jump) and falls back to the first visible column when it is hidden.
	const handleJumpToCell = useCallback(
		(rowId: string, runId: number) => {
			const runIndex = runIndexById.get(runId);

			if (runIndex === undefined) return;

			const scrollElement = parentRef.current;

			if (scrollElement) {
				// scrollToIndex's 'center' centers within the whole viewport, but the
				// sticky left column covers its leftmost leftColumnWidth px, so the cell
				// lands right-of-center. Center within the *uncovered* area instead, and
				// animate the move.
				const itemLeft = runIndex * runColumnWidth;
				const visibleWidth = scrollElement.clientWidth - leftColumnWidth;
				const targetLeft = itemLeft - (visibleWidth - runColumnWidth) / 2;
				const maxLeft = scrollElement.scrollWidth - scrollElement.clientWidth;
				const left = Math.max(0, Math.min(targetLeft, maxLeft));

				// Same idea vertically: the sticky header covers the top headerHeight px,
				// so center the row within the area below it.
				const rowIndex = rowIndexById.get(rowId);
				let top = scrollElement.scrollTop;

				if (rowIndex !== undefined) {
					const itemTop = rowIndex * ROW_HEIGHT;
					const visibleHeight = scrollElement.clientHeight - headerHeight;
					const targetTop = itemTop - (visibleHeight - ROW_HEIGHT) / 2;
					const maxTop =
						scrollElement.scrollHeight - scrollElement.clientHeight;
					top = Math.max(0, Math.min(targetTop, maxTop));
				}

				scrollElement.scrollTo({ left, top, behavior: 'smooth' });
			}

			const columnId = visibleColumnIds.includes('unexpected')
				? 'unexpected'
				: visibleColumns[0]?.id;

			if (columnId) {
				setPinnedCell({ rowId, runId, columnId });
				// Pulse the landed cell for ~3.6s (row-pulse runs 0.6s × 6), then drop
				// the flash so a later jump to the same cell can replay it.
				setFlashCell({ rowId, runId, columnId });
				if (flashTimeoutRef.current !== null) {
					clearTimeout(flashTimeoutRef.current);
				}
				flashTimeoutRef.current = setTimeout(() => {
					setFlashCell(null);
					flashTimeoutRef.current = null;
				}, 3600);
			}
		},
		[
			runIndexById,
			rowIndexById,
			runColumnWidth,
			leftColumnWidth,
			headerHeight,
			visibleColumnIds,
			visibleColumns
		]
	);

	// The row whose horizontal line is lit: the pinned row wins over hover (the hover
	// crosshair stands down while a cell is pinned), matching ProgressRow's own rule.
	const highlightedRowId = pinnedCell
		? pinnedCell.rowId
		: hoveredCell?.rowId ?? null;
	const virtualRows = rowVirtualizer.getVirtualItems();
	const virtualColumns = columnVirtualizer.getVirtualItems();
	const totalWidth = leftColumnWidth + columnVirtualizer.getTotalSize();
	const totalHeight = headerHeight + rowVirtualizer.getTotalSize();

	// Holding Ctrl turns vertical wheel movement into horizontal scrolling.
	// A native, non-passive listener is required so the page does not also
	// scroll vertically (or zoom) while panning the matrix sideways.
	useEffect(() => {
		const element: HTMLDivElement | null = parentRef.current;

		if (!element) return;

		const scrollElement = element;

		function handleWheel(event: WheelEvent) {
			if (!event.ctrlKey) return;

			const delta = event.deltaY || event.deltaX;

			if (!delta) return;

			scrollElement.scrollLeft += delta;
			event.preventDefault();
		}

		element.addEventListener('wheel', handleWheel, { passive: false });

		return () => element.removeEventListener('wheel', handleWheel);
	}, []);

	// Stable across scroll re-renders so memoized RowHeaderCells stay cheap. Only
	// expandable (depth > 0) rows ever reach this — RowHeaderCell gates the click.
	const handleRowToggle = useCallback((rowId: string) => {
		setExpandedRows((state) => ({
			...state,
			[rowId]: !(state[rowId] ?? false)
		}));
	}, []);

	function handleExpandAll() {
		setExpandedRows(
			Object.fromEntries(expandableRowIds.map((rowId) => [rowId, true]))
		);
	}

	function handleCollapseAll() {
		setExpandedRows({});
	}

	return (
		<main className={cn('bg-white rounded-md', isFetching && 'opacity-40')}>
			<CardHeader label="Runs Progress">
				<div className="flex items-center gap-3">
					<Legend />
					<div className="flex items-center gap-2">
						<ButtonTw variant="secondary" size="xss" onClick={handleExpandAll}>
							<Icon name="ExpandSelection" size={20} className="mr-1.5" />
							Open all levels
						</ButtonTw>
						<ButtonTw
							variant="secondary"
							size="xss"
							onClick={handleCollapseAll}
						>
							<Icon name="ChevronDown" size={20} className="mr-1.5" />
							Collapse
						</ButtonTw>
					</div>
					<GroupByMenu
						groupKey={groupKey}
						availableGroupKeys={availableGroupKeys}
						onGroupKeyChange={onGroupKeyChange}
					/>
					<ColumnsVisibility
						visibleColumnIds={visibleColumnIds}
						onVisibleColumnIdsChange={setVisibleColumnIds}
						columnOrder={columnOrder}
						onColumnOrderChange={setColumnOrder}
						showObjective={showObjective}
						onShowObjectiveChange={setShowObjective}
					/>
				</div>
			</CardHeader>
			<div
				ref={parentRef}
				onMouseLeave={handleClearHover}
				className="relative h-[calc(100vh-140px)] overflow-auto overscroll-contain"
			>
				<div
					className="relative"
					style={{ width: totalWidth, height: totalHeight }}
				>
					<div
						className="sticky top-0 z-30 bg-white border-b border-border-primary text-left text-[0.6875rem] font-semibold leading-[0.875rem]"
						style={{ width: totalWidth, height: headerHeight }}
					>
						<div
							className="sticky left-0 z-40 flex h-full bg-white border-r-2 border-gray-500"
							style={{ width: leftColumnWidth }}
						>
							<div
								className="flex h-full flex-1 flex-col justify-end gap-1 px-2 py-2"
								style={{ width: LEFT_COLUMN_WIDTH }}
							>
								<span className="uppercase text-text-menu">
									Test procedures
								</span>
								<span className="text-[0.6875rem] font-medium text-text-secondary">
									{visibleRows.length} visible rows across {runs.length} runs
								</span>
								{isCapped ? (
									<span className="inline-flex items-center gap-1 text-[0.625rem] font-medium text-text-unexpected">
										<Icon name="InformationCircleExclamationMark" size={12} />
										Showing the latest {cap} of {total} runs — select a date
										range or duration to view all.
									</span>
								) : null}
								<span className="text-[0.625rem] font-normal text-text-secondary">
									{groupKey
										? `Grouped by ${groupKey}. Hold Ctrl to scroll sideways.`
										: 'Trend reads newest → oldest. Hold Ctrl to scroll sideways.'}
								</span>
							</div>
							{showObjective ? (
								<div
									className="flex h-full flex-col justify-end gap-1 border-l-2 border-gray-500 px-2 py-2"
									style={{ width: OBJECTIVE_COLUMN_WIDTH }}
								>
									<span className="uppercase text-text-menu">Objective</span>
								</div>
							) : null}
						</div>
						{groups.map((group, groupIndex) => (
							<div
								key={group.id}
								className={cn(
									'absolute top-0 z-10 flex items-center justify-center border-r-2 border-border-primary px-2 text-[0.625rem] font-semibold uppercase tracking-wide text-text-primary',
									GROUP_COLORS[groupIndex % GROUP_COLORS.length]
								)}
								style={{
									height: GROUP_HEADER_HEIGHT,
									width: group.runCount * runColumnWidth,
									transform: `translateX(${
										leftColumnWidth + group.startIndex * runColumnWidth
									}px)`
								}}
								title={group.label}
							>
								<span className="truncate">{group.label}</span>
							</div>
						))}
						{virtualColumns.map((virtualColumn) => {
							const progressRun = runs[virtualColumn.index];

							return (
								<RunHeaderCell
									key={virtualColumn.key}
									run={progressRun.run}
									root={progressRun.root}
									columns={visibleColumns}
									sorting={sorting}
									onSort={handleSort}
									height={HEADER_HEIGHT}
									style={{
										width: virtualColumn.size,
										transform: `translateX(${
											leftColumnWidth + virtualColumn.start
										}px) translateY(${groupBandHeight}px)`
									}}
								/>
							);
						})}
					</div>
					{virtualRows.map((virtualRow) => {
						const row = visibleRows[virtualRow.index];
						// The next row down shares this row's bottom boundary; if it is the
						// highlighted row, its blue top edge lands there, so this row drops
						// its gray bottom line to keep the boundary a single line.
						const isNextRowHighlighted =
							highlightedRowId !== null &&
							visibleRows[virtualRow.index + 1]?.id === highlightedRowId;

						return (
							<ProgressRow
								key={virtualRow.key}
								row={row}
								runs={runs}
								columns={visibleColumns}
								virtualColumns={virtualColumns}
								showObjective={showObjective}
								leftColumnWidth={leftColumnWidth}
								onJumpToCell={handleJumpToCell}
								isExpanded={isRowExpanded(row, expandedRows)}
								isGrouped={Boolean(groupKey)}
								onToggle={handleRowToggle}
								isPinned={pinnedCell !== null}
								pinnedColumnId={pinnedCell?.columnId ?? null}
								pinnedRunId={pinnedCell?.runId ?? null}
								isPinnedRow={pinnedCell?.rowId === row.id}
								flashColumnId={flashCell?.columnId ?? null}
								flashRunId={flashCell?.runId ?? null}
								isFlashRow={flashCell?.rowId === row.id}
								hoveredColumnId={hoveredCell?.columnId ?? null}
								hoveredRunId={hoveredCell?.runId ?? null}
								isHoveredRow={hoveredCell?.rowId === row.id}
								isNextRowHighlighted={isNextRowHighlighted}
								onTogglePin={handleTogglePin}
								onHoverCell={handleHoverCell}
								style={{
									top: 0,
									width: totalWidth,
									height: virtualRow.size,
									transform: `translateY(${headerHeight + virtualRow.start}px)`
								}}
							/>
						);
					})}
				</div>
			</div>
		</main>
	);
}

function ProgressRow({
	row,
	runs,
	columns,
	virtualColumns,
	showObjective,
	leftColumnWidth,
	isExpanded,
	isGrouped,
	onToggle,
	onJumpToCell,
	isPinned,
	pinnedColumnId,
	pinnedRunId,
	isPinnedRow,
	flashColumnId,
	flashRunId,
	isFlashRow,
	hoveredColumnId,
	hoveredRunId,
	isHoveredRow,
	isNextRowHighlighted,
	onTogglePin,
	onHoverCell,
	style
}: {
	row: RunsProgressRow;
	runs: RunsProgressRun[];
	columns: RunsProgressColumn[];
	virtualColumns: VirtualItem[];
	showObjective: boolean;
	leftColumnWidth: number;
	isExpanded: boolean;
	isGrouped: boolean;
	onToggle: (rowId: string) => void;
	onJumpToCell: (rowId: string, runId: number) => void;
	isPinned: boolean;
	pinnedColumnId: RunsProgressColumnId | null;
	pinnedRunId: number | null;
	isPinnedRow: boolean;
	// The just-jumped cell to pulse, mirrored from the pinned-cell props.
	flashColumnId: RunsProgressColumnId | null;
	flashRunId: number | null;
	isFlashRow: boolean;
	hoveredColumnId: RunsProgressColumnId | null;
	hoveredRunId: number | null;
	isHoveredRow: boolean;
	// The next visible row is the highlighted one, so its blue top edge lands on
	// this row's bottom boundary — used to drop this row's gray bottom line.
	isNextRowHighlighted: boolean;
	onTogglePin: (
		rowId: string,
		runId: number,
		columnId: RunsProgressColumnId
	) => void;
	onHoverCell: (
		rowId: string,
		runId: number,
		columnId: RunsProgressColumnId
	) => void;
	style: CSSProperties;
}) {
	// The hover crosshair stands down while a cell is pinned so the selection reads
	// cleanly. The row line is part of the crosshair, so it follows the same rule.
	const rowLineHighlighted = isPinned ? isPinnedRow : isHoveredRow;
	// This row's bottom boundary carries the blue row line when the row itself is
	// highlighted (its bottom edge) or the row below it is (its top edge). The
	// boundary is a single owned border, recolored — never an overlay.
	const highlightBottomBorder = rowLineHighlighted || isNextRowHighlighted;

	return (
		<div
			className="group/row absolute left-0 text-[0.75rem] leading-[1.125rem] font-medium"
			style={style}
		>
			<RowHeaderCell
				row={row}
				runs={runs}
				isExpanded={isExpanded}
				isGrouped={isGrouped}
				showObjective={showObjective}
				leftColumnWidth={leftColumnWidth}
				highlightBottomBorder={highlightBottomBorder}
				onToggle={onToggle}
				onJumpToCell={onJumpToCell}
			/>
			{virtualColumns.map((virtualColumn) => (
				<ResultCell
					key={`${virtualColumn.key}-${row.id}`}
					cell={row.cells[virtualColumn.index]}
					columns={columns}
					rowId={row.id}
					leftColumnWidth={leftColumnWidth}
					isPinned={isPinned}
					pinnedColumnId={pinnedColumnId}
					pinnedRunId={pinnedRunId}
					isPinnedRow={isPinnedRow}
					flashColumnId={flashColumnId}
					flashRunId={flashRunId}
					isFlashRow={isFlashRow}
					hoveredColumnId={hoveredColumnId}
					hoveredRunId={hoveredRunId}
					highlightBottomBorder={highlightBottomBorder}
					onTogglePin={onTogglePin}
					onHoverCell={onHoverCell}
					width={virtualColumn.size}
					start={virtualColumn.start}
				/>
			))}
		</div>
	);
}

// Per-column vertical-edge state plus how the cell centre is filled. Each grid line
// is the cell's own border (recolored to primary when its boundary is highlighted),
// so only the left/right edges are tracked here; the horizontal row line is decided
// per row. One mechanism feeds both the pinned selection and the hover crosshair.
type CellHighlight = {
	left: boolean;
	right: boolean;
	// Cross-run tint along the selected row's metric strip.
	rowTint: boolean;
	// The exact clicked cell — strongest fill + full box.
	clicked: boolean;
};

const NO_HIGHLIGHT: CellHighlight = {
	left: false,
	right: false,
	rowTint: false,
	clicked: false
};

function getCellHighlight(
	columnId: RunsProgressColumnId,
	runId: number,
	isPinned: boolean,
	pinnedColumnId: RunsProgressColumnId | null,
	pinnedRunId: number | null,
	isPinnedRow: boolean,
	hoveredColumnId: RunsProgressColumnId | null,
	hoveredRunId: number | null
): CellHighlight {
	// Pinned selection wins: column bracket across every run + a full-width row
	// border across every column, with the clicked cell capped. The hover
	// crosshair is suppressed.
	if (isPinned) {
		const sameColumn = pinnedColumnId !== null && columnId === pinnedColumnId;
		const inRow = isPinnedRow;

		if (!sameColumn && !inRow) return NO_HIGHLIGHT;

		const clicked = sameColumn && inRow && runId === pinnedRunId;

		return {
			// Vertical bracket runs down every row of the metric column.
			left: sameColumn,
			right: sameColumn,
			// Tint only the metric strip (this column in the selected row).
			rowTint: sameColumn && inRow,
			clicked
		};
	}

	// Hover crosshair: the hovered single-run column (vertical) crossing the
	// hovered row (horizontal), meeting at the hovered cell.
	const sameHoverColumn =
		hoveredColumnId !== null &&
		columnId === hoveredColumnId &&
		runId === hoveredRunId;

	return {
		left: sameHoverColumn,
		right: sameHoverColumn,
		rowTint: false,
		clicked: false
	};
}

type RunsProgressSort = {
	runId: number;
	columnId: RunsProgressColumnId;
	desc: boolean;
};

function compareRows(
	left: RunsProgressRow,
	right: RunsProgressRow,
	sorting: RunsProgressSort[],
	runIndexById: Map<number, number>
): number {
	for (const sort of sorting) {
		const index = runIndexById.get(sort.runId);

		if (index === undefined) continue;

		const leftValue = getMetricValue(
			sort.columnId,
			getNodeStats(left.cells[index]?.node ?? null)
		);
		const rightValue = getMetricValue(
			sort.columnId,
			getNodeStats(right.cells[index]?.node ?? null)
		);

		if (leftValue !== rightValue) {
			return sort.desc ? rightValue - leftValue : leftValue - rightValue;
		}
	}

	return 0;
}

// Recursively, stably reorder siblings by the active sort keys; an empty key list
// (or fully-tied rows) preserves the incoming order so the tree shape is untouched.
function sortRows(
	rows: RunsProgressRow[],
	sorting: RunsProgressSort[],
	runIndexById: Map<number, number>
): RunsProgressRow[] {
	if (!sorting.length) return rows;

	return [...rows]
		.sort((left, right) => compareRows(left, right, sorting, runIndexById))
		.map((row) => ({
			...row,
			children: sortRows(row.children, sorting, runIndexById)
		}));
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

function SortableColumnItem({
	column,
	checked,
	onToggle
}: {
	column: RunsProgressColumn;
	checked: boolean;
	onToggle: (checked: boolean) => void;
}) {
	const {
		attributes,
		listeners,
		setNodeRef,
		transform,
		transition,
		isDragging
	} = useSortable({ id: column.id });

	const style: CSSProperties = {
		transform: CSS.Transform.toString(transform),
		transition
	};

	return (
		<div
			ref={setNodeRef}
			style={style}
			className={cn(
				'flex items-center gap-1.5 rounded py-1 pr-2 text-xs hover:bg-primary-wash',
				isDragging && 'relative z-10 bg-primary-wash shadow-sm'
			)}
		>
			<button
				type="button"
				className="grid h-5 w-5 shrink-0 cursor-grab touch-none place-items-center text-text-menu active:cursor-grabbing"
				aria-label={`Reorder ${column.label} column`}
				{...attributes}
				{...listeners}
			>
				<Icon name="ThreeDotsVertical" size={20} />
			</button>
			<div
				className="flex flex-1 cursor-pointer items-center gap-2 py-0.5"
				onClick={() => onToggle(!checked)}
			>
				<Checkbox
					checked={checked}
					className="pointer-events-none"
					tabIndex={-1}
					aria-hidden
				/>
				<span className="flex select-none items-center gap-1.5">
					{column.label}
					{column.icon}
				</span>
			</div>
		</div>
	);
}

function ColumnsVisibility({
	visibleColumnIds,
	onVisibleColumnIdsChange,
	columnOrder,
	onColumnOrderChange,
	showObjective,
	onShowObjectiveChange
}: {
	visibleColumnIds: RunsProgressColumnId[];
	onVisibleColumnIdsChange: (columnIds: RunsProgressColumnId[]) => void;
	columnOrder: RunsProgressColumnId[];
	onColumnOrderChange: (columnOrder: RunsProgressColumnId[]) => void;
	showObjective: boolean;
	onShowObjectiveChange: (showObjective: boolean) => void;
}) {
	const [isOpen, setIsOpen] = useState(false);
	const sensors = useSensors(
		useSensor(PointerSensor, { activationConstraint: { distance: 4 } })
	);

	function handleColumnChange(
		columnId: RunsProgressColumnId,
		isChecked: boolean
	) {
		if (isChecked) {
			onVisibleColumnIdsChange([...visibleColumnIds, columnId]);
			return;
		}

		if (visibleColumnIds.length === 1) return;

		onVisibleColumnIdsChange(visibleColumnIds.filter((id) => id !== columnId));
	}

	function handleDragEnd(event: DragEndEvent) {
		const { active, over } = event;

		if (!over || active.id === over.id) return;

		const oldIndex = columnOrder.indexOf(active.id as RunsProgressColumnId);
		const newIndex = columnOrder.indexOf(over.id as RunsProgressColumnId);

		if (oldIndex === -1 || newIndex === -1) return;

		onColumnOrderChange(arrayMove(columnOrder, oldIndex, newIndex));
	}

	return (
		<DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
			<DropdownMenuTrigger asChild>
				<ButtonTw variant="secondary" size="xss" state={isOpen && 'active'}>
					<Icon name="DashboardModeColumns" size={20} className="mr-1.5" />
					Columns
					<Icon name="ArrowShortSmall" className="ml-1.5" />
				</ButtonTw>
			</DropdownMenuTrigger>
			<DropdownMenuContent collisionPadding={{ right: 15 }} className="w-56">
				<DropdownMenuLabel className="text-xs">Test info</DropdownMenuLabel>
				<Separator className="h-px my-1 -mx-1" />
				<div
					className="flex cursor-pointer items-center gap-2 rounded py-1.5 pl-[26px] pr-2 text-xs hover:bg-primary-wash"
					onClick={() => onShowObjectiveChange(!showObjective)}
				>
					<Checkbox
						checked={showObjective}
						className="pointer-events-none"
						tabIndex={-1}
						aria-hidden
					/>
					<span className="select-none">Objective</span>
				</div>
				<Separator className="h-px my-1 -mx-1" />
				<DropdownMenuLabel className="text-xs">
					Result Columns
				</DropdownMenuLabel>
				<Separator className="h-px my-1 -mx-1" />
				<DndContext
					sensors={sensors}
					collisionDetection={closestCenter}
					onDragEnd={handleDragEnd}
				>
					<SortableContext
						items={columnOrder}
						strategy={verticalListSortingStrategy}
					>
						{columnOrder.map((id) => {
							const column = COLUMN_BY_ID.get(id);

							if (!column) return null;

							return (
								<SortableColumnItem
									key={id}
									column={column}
									checked={visibleColumnIds.includes(id)}
									onToggle={(isChecked) => handleColumnChange(id, isChecked)}
								/>
							);
						})}
					</SortableContext>
				</DndContext>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}

const NO_GROUPING_VALUE = '__none__';

function GroupByMenu({
	groupKey,
	availableGroupKeys,
	onGroupKeyChange
}: {
	groupKey: string | null;
	availableGroupKeys: string[];
	onGroupKeyChange: (groupKey: string | null) => void;
}) {
	const [isOpen, setIsOpen] = useState(false);

	if (!availableGroupKeys.length) return null;

	return (
		<DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
			<DropdownMenuTrigger asChild>
				<ButtonTw
					variant="secondary"
					size="xss"
					state={(isOpen || Boolean(groupKey)) && 'active'}
				>
					<Icon name="Category" size={20} className="mr-1.5" />
					{groupKey ? `Group: ${groupKey}` : 'Group by'}
					<Icon name="ArrowShortSmall" className="ml-1.5" />
				</ButtonTw>
			</DropdownMenuTrigger>
			<DropdownMenuContent collisionPadding={{ right: 15 }} className="w-56">
				<DropdownMenuLabel className="text-xs">
					Group runs by metadata
				</DropdownMenuLabel>
				<Separator className="h-px my-1 -mx-1" />
				<DropdownMenuRadioGroup
					value={groupKey ?? NO_GROUPING_VALUE}
					onValueChange={(value) =>
						onGroupKeyChange(value === NO_GROUPING_VALUE ? null : value)
					}
				>
					<DropdownMenuRadioItem value={NO_GROUPING_VALUE} className="text-xs">
						No grouping
					</DropdownMenuRadioItem>
					{availableGroupKeys.map((key) => (
						<DropdownMenuRadioItem key={key} value={key} className="text-xs">
							{key}
						</DropdownMenuRadioItem>
					))}
				</DropdownMenuRadioGroup>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}

function Legend() {
	return (
		<div className="flex items-center gap-2.5 text-[0.6875rem] font-medium text-text-secondary">
			<span className="inline-flex items-center gap-1">
				<span className="inline-flex text-text-expected">
					<TrendArrowGlyph increased />
				</span>{' '}
				Improved
			</span>
			<span className="inline-flex items-center gap-1">
				<span className="inline-flex text-text-unexpected">
					<TrendArrowGlyph increased={false} />
				</span>{' '}
				Regressed
			</span>
			<span className="inline-flex items-center gap-1">
				<span className="text-[hsl(40_55%_42%)]">●</span> Changed
			</span>
		</div>
	);
}

function RunHeaderCell({
	run,
	root,
	columns,
	sorting,
	onSort,
	height,
	style
}: {
	run: RunsProgressRun['run'];
	root: RunData;
	columns: RunsProgressColumn[];
	sorting: RunsProgressSort[];
	onSort: (
		runId: number,
		columnId: RunsProgressColumnId,
		additive: boolean
	) => void;
	height: number;
	style: CSSProperties;
}) {
	const metadata = useMemo<BadgeListItem[]>(() => {
		return run.metadata
			.filter(Boolean)
			.slice(0, 8)
			.map((tag) => ({ payload: tag }));
	}, [run.metadata]);

	const { icon, bg, color } = getRunStatusInfo(run.conclusion as RUN_STATUS);

	return (
		<div
			className="absolute top-0 border-r-2 border-gray-500 bg-white"
			style={{ ...style, height }}
		>
			<div className="flex" style={{ height: height - HEADER_STRIP_HEIGHT }}>
				<ConclusionHoverCard
					conclusion={run.conclusion as RUN_STATUS}
					conclusionReason={run.conclusion_reason}
					side="right"
					align="start"
				>
					<div
						className={cn(
							'flex w-6 shrink-0 flex-col items-center pt-2.5',
							bg,
							color
						)}
					>
						{icon}
					</div>
				</ConclusionHoverCard>
				<div className="flex min-w-0 flex-1 flex-col px-2 py-1.5">
					<LinkWithProject
						to={`/runs/${run.id}`}
						className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
					>
						<Icon name="BoxArrowRight" size={16} />
						{run.id}
					</LinkWithProject>
					<div className="mt-0.5 truncate text-[0.6875rem] font-medium text-text-secondary">
						{formatDate(run.start)}
					</div>
					<RunHealthBar stats={root.stats} />
					<div className="mt-1 max-h-[34px] overflow-hidden">
						<BadgeList
							badges={metadata}
							className="bg-badge-4 whitespace-nowrap"
						/>
					</div>
				</div>
			</div>
			<div
				className="absolute bottom-0 left-0 right-0 grid border-y border-border-primary bg-white text-[0.6875rem] font-semibold uppercase leading-[0.875rem]"
				style={{
					height: HEADER_STRIP_HEIGHT,
					gridTemplateColumns: `repeat(${columns.length}, minmax(0, 1fr))`
				}}
			>
				{columns.map((column) => {
					// The sort key this run+column owns (drives the arrow + highlight).
					const ownIndex = sorting.findIndex(
						(sort) => sort.runId === run.id && sort.columnId === column.id
					);
					const own = ownIndex === -1 ? null : sorting[ownIndex];
					// Any key on this metric, possibly driven by another run — so every
					// run header still signals which metric the matrix is sorted by.
					const metricIndex = sorting.findIndex(
						(sort) => sort.columnId === column.id
					);
					const metric = metricIndex === -1 ? null : sorting[metricIndex];

					return (
						<button
							type="button"
							key={column.id}
							onClick={(event) => onSort(run.id, column.id, event.shiftKey)}
							className={cn(
								'flex items-center justify-end gap-1 border-r border-border-primary/60 px-1.5 uppercase transition-colors last:border-r-0 hover:bg-primary-wash',
								own && 'bg-primary-wash text-primary'
							)}
							title={`${column.label} — click to sort, Shift+click for multi-sort`}
						>
							<span className="truncate">{column.shortLabel}</span>
							{column.icon}
							{own ? (
								<span className="inline-flex shrink-0 items-center gap-0.5 text-primary">
									<span>{own.desc ? '▼' : '▲'}</span>
									{sorting.length > 1 && (
										<span className="text-[0.5625rem] tabular-nums">
											{ownIndex + 1}
										</span>
									)}
								</span>
							) : metric ? (
								<span className="inline-flex shrink-0 items-center text-text-secondary/60">
									{metric.desc ? '▼' : '▲'}
								</span>
							) : null}
						</button>
					);
				})}
			</div>
		</div>
	);
}

function RunHealthBar({ stats }: { stats: RunData['stats'] }) {
	const total = getStatsTotal(stats);
	const bad = getUnexpectedTotal(stats) + stats.abnormal;
	const good = Math.max(0, total - bad);
	const goodPct = total === 0 ? 0 : (good / total) * 100;
	const badPct = total === 0 ? 0 : (bad / total) * 100;

	return (
		<div className="mt-1.5">
			<div className="flex h-2 w-full overflow-hidden rounded-full bg-gray-200">
				<div className="h-full bg-[#65cd84]" style={{ width: `${goodPct}%` }} />
				<div className="h-full bg-[#f95c78]" style={{ width: `${badPct}%` }} />
			</div>
			<div className="mt-0.5 flex items-center justify-between text-[0.625rem] font-medium leading-none">
				<span className="text-text-secondary tabular-nums">{total} tests</span>
				<span
					className={cn(
						'tabular-nums',
						bad > 0 ? 'text-text-unexpected' : 'text-text-secondary'
					)}
				>
					{bad} unexpected
				</span>
			</div>
		</div>
	);
}

const RowHeaderCell = memo(function RowHeaderCell({
	row,
	runs,
	isExpanded,
	isGrouped,
	showObjective,
	leftColumnWidth,
	highlightBottomBorder,
	onToggle,
	onJumpToCell
}: {
	row: RunsProgressRow;
	runs: RunsProgressRun[];
	isExpanded: boolean;
	isGrouped: boolean;
	showObjective: boolean;
	leftColumnWidth: number;
	// Mirrors the matrix cells: recolor the bottom grid line to primary when the row
	// highlight owns this boundary, so the sticky header column joins the row line.
	highlightBottomBorder: boolean;
	onToggle: (rowId: string) => void;
	onJumpToCell: (rowId: string, runId: number) => void;
}) {
	const canExpand = row.children.length > 0;
	const canToggle = canExpand && row.depth > 0;
	const [isChartOpen, setIsChartOpen] = useState(false);

	// Cells are stored newest-first; keep that order so the sparkline aligns with
	// the pinned run columns (newest on the left). Cell N aligns with run N.
	const sparklinePoints = useMemo<SparklinePoint[]>(
		() =>
			row.cells.map((cell, index) => {
				const stats = getNodeStats(cell.node);
				const unexpected = getUnexpectedTotal(stats);

				return {
					present: Boolean(cell.node),
					total: getStatsTotal(stats),
					nok: unexpected + stats.abnormal,
					unexpected,
					abnormal: stats.abnormal,
					runId: cell.runId,
					resultId: cell.node?.result_id ?? null,
					runStart: runs[index]?.run.start ?? ''
				};
			}),
		[row.cells, runs]
	);

	return (
		<div
			className={cn(
				'sticky left-0 z-20 flex h-full items-center border-b border-r-2 border-r-gray-500 bg-white text-[0.75rem] font-medium text-text-primary',
				highlightBottomBorder ? 'border-b-primary' : 'border-b-border-primary'
			)}
			style={{ width: leftColumnWidth }}
		>
			<div className="flex h-full min-w-0 flex-1 items-center gap-2 pl-2 pr-3">
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
				<HoverCard
					open={isChartOpen}
					onOpenChange={setIsChartOpen}
					openDelay={120}
					closeDelay={80}
					side="right"
					align="center"
					content={
						<SparklineHoverChart
							points={sparklinePoints}
							onPointClick={(index) => {
								setIsChartOpen(false);
								onJumpToCell(row.id, sparklinePoints[index].runId);
							}}
						/>
					}
				>
					<div
						className="flex shrink-0 cursor-pointer items-center justify-center"
						style={{ width: SPARKLINE_WIDTH }}
						aria-label={
							isGrouped
								? 'Total results trend across runs (grouped order)'
								: 'Total results trend across runs (newest → oldest)'
						}
					>
						<Sparkline points={sparklinePoints} width={SPARKLINE_WIDTH} />
					</div>
				</HoverCard>
			</div>
			{showObjective ? (
				<div
					className="flex h-full shrink-0 items-center border-l-2 border-gray-500 px-2 font-normal text-text-secondary"
					style={{ width: OBJECTIVE_COLUMN_WIDTH }}
					title={row.objective}
				>
					<span className="truncate">{row.objective}</span>
				</div>
			) : null}
		</div>
	);
});

const ResultCell = memo(function ResultCell({
	cell,
	columns,
	rowId,
	leftColumnWidth,
	isPinned,
	pinnedColumnId,
	pinnedRunId,
	isPinnedRow,
	flashColumnId,
	flashRunId,
	isFlashRow,
	hoveredColumnId,
	hoveredRunId,
	highlightBottomBorder,
	onTogglePin,
	onHoverCell,
	width,
	start
}: {
	cell: RunsProgressRow['cells'][number];
	columns: RunsProgressColumn[];
	rowId: string;
	leftColumnWidth: number;
	isPinned: boolean;
	pinnedColumnId: RunsProgressColumnId | null;
	pinnedRunId: number | null;
	isPinnedRow: boolean;
	// The just-jumped cell to pulse; only the matching cell animates.
	flashColumnId: RunsProgressColumnId | null;
	flashRunId: number | null;
	isFlashRow: boolean;
	hoveredColumnId: RunsProgressColumnId | null;
	hoveredRunId: number | null;
	// This row's bottom grid line is part of the row highlight (its own bottom edge,
	// or the top edge of the highlighted row directly below) — recolor it to primary.
	highlightBottomBorder: boolean;
	onTogglePin: (
		rowId: string,
		runId: number,
		columnId: RunsProgressColumnId
	) => void;
	onHoverCell: (
		rowId: string,
		runId: number,
		columnId: RunsProgressColumnId
	) => void;
	width: number;
	start: number;
}) {
	const node = cell.node;
	const stats = getNodeStats(node);
	const previousStats = getNodeStats(cell.previousNode);
	// No in-group predecessor (e.g. the oldest run of a group) means there is no
	// baseline to diff against, so deltas are suppressed rather than shown as +N
	// against empty stats.
	const hasPrevious = Boolean(cell.previousNode);

	// Stable column position so the memoized cell skips re-render on vertical
	// scroll (only width/start change when columns actually move).
	const style = useMemo<CSSProperties>(
		() => ({
			width,
			transform: `translateX(${leftColumnWidth + start}px)`
		}),
		[leftColumnWidth, width, start]
	);
	// Bound to this row+run once so every value shares one stable pin handler.
	const handlePin = useCallback(
		(columnId: RunsProgressColumnId) =>
			onTogglePin(rowId, cell.runId, columnId),
		[onTogglePin, rowId, cell.runId]
	);
	const handleHover = useCallback(
		(columnId: RunsProgressColumnId) =>
			onHoverCell(rowId, cell.runId, columnId),
		[onHoverCell, rowId, cell.runId]
	);

	// One highlight per metric column tells each grid line whether its boundary is
	// part of the crosshair/selection and should be recolored to primary.
	const highlights = node
		? columns.map((column) =>
				getCellHighlight(
					column.id,
					cell.runId,
					isPinned,
					pinnedColumnId,
					pinnedRunId,
					isPinnedRow,
					hoveredColumnId,
					hoveredRunId
				)
		  )
		: [];
	// The 2px run separator is the last column's right edge. Recolor it (still 2px)
	// when that edge is highlighted, or when the pinned column is the first column —
	// then every run's separator is the left edge of that bracketed column.
	const pinnedIsFirstColumn =
		isPinned && pinnedColumnId !== null && pinnedColumnId === columns[0]?.id;
	const highlightRunSeparator =
		Boolean(highlights[highlights.length - 1]?.right) || pinnedIsFirstColumn;

	return (
		<div
			className={cn(
				'absolute top-0 grid h-full items-center border-b bg-white text-[0.6875rem] font-medium',
				// The bottom grid line is the cell's own border, recolored to primary when
				// highlighted. With no right border to miter against it, this line now spans
				// the full cell width, so the row line stays continuous across run
				// boundaries. Width never changes so nothing reflows.
				highlightBottomBorder ? 'border-b-primary' : 'border-b-border-primary'
			)}
			style={{
				...style,
				gridTemplateColumns: `repeat(${columns.length}, minmax(0, 1fr))`
			}}
		>
			{node ? (
				columns.map((column, columnIndex) => {
					const highlight = highlights[columnIndex];
					// A column owns the grid line on its right; recolor it when either
					// this column's right edge or the next column's left edge is
					// highlighted (both sides of an interior boundary resolve here).
					const highlightRightBorder =
						highlight.right || Boolean(highlights[columnIndex + 1]?.left);
					// Only the exact just-jumped cell pulses.
					const isFlashing =
						isFlashRow &&
						cell.runId === flashRunId &&
						column.id === flashColumnId;

					return (
						<ResultColumnValue
							key={column.id}
							column={column}
							stats={stats}
							previousStats={previousStats}
							hasPrevious={hasPrevious}
							runId={cell.runId}
							resultId={node.result_id}
							rowTint={highlight.rowTint}
							isClicked={highlight.clicked}
							isFlashing={isFlashing}
							isLastColumn={columnIndex === columns.length - 1}
							highlightRightBorder={highlightRightBorder}
							onPin={handlePin}
							onHover={handleHover}
						/>
					);
				})
			) : (
				<span className="col-span-full px-3 text-text-secondary">No data</span>
			)}
			{/* The 2px run separator. Each cell is one row, so this is that row's
			    segment of the separator; stacking the segments forms the continuous
			    vertical line. It spans the full cell height (`-bottom-px` reaches over
			    the cell's bottom border) and is drawn after the columns so it stays
			    crisp over tinted cells. */}
			<div
				className={cn(
					'pointer-events-none absolute right-0 top-0 -bottom-px w-0.5',
					highlightRunSeparator ? 'bg-primary' : 'bg-gray-500'
				)}
			/>
			{/* When this cell's bottom row line is highlighted, the separator above
			    would cover its right 2px and break the (primary) line. Re-draw that
			    line on top as a full-width 1px bridge so the highlighted row line stays
			    continuous across every separator while the separators stay gray. */}
			{highlightBottomBorder ? (
				<div className="pointer-events-none absolute inset-x-0 -bottom-px h-px bg-primary" />
			) : null}
		</div>
	);
});

const ResultColumnValue = memo(function ResultColumnValue({
	column,
	stats,
	previousStats,
	hasPrevious,
	runId,
	resultId,
	rowTint,
	isClicked,
	isFlashing,
	isLastColumn,
	highlightRightBorder,
	onPin,
	onHover
}: {
	column: RunsProgressColumn;
	stats: ReturnType<typeof getNodeStats>;
	previousStats: ReturnType<typeof getNodeStats>;
	hasPrevious: boolean;
	runId: number;
	resultId: number;
	// Cross-run blue tint along the selected row's metric strip.
	rowTint: boolean;
	// The exact clicked cell — strongest fill at the centre of the selection.
	isClicked: boolean;
	// Briefly true right after a jump lands here — pulses the cell to draw the eye.
	isFlashing: boolean;
	// Last column has no right grid line (the cell's run separator owns that edge).
	isLastColumn: boolean;
	// This column's right boundary is part of the crosshair/selection, so its grid
	// line is recolored to primary instead of drawing a separate overlay on top.
	highlightRightBorder: boolean;
	onPin: (columnId: RunsProgressColumnId) => void;
	onHover: (columnId: RunsProgressColumnId) => void;
}) {
	// The "open test in run" link is invisible until this metric is hovered, so it
	// is mounted on demand instead of in every one of the ~thousands of cells. That
	// per-cell react-router Link + SVG was the dominant render cost.
	const [isHovered, setIsHovered] = useState(false);
	const value = getMetricValue(column.id, stats);
	const previousValue = getMetricValue(column.id, previousStats);
	const delta = hasPrevious
		? getMetricDelta(value, previousValue, column.trendDirection)
		: null;
	// Selected cells (the clicked cell + its metric strip) deepen their own
	// change-aware hue — red redder, green greener, amber more amber. Cells with no
	// change at all fall back to a blue selection tint so the strip still reads as
	// selected.
	const isSelected = rowTint || isClicked;
	const tintedToneClassName = getMetricToneClassName(
		column.trendDirection,
		value,
		previousValue,
		hasPrevious,
		isSelected
	);
	const selectionFallback = isSelected
		? isClicked
			? 'bg-[rgba(59,130,246,0.24)]'
			: 'bg-[rgba(59,130,246,0.14)]'
		: '';

	return (
		<div
			onMouseEnter={() => {
				setIsHovered(true);
				onHover(column.id);
			}}
			onMouseLeave={() => setIsHovered(false)}
			onClick={() => onPin(column.id)}
			className={cn(
				'group relative flex h-full min-w-0 cursor-pointer items-center justify-end gap-1 px-1.5',
				// The vertical grid line lives on this cell's own right edge; recolor it
				// to primary when highlighted so there is no separate overlay to stack on
				// top of the row line. Width never changes, so nothing reflows.
				!isLastColumn && 'border-r',
				!isLastColumn &&
					(highlightRightBorder
						? 'border-r-primary'
						: 'border-r-border-primary/60'),
				tintedToneClassName || selectionFallback,
				// Pulse the just-jumped cell (row-pulse runs 0.6s × 6 ≈ 3.6s).
				isFlashing && 'animate-row-pulse'
			)}
		>
			{isHovered && (
				<LinkWithProject
					to={routes.run({
						runId,
						targetIterationId: resultId,
						resultFilter: RUNS_PROGRESS_COL_TO_RUN_COLUMN_ID[column.id]
					})}
					onClick={(event) => event.stopPropagation()}
					title={`Open ${column.label} in run ${runId}`}
					className="absolute left-1.5 top-1/2 z-10 grid size-6 -translate-y-1/2 place-items-center rounded bg-white text-primary shadow-[0_0_0_1px_hsl(var(--colors-border-primary))] transition-colors hover:bg-primary hover:text-white"
				>
					<Icon name="BoxArrowRight" size={16} />
				</LinkWithProject>
			)}
			<TrendArrow delta={delta} />
			{value === 0 ? (
				<span className="px-2 py-0.5 text-text-secondary">0</span>
			) : (
				<Badge variant={column.badgeVariant}>{value}</Badge>
			)}
		</div>
	);
});

// The per-cell trend indicator: a bigger directional arrow + plain count, colored
// by status (green improved / red regressed / amber changed) to match the cell
// tone. The exact "+N (+X%) vs previous run" stays in the tooltip.
function TrendArrow({ delta }: { delta: MetricDelta }) {
	if (!delta) return null;

	return (
		<span
			title={delta.title}
			className={cn(
				'mr-auto inline-flex items-center gap-0.5 text-[0.625rem] font-semibold leading-none tabular-nums',
				delta.status === 'improved' && 'text-text-expected',
				delta.status === 'regressed' && 'text-text-unexpected',
				delta.status === 'changed' && 'text-[hsl(40_55%_42%)]'
			)}
		>
			<TrendArrowGlyph increased={delta.increased} />
			{delta.amount}
		</span>
	);
}

// The directional chevron shared by the in-cell trend indicator and the legend so
// both render the exact same glyph. `increased` points it up-right, otherwise
// down-right; color is inherited from the parent via currentColor.
function TrendArrowGlyph({ increased }: { increased: boolean }) {
	return (
		<svg
			viewBox="0 0 10 10"
			className={cn('size-3.5 shrink-0', increased ? '-rotate-45' : 'rotate-45')}
			aria-hidden
		>
			<path d="M1 4 L5 4 L5 1.5 L9 5 L5 8.5 L5 6 L1 6 Z" fill="currentColor" />
		</svg>
	);
}

function getMetricValue(
	columnId: RunsProgressColumnId,
	stats: ReturnType<typeof getNodeStats>
): number {
	switch (columnId) {
		case 'total':
			return getStatsTotal(stats);
		case 'run':
			return (
				stats.passed +
				stats.passed_unexpected +
				stats.failed +
				stats.failed_unexpected
			);
		case 'passedExpected':
			return stats.passed;
		case 'unexpected':
			return getUnexpectedTotal(stats);
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
