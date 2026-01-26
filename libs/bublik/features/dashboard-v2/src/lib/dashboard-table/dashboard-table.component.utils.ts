/* SPDX-License-Identifier: Apache-2.0 */
/* SPDX-FileCopyrightText: 2021-2023 OKTET Labs Ltd. */
import { Row } from '@tanstack/react-table';

import {
	DashboardAPIResponse,
	DashboardData,
	RUN_STATUS
} from '@/shared/types';

import { getColorFromContext } from '../utils';

export const isRowError = (row: Row<DashboardData>) => {
	return row.original.context.conclusion === RUN_STATUS.Error;
};

export const columnHasLinks = (
	rows: DashboardData[],
	key: string
): boolean => {
	return rows.some((row) => {
		const cell = row.row_cells[key];
		return !Array.isArray(cell) && cell?.payload;
	});
};

export const createColorMap = (
	rows: DashboardAPIResponse['rows'] | DashboardData
) => {
	const colorMap = new Map<string, string>();
	const maybeRandomRow = Array.isArray(rows)
		? rows[Math.floor(Math.random() * rows.length)]?.row_cells
		: rows.row_cells;

	const getColorByKey = (key: string) => colorMap.get(key);

	const api = { getColorByKey };

	if (!maybeRandomRow) return api;

	Object.entries(maybeRandomRow)
		.filter(([, cell]) => !Array.isArray(cell) && cell.payload)
		.forEach(([key, cell], idx) => {
			if (Array.isArray(cell)) return;

			if (cell.context) {
				return colorMap.set(key, getColorFromContext(cell.context));
			}

			colorMap.set(key, `bg-badge-${idx}`);
		});

	return api;
};
