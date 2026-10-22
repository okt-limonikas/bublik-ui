/* SPDX-License-Identifier: Apache-2.0 */
/* SPDX-FileCopyrightText: 2021-2023 OKTET Labs Ltd. */
import { ColumnDef, Row } from '@tanstack/react-table';

import {
	DashboardAPIResponse,
	DashboardCellArray,
	DashboardCellData,
	DashboardData,
	RUN_STATUS
} from '@/shared/types';

import { getColorFromContext } from '../utils';

export const isRowError = (row: Row<DashboardData>) => {
	return row.original.context.conclusion === RUN_STATUS.Error;
};

export const getColumnWidth = (
	rows: DashboardData[],
	accessor: string,
	headerText: string
) => {
	const MAX_WIDTH = 400;
	const MAGIC_SPACING = 14;

	const maxLengthInColumn = getMaxLengthInColumn(rows, accessor);
	const maxLength = Math.max(maxLengthInColumn, headerText.length);

	return Math.min(MAX_WIDTH, maxLength * MAGIC_SPACING + 128);
};

/**
 * Grid tracks for the data columns, keyed by column key.
 *
 * The table is a single grid, so the browser measures the content itself.
 * Long text columns share the leftover width as `fr` tracks and truncate.
 * Every other column is `fit-content(share)`: as wide as its widest value on
 * a wide row, and on a narrow row no wider than its proportional share of
 * the width left after the icon tracks, so the long columns keep theirs.
 * The shares use the same weights the old flex layout grew by. Text cells
 * may truncate below that share (see `shrinks`); numeric badges keep their
 * content width, so a number never truncates.
 */
export const getColumnTracks = (
	rows: DashboardData[],
	headers: DashboardAPIResponse['header'],
	/** Width of the fixed icon tracks (status, expand). */
	reservedPx: number
) => {
	const GROW_MIN_LENGTH = 12;

	const columns = headers.map(({ key, name }) => {
		const isNumeric = isNumericColumn(rows, key);

		return {
			key,
			isNumeric,
			weight: getColumnWidth(rows, key, name),
			grows: !isNumeric && getMaxLengthInColumn(rows, key) >= GROW_MIN_LENGTH
		};
	});

	// Nothing long enough to fill the row: let every text column grow instead.
	if (!columns.some((c) => c.grows)) {
		columns.forEach((c) => {
			c.grows = !c.isNumeric;
		});
	}

	const total = columns.reduce((sum, c) => sum + c.weight, 0);

	return new Map(
		columns.map(({ key, weight, grows, isNumeric }) => {
			const share = (weight / total).toFixed(4);
			const track = grows
				? `minmax(0, ${weight}fr)`
				: `fit-content(calc((100% - ${reservedPx}px) * ${share}))`;

			return [key, { track, shrinks: grows || !isNumeric }];
		})
	);
};

export const getMaxLengthInColumn = (
	rows: DashboardData[],
	accessor: string
) => {
	return rows.reduce((acc, curr) => {
		const data = curr.row_cells[accessor];

		if (Array.isArray(data)) {
			return Math.max(acc, getCellStrFromArray(data).length);
		}

		const length = data?.value?.toString()?.length ?? 0;

		return Math.max(acc, length);
	}, 0);
};

const NUMERIC_VALUE = /^-?\d+([.,]\d+)?%?$/;

/**
 * A column whose every present value is a number (optionally with a `%`
 * suffix) is right-aligned so the digits line up.
 */
export const isNumericColumn = (rows: DashboardData[], accessor: string) => {
	let seen = false;

	for (const row of rows) {
		const cell = row.row_cells[accessor];

		if (Array.isArray(cell)) return false;

		const value = cell?.value;

		if (value === undefined || value === null || value === '') continue;

		if (!NUMERIC_VALUE.test(String(value).trim())) return false;

		seen = true;
	}

	return seen;
};

/** Link cells render as padded badges; the column's header follows them. */
export const columnHasBadges = (rows: DashboardData[], accessor: string) => {
	return rows.some((row) => {
		const cell = row.row_cells[accessor];

		return !Array.isArray(cell) && Boolean(cell?.payload);
	});
};

export const getGridTemplateColumns = (columns: ColumnDef<DashboardData>[]) => {
	return columns
		.map((column) => column.meta?.width ?? 'minmax(0, 1fr)')
		.join(' ');
};

export const getCellStrFromArray = (arr: DashboardCellArray[]) => {
	return arr
		.map((data) => data.value)
		.filter((str) => str)
		.join(', ');
};

/**
 * Badge colour per column, keyed by column key.
 *
 * Columns are coloured in header order, counting only those that carry a
 * badge in at least one row, so two tables of the same day (or two days
 * with the same columns) agree. Picking a single row for this went wrong
 * when a column, like Test Suite, has a badge only in some rows: the other
 * columns' indices shifted by one depending on the row. A column whose
 * cells carry a context takes the context colour instead.
 */
export const createColorMap = (
	rows: DashboardAPIResponse['rows'],
	headers: DashboardAPIResponse['header']
) => {
	const colorMap = new Map<string, string>();

	const getColorByKey = (key: string) => colorMap.get(key);

	let badgeIndex = 0;

	headers.forEach(({ key }) => {
		const badges = rows
			.map((row) => row.row_cells[key])
			.filter(
				(cell): cell is DashboardCellData =>
					!!cell && !Array.isArray(cell) && !!cell.payload
			);

		if (!badges.length) return;

		const context = badges.find((cell) => cell.context)?.context;

		colorMap.set(
			key,
			context ? getColorFromContext(context) : `bg-badge-${badgeIndex}`
		);

		badgeIndex += 1;
	});

	return { getColorByKey };
};
