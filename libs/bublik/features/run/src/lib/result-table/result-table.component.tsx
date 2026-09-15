/* SPDX-License-Identifier: Apache-2.0 */
/* SPDX-FileCopyrightText: 2021-2023 OKTET Labs Ltd. */
import {
	CSSProperties,
	Fragment,
	MouseEvent as ReactMouseEvent,
	memo,
	useCallback,
	useMemo,
	useRef,
	useState
} from 'react';
import {
	flexRender,
	getCoreRowModel,
	getFilteredRowModel,
	getSortedRowModel,
	Row,
	useReactTable
} from '@tanstack/react-table';

import { useIsSticky, useMount } from '@/shared/hooks';
import { RunDataResults } from '@/shared/types';
import { cn, Skeleton, TwTableProps } from '@/shared/tailwind-ui';
import { BublikEmptyState, BublikErrorState } from '@/bublik/features/ui-state';

import { getColumns } from './result-table.columns';
import { ResultTableFilters } from './result-table-filters.component';
import {
	useColumnFilters,
	useDataTableFilters,
	useGlobalRequirementsFilters
} from './result-table.filters';
import { useTargetIterationId } from '../run-table/run-table.hooks';
import { RowState } from '../hooks';

const HEADER_HEIGHT = 102;
const STICKY_OFFSET = HEADER_HEIGHT + 1;
export interface SkeletonProps {
	rowCount?: number;
}

export const ResultTableLoading = ({ rowCount = 25 }: SkeletonProps) => {
	return (
		<div className="flex flex-col gap-1 mt-1 mb-1">
			<Skeleton className="rounded-b h-[38px]" />
			{Array(rowCount)
				.fill(1)
				.map((_, idx) => (
					<Skeleton key={idx} className="h-[110px] rounded" />
				))}
		</div>
	);
};

export interface ResultTableErrorProps {
	error: unknown;
}

export const ResultTableError = ({ error }: ResultTableErrorProps) => {
	return <BublikErrorState error={error} />;
};

export const ResultTableEmpty = () => {
	return (
		<BublikEmptyState
			title="No data"
			description="No result table data available"
		/>
	);
};

export interface ResultTableProps {
	rowId: string;
	data: RunDataResults[];
	showLinkToRun?: boolean;
	height: number;
	showToolbar: boolean;
	setShowToolbar: (showToolbar: boolean) => void;
	targetIterationId?: number;
	rowState?: RowState;
	onRowClick?: (row: Row<RunDataResults>) => void;
	path?: string;
}

export const ResultTable = memo((props: ResultTableProps) => {
	const {
		data = [],
		rowId,
		showLinkToRun = false,
		height,
		showToolbar,
		setShowToolbar,
		targetIterationId,
		rowState,
		onRowClick,
		path
	} = props;
	const {
		columnFilters,
		setColumnFilters,
		hasFilters: hasColumnFilters
	} = useColumnFilters(rowId);
	const filters = useDataTableFilters(rowId, data);
	const { hasGlobalRequirements } = useGlobalRequirementsFilters({
		localRequirements: filters.requirementsFilter
	});
	const hasFilters = hasColumnFilters || hasGlobalRequirements;
	const hasToolbar = showToolbar || hasFilters;

	const columns = useMemo(
		() =>
			getColumns({
				rowId,
				showLinkToRun,
				data,
				showToolbar: hasToolbar,
				setShowToolbar,
				path
			}),
		[rowId, showLinkToRun, data, hasToolbar, setShowToolbar, path]
	);

	const { stickyOffset } = useStickyHeader({ height });

	const table = useReactTable<RunDataResults>({
		data,
		getRowId: (row) => String(row.result_id),
		columns,
		manualPagination: true,
		getCoreRowModel: getCoreRowModel(),
		getSortedRowModel: getSortedRowModel(),
		getFilteredRowModel: getFilteredRowModel(),
		enableSorting: false,
		state: { columnFilters },
		onColumnFiltersChange: setColumnFilters
	});

	const gridTemplateColumns = columns
		.map((col) => col.meta?.['width'] || 'minmax(0, 1fr)')
		.join(' ');

	const headerRef = useRef<HTMLDivElement | null>(null);
	const { isSticky } = useIsSticky(headerRef, {
		offset: stickyOffset
	});

	const HEADER_ROW_HEIGHT = 42;
	const columnCount = columns.length;

	return (
		<div className="px-4 pb-2">
			<div className="w-full">
				<div className="grid relative z-[5]" style={{ gridTemplateColumns }}>
					{table.getHeaderGroups().map((headerGroup) => (
						<Fragment key={headerGroup.id}>
							{headerGroup.headers.map((header, idx, headers) => {
								const className = header.column.columnDef.meta?.['className'];
								const headerCellClassName =
									header.column.columnDef.meta?.['headerCellClassName'];

								return (
									<div
										key={header.id}
										className={cn(
											'px-1 py-2 text-left text-[0.6875rem] font-semibold leading-[0.875rem] z-20',
											'bg-primary-wash sticky',
											'flex items-center',
											idx === 0 && !hasToolbar && 'rounded-bl-md',
											idx === headers.length - 1 &&
												!hasToolbar &&
												'rounded-br-md',
											!hasToolbar && 'mb-1',
											className,
											headerCellClassName
										)}
										style={{
											top: height + HEADER_HEIGHT,
											boxShadow:
												isSticky && !hasToolbar
													? `rgba(0, 0, 0, 0.1) ${idx === 0 ? 0 : 7}px 2px 10px`
													: 'none'
										}}
										ref={(el) => {
											if (idx === 0) {
												headerRef.current = el;
											}
										}}
									>
										{header.isPlaceholder
											? null
											: flexRender(
													header.column.columnDef.header,
													header.getContext()
											  )}
									</div>
								);
							})}
						</Fragment>
					))}

					{hasToolbar ? (
						<div
							className={cn(
								'flex items-center justify-between px-4 mb-1',
								'bg-white h-9 sticky shadow-sticky z-10 border-t border-border-primary'
							)}
							style={{
								gridColumn: `1 / ${columnCount + 1}`,
								top: `${height + HEADER_HEIGHT + HEADER_ROW_HEIGHT}px`
							}}
						>
							<ResultTableFilters {...filters} />
						</div>
					) : null}

					{table.getRowModel().rows.map((row, idx, arr) => (
						<ResultRow
							key={row.id}
							row={row}
							idx={idx}
							arr={arr}
							targetIterationId={targetIterationId}
							rowState={rowState}
							onRowClick={onRowClick}
						/>
					))}
				</div>
			</div>
		</div>
	);
});

interface ResultRowProps {
	row: Row<RunDataResults>;
	idx: number;
	arr: Row<RunDataResults>[];
	targetIterationId?: number;
	rowState?: RowState;
	onRowClick?: (row: Row<RunDataResults>) => void;
}

function ResultRow(props: ResultRowProps) {
	const { row, idx, arr, targetIterationId, rowState, onRowClick } = props;
	const firstCellRef = useRef<HTMLDivElement>(null);
	const isTarget = row.original.result_id === targetIterationId;
	const { setTargetIterationId } = useTargetIterationId();
	const INTERACTIVE_SELECTOR =
		'button, a, input, select, textarea, [role="button"], [data-stop-row-click="true"]';

	useMount(() => {
		if (!isTarget) return;
		firstCellRef.current?.scrollIntoView({
			behavior: 'smooth',
			block: 'center'
		});
		setTimeout(() => setTargetIterationId(null), 5000);
	});

	const [hovered, setHovered] = useState(false);

	function handleRowClick(event: ReactMouseEvent<HTMLDivElement>) {
		const target = event.target as HTMLElement;
		const interactiveParent = target.closest(INTERACTIVE_SELECTOR);

		if (interactiveParent) return;

		onRowClick?.(row);
	}

	return (
		<Fragment>
			{row.getVisibleCells().map((cell, cellIdx, cellArr) => {
				const className = cell.column.columnDef.meta?.['className'];
				const isReferenceDiffRow = rowState?.referenceDiffRowId === row.id;

				return (
					<div
						key={cell.id}
						onMouseEnter={() => setHovered(true)}
						onMouseLeave={() => setHovered(false)}
						className={cn(
							'px-1 py-2 bg-white text-text-primary text-[0.75rem] leading-[1.125rem] font-medium',
							'flex items-start whitespace-pre-wrap',
							'bg-primary-wash transition-colors',
							isReferenceDiffRow
								? 'border-y border-primary'
								: 'border-y border-y-transparent',
							idx !== arr.length - 1 && 'mb-1',
							cellIdx === 0 &&
								(isReferenceDiffRow
									? 'rounded-l-md border-l border-primary'
									: 'rounded-l-md border-l border-l-transparent'),
							cellIdx === cellArr.length - 1 &&
								(isReferenceDiffRow
									? 'rounded-r-md border-r border-primary'
									: 'rounded-r-md border-r border-r-transparent'),
							className,
							isTarget && 'animate-border-pulse',
							!isReferenceDiffRow &&
								hovered &&
								'border-y-primary border-l-primary border-r-primary'
						)}
						style={{
							overflowWrap: 'anywhere',
							cursor: onRowClick ? 'pointer' : 'default'
						}}
						ref={cellIdx === 0 ? firstCellRef : undefined}
						onClick={handleRowClick}
					>
						{flexRender(cell.column.columnDef.cell, cell.getContext())}
					</div>
				);
			})}
		</Fragment>
	);
}

interface StickyHeaderOptions {
	height: number;
}

function useStickyHeader({ height }: StickyHeaderOptions) {
	// Sticky offset is used for the useIsSticky hook to detect when header becomes sticky
	// Now that toolbar is below header, offset doesn't depend on toolbar visibility
	const stickyOffset = -(height + STICKY_OFFSET);

	const getHeaderProps = useCallback<
		NonNullable<TwTableProps<RunDataResults>['getHeaderProps']>
	>(
		(_, { isSticky }) => {
			return {
				style: {
					top: `${height + HEADER_HEIGHT}px`,
					position: 'sticky',
					boxShadow: isSticky ? '0 0 10px rgba(0, 0, 0, 0.1)' : 'none'
				} as CSSProperties
			};
		},
		[height]
	);

	return { stickyOffset, getHeaderProps };
}
