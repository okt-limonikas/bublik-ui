/* SPDX-License-Identifier: Apache-2.0 */
/* SPDX-FileCopyrightText: 2021-2023 OKTET Labs Ltd. */
import {
	CSSProperties,
	Fragment,
	ReactNode,
	SVGProps,
	useMemo,
	useState
} from 'react';
import {
	ExpandedState,
	flexRender,
	getCoreRowModel,
	getExpandedRowModel,
	getFilteredRowModel,
	getSortedRowModel,
	Header,
	Row,
	Table,
	useReactTable
} from '@tanstack/react-table';
import { fromDate, getLocalTimeZone } from '@internationalized/date';

import { DashboardAPIResponse, DashboardData } from '@/shared/types';
import { cn, Icon, Skeleton, SwitchDatePicker } from '@/shared/tailwind-ui';
import { splitInHalf } from '@/shared/utils';
import { getErrorMessage } from '@/services/bublik-api';

import { createColumns } from './dashboard-table.component.columns';
import { DashboardLayoutType } from './dashboard-table.types';
import {
	bodyCellStyles,
	bodyCellErrorStyles,
	bodyRowStyles,
	gridContainerStyles,
	headerCellStyles
} from './dashboard-table.component.styles';
import { isRowError } from './dashboard-table.component.utils';

const DEFAULT_ROWS: DashboardAPIResponse['rows'] = [];

export const DashboardTableLoading = ({ rowNumber }: { rowNumber: number }) => {
	return (
		<div className="flex flex-col flex-grow gap-1">
			<Skeleton className="h-8.5" />
			<Skeleton className="h-8.5" />
			<ul className="flex flex-col gap-1">
				{Array.from({ length: rowNumber }, (_, idx) => idx).map((idx) => (
					<Skeleton key={idx} className="h-8.5 rounded-md" />
				))}
			</ul>
		</div>
	);
};

interface DashboardTableErrorProps {
	error: unknown;
}

export const DashboardTableError = ({ error }: DashboardTableErrorProps) => {
	const { title, description, status } = getErrorMessage(error);

	return (
		<div className="grid place-items-center h-[calc(100vh-256px)]">
			<div className="flex flex-col items-center text-center">
				<Icon
					name="TriangleExclamationMark"
					size={24}
					className="text-text-unexpected"
				/>
				<h3 className="mt-2 text-sm font-medium text-gray-900">
					{status} {title}
				</h3>
				<p className="mt-1 text-sm text-gray-500">{description}</p>
			</div>
		</div>
	);
};

export const DashboardTableEmpty = () => {
	return (
		<div className="grid place-items-center h-[calc(100vh-256px)]">
			<div className="flex flex-col items-center text-center">
				<Icon
					name="TriangleExclamationMark"
					size={24}
					className="text-text-unexpected"
				/>
				<h3 className="mt-2 text-sm font-medium text-gray-900">No data</h3>
				<p className="mt-1 text-sm text-gray-500">
					No data for this day present
				</p>
			</div>
		</div>
	);
};

export interface DashboardTableProps {
	date?: Date;
	headers?: DashboardAPIResponse['header'];
	rows?: DashboardAPIResponse['rows'];
	context: Record<string, string>;
	onDateChange?: (newDate: Date) => void;
	renderSubrow?: (
		row: Row<DashboardData>,
		context: DashboardAPIResponse['payload']
	) => ReactNode;
	layout?: DashboardLayoutType;
	isFetching?: boolean;
	globalFilter?: string;
	error?: unknown;
}

export const DashboardTable = (props: DashboardTableProps) => {
	const {
		headers = [],
		rows = DEFAULT_ROWS,
		layout = 'row',
		date = new Date(),
		onDateChange,
		isFetching,
		globalFilter,
		renderSubrow,
		context,
		error
	} = props;
	const [expanded, setExpanded] = useState<ExpandedState>({});

	const table = useReactTable({
		state: { globalFilter, expanded },
		data: useMemo(() => rows, [rows]),
		columns: useMemo(
			() => createColumns(headers, rows, date),
			[date, headers, rows]
		),
		getCoreRowModel: getCoreRowModel(),
		getFilteredRowModel: getFilteredRowModel(),
		getExpandedRowModel: getExpandedRowModel(),
		getSortedRowModel: getSortedRowModel(),
		onExpandedChange: setExpanded
	});

	const state = {
		empty: <DashboardTableEmpty />,
		error: <DashboardTableError error={error} />,
		data: (
			<TableBody
				table={table}
				layout={layout}
				isFetching={isFetching}
				renderSubrow={renderSubrow}
				context={context}
			/>
		)
	};

	if (layout === 'column') {
		return (
			<div className="w-full">
				<div className="sticky top-0 z-40 bg-bg-body">
					<div className="bg-white h-8.5 flex items-center justify-center">
						<SwitchDatePicker
							label="Date"
							value={fromDate(date, getLocalTimeZone())}
							onChange={(value) =>
								onDateChange?.(value.toDate(getLocalTimeZone()))
							}
						/>
					</div>
					<div className="h-1 bg-bg-body" />
				</div>
				{error ? (
					state['error']
				) : rows.length ? (
					<TwoColumnLayout
						table={table}
						isFetching={isFetching}
						renderSubrow={renderSubrow}
						context={context}
					/>
				) : (
					state['empty']
				)}
			</div>
		);
	}

	return (
		<div className="w-full">
			<div className="sticky top-0 z-40 bg-bg-body">
				<div className="bg-white h-8.5 flex items-center justify-center">
					<SwitchDatePicker
						label="Date"
						value={fromDate(date, getLocalTimeZone())}
						onChange={(value) =>
							onDateChange?.(value.toDate(getLocalTimeZone()))
						}
					/>
				</div>
				<div className="h-1 bg-bg-body" />
			</div>
			{error ? (
				state['error']
			) : rows.length ? (
				<div className={gridContainerStyles()}>
					<TableHeader table={table} />
					<TableBody
						table={table}
						layout="row"
						isFetching={isFetching}
						renderSubrow={renderSubrow}
						context={context}
					/>
				</div>
			) : (
				state['empty']
			)}
		</div>
	);
};

const SortIcon = (props: SVGProps<SVGSVGElement>) => {
	return (
		<svg
			width="6"
			height="8"
			viewBox="0 0 6 8"
			fill="none"
			xmlns="http://www.w3.org/2000/svg"
			{...props}
		>
			<path d="M3 8L5.59808 5H0.401924L3 8Z" fill="#454c58"></path>
		</svg>
	);
};

interface TableHeaderProps {
	table: Table<DashboardData>;
}

const TableHeader = ({ table }: TableHeaderProps) => {
	const sorting = {
		asc: <SortIcon className="ml-1 rotate-180" />,
		desc: <SortIcon className="ml-1" />
	} as const;

	const headerGroups = table.getHeaderGroups();
	const columns = table.getAllColumns();

	const gridTemplateColumns = columns
		.map((col) => {
			const meta = col.columnDef.meta?.style as CSSProperties | undefined;
			if (meta?.width) {
				return `${meta.width}px`;
			}
			return 'minmax(0, 1fr)';
		})
		.join(' ');

	return (
		<div
			className="sticky top-[4.25rem] z-30 bg-white"
			style={{ display: 'grid', gridTemplateColumns }}
			role="row"
			aria-rowindex={1}
		>
			{headerGroups[0]?.headers.map((header) => {
				return (
					<div
						key={header.id}
						className={cn(
							headerCellStyles(),
							header.column.getCanSort() && 'cursor-pointer select-none'
						)}
						onClick={header.column.getToggleSortingHandler()}
						role="columnheader"
						aria-sort={
							header.column.getIsSorted() === 'asc'
								? 'ascending'
								: header.column.getIsSorted() === 'desc'
								? 'descending'
								: 'none'
						}
						aria-colindex={header.index + 1}
					>
						{header.isPlaceholder
							? null
							: flexRender(
									header.column.columnDef.header,
									header.getContext()
							  )}
						{sorting[header.column.getIsSorted() as keyof typeof sorting] ??
							null}
					</div>
				);
			})}
		</div>
	);
};

interface TableLayoutProps {
	table: Table<DashboardData>;
	layout?: DashboardLayoutType;
	isFetching?: boolean;
	renderSubrow: DashboardTableProps['renderSubrow'];
	context: DashboardTableProps['context'];
}

const TableBody = (props: TableLayoutProps) => {
	const { table, isFetching = false, renderSubrow, context } = props;

	const rows = table.getRowModel().rows;
	const columns = table.getAllColumns();

	const gridTemplateColumns = columns
		.map((col) => {
			const meta = col.columnDef.meta?.style as CSSProperties | undefined;
			if (meta?.width) {
				return `${meta.width}px`;
			}
			return 'minmax(0, 1fr)';
		})
		.join(' ');

	return (
		<div
			className={cn(isFetching && 'pointer-events-none opacity-40')}
			style={{ display: 'grid', gridTemplateColumns }}
			role="grid"
		>
			{rows.map((row) => (
				<Fragment key={row.id}>
					<div
						className={bodyRowStyles({
							isExpanded: row.getIsExpanded()
						})}
						role="row"
						aria-rowindex={row.index + 2}
					>
						{row.getVisibleCells().map((cell) => {
							const meta = cell.column.columnDef.meta?.style as CSSProperties | undefined;
							const rowHasError = isRowError(row);
							const isExpanded = row.getIsExpanded();
							const isFirstCell = cell.column.getIsPinned() === 'left' || cell.column.getIndex() === 0;

							return (
								<div
									key={cell.id}
									className={cn(
										rowHasError ? bodyCellErrorStyles() : bodyCellStyles(),
										isExpanded && isFirstCell ? 'rounded-t-md' : 'rounded-md',
										isExpanded && 'border-primary'
									)}
									style={meta}
									role="gridcell"
									aria-colindex={cell.column.getIndex() + 1}
								>
									{flexRender(cell.column.columnDef.cell, cell.getContext())}
								</div>
							);
						})}
					</div>
					{row.getIsExpanded() && (
						<div
							className="col-span-full p-0"
							role="row"
							aria-expanded="true"
						>
							{renderSubrow?.(row, context)}
						</div>
					)}
				</Fragment>
			))}
		</div>
	);
};

interface TwoColumnLayoutProps {
	table: Table<DashboardData>;
	isFetching?: boolean;
	renderSubrow: DashboardTableProps['renderSubrow'];
	context: DashboardTableProps['context'];
}

const TwoColumnLayout = (props: TwoColumnLayoutProps) => {
	const { table, isFetching = false, renderSubrow, context } = props;

	const rows = table.getRowModel().rows;
	const [firstHalf, secondHalf] = splitInHalf(rows);
	const columns = table.getAllColumns();

	const gridTemplateColumns = columns
		.map((col) => {
			const meta = col.columnDef.meta?.style as CSSProperties | undefined;
			if (meta?.width) {
				return `${meta.width}px`;
			}
			return 'minmax(0, 1fr)';
		})
		.join(' ');

	const renderTableRows = (rowsToRender: typeof rows) => (
		<div
			className={cn(isFetching && 'pointer-events-none opacity-40')}
			style={{ display: 'grid', gridTemplateColumns }}
			role="grid"
		>
			{rowsToRender.map((row) => (
				<Fragment key={row.id}>
					<div
						className={bodyRowStyles({
							isExpanded: row.getIsExpanded()
						})}
						role="row"
						aria-rowindex={row.index + 2}
					>
						{row.getVisibleCells().map((cell) => {
							const meta = cell.column.columnDef.meta?.style as CSSProperties | undefined;
							const rowHasError = isRowError(row);
							const isExpanded = row.getIsExpanded();
							const isFirstCell = cell.column.getIsPinned() === 'left' || cell.column.getIndex() === 0;

							return (
								<div
									key={cell.id}
									className={cn(
										rowHasError ? bodyCellErrorStyles() : bodyCellStyles(),
										isExpanded && isFirstCell ? 'rounded-t-md' : 'rounded-md',
										isExpanded && 'border-primary'
									)}
									style={meta}
									role="gridcell"
									aria-colindex={cell.column.getIndex() + 1}
								>
									{flexRender(cell.column.columnDef.cell, cell.getContext())}
								</div>
							);
						})}
					</div>
					{row.getIsExpanded() && (
						<div
							className="col-span-full p-0"
							role="row"
							aria-expanded="true"
						>
							{renderSubrow?.(row, context)}
						</div>
					)}
				</Fragment>
			))}
		</div>
	);

	return (
		<div className="flex gap-1">
			<div className="flex-1">
				<TableHeader table={table} />
				{renderTableRows(firstHalf)}
			</div>
			<div className="flex-1">
				<TableHeader table={table} />
				{renderTableRows(secondHalf)}
			</div>
		</div>
	);
};
