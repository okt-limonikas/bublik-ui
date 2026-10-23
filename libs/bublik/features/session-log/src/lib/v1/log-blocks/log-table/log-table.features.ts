/* SPDX-License-Identifier: Apache-2.0 */
/* SPDX-FileCopyrightText: 2024-2026 OKTET LTD */
import {
	columnFilteringFeature,
	columnVisibilityFeature,
	createExpandedRowModel,
	createFilteredRowModel,
	globalFilteringFeature,
	rowExpandingFeature,
	rowPaginationFeature,
	tableFeatures
} from '@tanstack/react-table';

export const logTableFeatures = tableFeatures({
	columnFilteringFeature,
	globalFilteringFeature,
	columnVisibilityFeature,
	rowExpandingFeature,
	rowPaginationFeature,
	filteredRowModel: createFilteredRowModel(),
	expandedRowModel: createExpandedRowModel()
});

export type LogTableFeatures = typeof logTableFeatures;
