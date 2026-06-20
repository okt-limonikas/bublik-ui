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
	RunsProgressRun
} from './runs-progress.types';
import {
	filterChangedRows,
	getNodeStats,
	getStatsTotal,
	getUnexpectedTotal
} from './runs-progress.utils';
import { Sparkline, SparklinePoint } from './runs-progress.sparkline';

const ROW_HEIGHT = 34;
const HEADER_STRIP_HEIGHT = 34;
const HEADER_HEIGHT = 162;
// Band drawn above the run headers when runs are grouped by a metadata key.
const GROUP_HEADER_HEIGHT = 28;
const LEFT_COLUMN_WIDTH = 380;
const SPARKLINE_WIDTH = 76;
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
	trendDirection: 'higher-is-better' | 'lower-is-better' | 'neutral';
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
		id: 'passedExpected',
		label: 'Passed expected',
		shortLabel: 'Passed',
		trendDirection: 'higher-is-better',
		badgeVariant: BadgeVariants.ExpectedActive,
		icon: EXPECTED_ICON
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
		id: 'abnormal',
		label: 'Abnormal',
		shortLabel: 'Abnormal',
		trendDirection: 'lower-is-better',
		badgeVariant: BadgeVariants.Unexpected,
		icon: ABNORMAL_ICON
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
		id: 'failedExpected',
		label: 'Failed expected',
		shortLabel: 'Failed exp.',
		trendDirection: 'neutral',
		badgeVariant: BadgeVariants.ExpectedActive,
		icon: EXPECTED_ICON
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
	}
];

const DEFAULT_VISIBLE_COLUMNS: RunsProgressColumnId[] = [
	'total',
	'passedExpected',
	'unexpected',
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
}

function RunsProgress(props: RunsProgressProps) {
	const {
		runs,
		rows,
		groups,
		groupKey,
		availableGroupKeys,
		onGroupKeyChange,
		isFetching
	} = props;
	const parentRef = useRef<HTMLDivElement>(null);
	const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});
	const [changesOnly, setChangesOnly] = useState(false);
	const [dimUnchanged, setDimUnchanged] = useState(true);
	// A clicked (pinned) metric stays highlighted across all runs while scrolling,
	// without needing to keep the pointer over it. Lives at the top level so it
	// survives virtualized rows mounting/unmounting.
	const [pinnedCell, setPinnedCell] = useState<{
		rowId: string;
		columnId: RunsProgressColumnId;
	} | null>(null);

	// Stable so the memoized matrix cells don't re-render when RunsProgress re-renders
	// on scroll.
	const handleTogglePin = useCallback(
		(rowId: string, columnId: RunsProgressColumnId) => {
			setPinnedCell((current) =>
				current && current.rowId === rowId && current.columnId === columnId
					? null
					: { rowId, columnId }
			);
		},
		[]
	);
	const [visibleColumnIds, setVisibleColumnIds] = useState<
		RunsProgressColumnId[]
	>(DEFAULT_VISIBLE_COLUMNS);
	// Full ordering of every metric column (visible or not); the dropdown lets the
	// user drag to reorder, and visibleColumns is derived by walking this order.
	const [columnOrder, setColumnOrder] =
		useState<RunsProgressColumnId[]>(ALL_COLUMN_IDS);

	const baseRows = useMemo(
		() => (changesOnly ? filterChangedRows(rows) : rows),
		[changesOnly, rows]
	);
	const visibleRows = useMemo(
		() => getVisibleRows(baseRows, expandedRows),
		[baseRows, expandedRows]
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

	const virtualRows = rowVirtualizer.getVirtualItems();
	const virtualColumns = columnVirtualizer.getVirtualItems();
	const totalWidth = LEFT_COLUMN_WIDTH + columnVirtualizer.getTotalSize();
	const totalHeight = headerHeight + rowVirtualizer.getTotalSize();

	// Holding Shift turns vertical wheel movement into horizontal scrolling.
	// A native, non-passive listener is required so the page does not also
	// scroll vertically while panning the matrix sideways.
	useEffect(() => {
		const element: HTMLDivElement | null = parentRef.current;

		if (!element) return;

		const scrollElement = element;

		function handleWheel(event: WheelEvent) {
			if (!event.shiftKey) return;

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
						<ButtonTw
							variant="secondary"
							size="xss"
							state={changesOnly && 'active'}
							onClick={() => setChangesOnly((value) => !value)}
						>
							<Icon name="Filter" size={20} className="mr-1.5" />
							Changes only
						</ButtonTw>
						<ButtonTw
							variant="secondary"
							size="xss"
							state={dimUnchanged && 'active'}
							onClick={() => setDimUnchanged((value) => !value)}
						>
							<Icon name="EyeHide" size={20} className="mr-1.5" />
							Dim unchanged
						</ButtonTw>
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
					/>
				</div>
			</CardHeader>
			<div
				ref={parentRef}
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
							className="sticky left-0 z-40 flex h-full flex-col justify-end gap-1 bg-white px-2 py-2 border-r-2 border-gray-500"
							style={{ width: LEFT_COLUMN_WIDTH }}
						>
							<span className="uppercase text-text-menu">Test procedures</span>
							<span className="text-[0.6875rem] font-medium text-text-secondary">
								{visibleRows.length} visible rows across {runs.length} runs
							</span>
							<span className="text-[0.625rem] font-normal text-text-secondary">
								{groupKey
									? `Grouped by ${groupKey}. Hold Shift to scroll sideways.`
									: 'Trend reads newest → oldest. Hold Shift to scroll sideways.'}
							</span>
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
										LEFT_COLUMN_WIDTH + group.startIndex * runColumnWidth
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
									height={HEADER_HEIGHT}
									style={{
										width: virtualColumn.size,
										transform: `translateX(${
											LEFT_COLUMN_WIDTH + virtualColumn.start
										}px) translateY(${groupBandHeight}px)`
									}}
								/>
							);
						})}
					</div>
					{virtualRows.map((virtualRow) => {
						const row = visibleRows[virtualRow.index];

						return (
							<ProgressRow
								key={virtualRow.key}
								row={row}
								columns={visibleColumns}
								virtualColumns={virtualColumns}
								dimUnchanged={dimUnchanged}
								isExpanded={isRowExpanded(row, expandedRows)}
								isGrouped={Boolean(groupKey)}
								onToggle={handleRowToggle}
								pinnedColumnId={
									pinnedCell?.rowId === row.id ? pinnedCell.columnId : null
								}
								onTogglePin={handleTogglePin}
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
	columns,
	virtualColumns,
	dimUnchanged,
	isExpanded,
	isGrouped,
	onToggle,
	pinnedColumnId,
	onTogglePin,
	style
}: {
	row: RunsProgressRow;
	columns: RunsProgressColumn[];
	virtualColumns: VirtualItem[];
	dimUnchanged: boolean;
	isExpanded: boolean;
	isGrouped: boolean;
	onToggle: (rowId: string) => void;
	pinnedColumnId: RunsProgressColumnId | null;
	onTogglePin: (rowId: string, columnId: RunsProgressColumnId) => void;
	style: CSSProperties;
}) {
	// Which metric is hovered within this row — used to highlight the same metric
	// across every run column so a single value can be compared run-to-run.
	const [hoveredColumnId, setHoveredColumnId] =
		useState<RunsProgressColumnId | null>(null);

	return (
		<div
			className="absolute left-0 text-[0.75rem] leading-[1.125rem] font-medium"
			style={style}
			onMouseLeave={() => setHoveredColumnId(null)}
		>
			<RowHeaderCell
				row={row}
				isExpanded={isExpanded}
				isGrouped={isGrouped}
				onToggle={onToggle}
			/>
			{virtualColumns.map((virtualColumn) => (
				<ResultCell
					key={`${virtualColumn.key}-${row.id}`}
					cell={row.cells[virtualColumn.index]}
					columns={columns}
					dimUnchanged={dimUnchanged}
					rowId={row.id}
					hoveredColumnId={hoveredColumnId}
					pinnedColumnId={pinnedColumnId}
					onHoverColumn={setHoveredColumnId}
					onTogglePin={onTogglePin}
					width={virtualColumn.size}
					start={virtualColumn.start}
				/>
			))}
		</div>
	);
}

type HighlightState = 'none' | 'hover' | 'pinned';

function getHighlightState(
	columnId: RunsProgressColumnId,
	hoveredColumnId: RunsProgressColumnId | null,
	pinnedColumnId: RunsProgressColumnId | null
): HighlightState {
	if (columnId === pinnedColumnId) return 'pinned';
	if (columnId === hoveredColumnId) return 'hover';

	return 'none';
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
	onColumnOrderChange
}: {
	visibleColumnIds: RunsProgressColumnId[];
	onVisibleColumnIdsChange: (columnIds: RunsProgressColumnId[]) => void;
	columnOrder: RunsProgressColumnId[];
	onColumnOrderChange: (columnOrder: RunsProgressColumnId[]) => void;
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
									onToggle={(isChecked) =>
										handleColumnChange(id, isChecked)
									}
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
					<DropdownMenuRadioItem
						value={NO_GROUPING_VALUE}
						className="text-xs"
					>
						No grouping
					</DropdownMenuRadioItem>
					{availableGroupKeys.map((key) => (
						<DropdownMenuRadioItem
							key={key}
							value={key}
							className="text-xs"
						>
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
			<LegendItem className="bg-[#65cd84]" label="Passed" />
			<LegendItem className="bg-[#f95c78]" label="Unexpected" />
			<LegendItem className="bg-amber-400" label="Abnormal" />
			<span className="inline-flex items-center gap-1">
				<span className="text-text-expected">▲</span> improved
			</span>
			<span className="inline-flex items-center gap-1">
				<span className="text-text-unexpected">▼</span> regressed
			</span>
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
	root,
	columns,
	height,
	style
}: {
	run: RunsProgressRun['run'];
	root: RunData;
	columns: RunsProgressColumn[];
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
			<div
				className="flex"
				style={{ height: height - HEADER_STRIP_HEIGHT }}
			>
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
				{columns.map((column) => (
					<div
						key={column.id}
						className="flex items-center justify-end gap-1 border-r border-border-primary/60 px-1.5 transition-colors last:border-r-0 hover:bg-primary-wash"
						title={column.label}
					>
						<span className="truncate">{column.shortLabel}</span>
						{column.icon}
					</div>
				))}
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
	isExpanded,
	isGrouped,
	onToggle
}: {
	row: RunsProgressRow;
	isExpanded: boolean;
	isGrouped: boolean;
	onToggle: (rowId: string) => void;
}) {
	const canExpand = row.children.length > 0;
	const canToggle = canExpand && row.depth > 0;

	// Cells are stored newest-first; keep that order so the sparkline aligns with
	// the pinned run columns (newest on the left).
	const sparklinePoints = useMemo<SparklinePoint[]>(
		() =>
			row.cells.map((cell) => {
				const stats = getNodeStats(cell.node);

				return {
					present: Boolean(cell.node),
					total: getStatsTotal(stats),
					nok: getUnexpectedTotal(stats) + stats.abnormal
				};
			}),
		[row.cells]
	);

	return (
		<div
			className="sticky left-0 z-20 flex h-full items-center gap-2 border-b border-r-2 border-b-border-primary border-r-gray-500 bg-white pl-2 pr-3 text-[0.75rem] font-medium text-text-primary"
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
			<div
				className="flex shrink-0 items-center justify-center"
				style={{ width: SPARKLINE_WIDTH }}
				title={
					isGrouped
						? 'Total results trend across runs (grouped order)'
						: 'Total results trend across runs (newest → oldest)'
				}
			>
				<Sparkline points={sparklinePoints} width={SPARKLINE_WIDTH} />
			</div>
		</div>
	);
});

const ResultCell = memo(function ResultCell({
	cell,
	columns,
	dimUnchanged,
	rowId,
	hoveredColumnId,
	pinnedColumnId,
	onHoverColumn,
	onTogglePin,
	width,
	start
}: {
	cell: RunsProgressRow['cells'][number];
	columns: RunsProgressColumn[];
	dimUnchanged: boolean;
	rowId: string;
	hoveredColumnId: RunsProgressColumnId | null;
	pinnedColumnId: RunsProgressColumnId | null;
	onHoverColumn: (columnId: RunsProgressColumnId | null) => void;
	onTogglePin: (rowId: string, columnId: RunsProgressColumnId) => void;
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
	const isUnchanged = cell.trend === 'same';
	// Dimming applies to the cell contents only, so the run-boundary and row
	// borders stay crisp even for unchanged rows.
	const dim = dimUnchanged && isUnchanged;

	// Stable column position so the memoized cell skips re-render on vertical
	// scroll (only width/start change when columns actually move).
	const style = useMemo<CSSProperties>(
		() => ({
			width,
			transform: `translateX(${LEFT_COLUMN_WIDTH + start}px)`
		}),
		[width, start]
	);
	// Bound to this row's id once so every value shares one stable pin handler.
	const handlePin = useCallback(
		(columnId: RunsProgressColumnId) => onTogglePin(rowId, columnId),
		[onTogglePin, rowId]
	);

	return (
		<div
			className="absolute top-0 grid h-full items-center border-b border-r-2 border-b-border-primary border-r-gray-500 bg-white text-[0.6875rem] font-medium"
			style={{
				...style,
				gridTemplateColumns: `repeat(${columns.length}, minmax(0, 1fr))`
			}}
		>
			{node ? (
				columns.map((column) => (
					<ResultColumnValue
						key={column.id}
						column={column}
						stats={stats}
						previousStats={previousStats}
						hasPrevious={hasPrevious}
						dim={dim}
						runId={cell.runId}
						resultId={node.result_id}
						highlightState={getHighlightState(
							column.id,
							hoveredColumnId,
							pinnedColumnId
						)}
						onHover={onHoverColumn}
						onPin={handlePin}
					/>
				))
			) : (
				<span
					className={cn(
						'col-span-full px-3 text-text-secondary',
						dim && 'opacity-50'
					)}
				>
					No data
				</span>
			)}
		</div>
	);
});

const ResultColumnValue = memo(function ResultColumnValue({
	column,
	stats,
	previousStats,
	hasPrevious,
	dim,
	runId,
	resultId,
	highlightState,
	onHover,
	onPin
}: {
	column: RunsProgressColumn;
	stats: ReturnType<typeof getNodeStats>;
	previousStats: ReturnType<typeof getNodeStats>;
	hasPrevious: boolean;
	dim: boolean;
	runId: number;
	resultId: number;
	highlightState: HighlightState;
	onHover: (columnId: RunsProgressColumnId | null) => void;
	onPin: (columnId: RunsProgressColumnId) => void;
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
	// The "bad" tone only paints when this metric is highlight-free, so the blue
	// hover/pin highlight always wins (avoids arbitrary-value bg class conflicts).
	const toneClassName =
		highlightState === 'none'
			? getMetricToneClassName(column, value, previousValue, hasPrevious)
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
				'group relative flex h-full min-w-0 cursor-pointer items-center justify-between gap-1 border-r border-border-primary/60 px-1.5 last:border-r-0',
				toneClassName,
				dim && 'opacity-50',
				highlightState === 'hover' && 'bg-[rgba(59,130,246,0.14)]',
				highlightState === 'pinned' &&
					'bg-[rgba(59,130,246,0.24)] shadow-[inset_0_0_0_1.5px_rgba(59,130,246,0.6)]'
			)}
		>
			{isHovered && (
				<LinkWithProject
					to={routes.run({ runId, targetIterationId: resultId })}
					onClick={(event) => event.stopPropagation()}
					title={`Open test in run ${runId}`}
					className="absolute left-0.5 top-1/2 z-10 grid size-4 -translate-y-1/2 place-items-center rounded bg-white text-primary shadow-[0_0_0_1px_hsl(var(--colors-border-primary))] transition-colors hover:bg-primary hover:text-white"
				>
					<Icon name="BoxArrowRight" size={12} />
				</LinkWithProject>
			)}
			<DeltaPill delta={delta} />
			{value === 0 ? (
				<span className="px-2 py-0.5 text-text-secondary">0</span>
			) : (
				<Badge variant={column.badgeVariant}>{value}</Badge>
			)}
		</div>
	);
});

// Per-metric change-aware background tone for bad-type metrics (lower-is-better).
// Red when the metric regressed vs the older run (rose, or appeared with no
// baseline), green when it improved (fell). Carried-forward and expected/neutral
// metrics stay clean — the matrix is a progress view, so a stable value is not a
// change worth highlighting. Intensity scales with the size of the change.
function getMetricToneClassName(
	column: RunsProgressColumn,
	value: number,
	previousValue: number,
	hasPrevious: boolean
): string {
	if (column.trendDirection !== 'lower-is-better') return '';

	// No baseline: a non-zero bad value reads as a regression; there is nothing to
	// have improved on, so a zero stays clean.
	if (!hasPrevious) return value > 0 ? toneTierClassName(value, 'bad') : '';

	if (value === previousValue) return '';

	// lower-is-better: a drop is an improvement (green), a rise is a regression (red).
	const kind = value < previousValue ? 'good' : 'bad';

	return toneTierClassName(Math.abs(value - previousValue), kind);
}

// Tiered tint by the magnitude of the change. Colors match the legend: bad uses
// the unexpected red (#f95c78), good uses the passed green (#65cd84).
function toneTierClassName(magnitude: number, kind: 'bad' | 'good'): string {
	const tiers =
		kind === 'bad'
			? [
					'bg-[rgba(249,92,120,0.08)]',
					'bg-[rgba(249,92,120,0.14)]',
					'bg-[rgba(249,92,120,0.22)]'
			  ]
			: [
					'bg-[rgba(101,205,132,0.08)]',
					'bg-[rgba(101,205,132,0.14)]',
					'bg-[rgba(101,205,132,0.22)]'
			  ];

	if (magnitude >= 5) return tiers[2];
	if (magnitude >= 2) return tiers[1];

	return tiers[0];
}

type MetricDeltaStatus = 'improved' | 'regressed' | 'changed';

type MetricDelta = {
	label: string;
	title: string;
	status: MetricDeltaStatus;
} | null;

function getMetricDelta(
	value: number,
	previousValue: number,
	direction: RunsProgressColumn['trendDirection']
): MetricDelta {
	if (value === previousValue) return null;

	const diff = value - previousValue;
	const sign = diff > 0 ? '+' : '';
	const arrow = diff > 0 ? '▲' : '▼';

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
		label: `${arrow}${Math.abs(diff)}`,
		title,
		status
	};
}

function DeltaPill({ delta }: { delta: MetricDelta }) {
	if (!delta) return null;

	return (
		<span
			title={delta.title}
			className={cn(
				'rounded px-1 py-0.5 text-[0.5625rem] font-semibold leading-none tabular-nums',
				delta.status === 'improved' && 'bg-diff-added text-text-expected',
				delta.status === 'regressed' && 'bg-diff-removed text-text-unexpected',
				delta.status === 'changed' && 'bg-gray-100 text-text-secondary'
			)}
		>
			{delta.label}
		</span>
	);
}

function getMetricValue(
	columnId: RunsProgressColumnId,
	stats: ReturnType<typeof getNodeStats>
): number {
	switch (columnId) {
		case 'total':
			return getStatsTotal(stats);
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
