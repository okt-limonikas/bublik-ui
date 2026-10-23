/* SPDX-License-Identifier: Apache-2.0 */
/* SPDX-FileCopyrightText: 2024-2026 OKTET LTD */
import {
	columnFilteringFeature,
	columnGroupingFeature,
	columnOrderingFeature,
	columnVisibilityFeature,
	createExpandedRowModel,
	createFilteredRowModel,
	createGroupedRowModel,
	createPaginatedRowModel,
	createSortedRowModel,
	rowExpandingFeature,
	rowPaginationFeature,
	rowSortingFeature,
	tableFeatures
} from '@tanstack/react-table';

import { AUTO_SORT_FNS } from '@/shared/utils';

/**
 * One feature set for every table drawn by `ClassificationTable`: the
 * renderer and its helpers take the table, so they must share its type. It
 * is the union of what the tables use; a table switches off the stages it
 * does without through the `manual*` options.
 */
export const classificationTableFeatures = tableFeatures({
	columnFilteringFeature,
	columnGroupingFeature,
	columnOrderingFeature,
	columnVisibilityFeature,
	rowExpandingFeature,
	rowPaginationFeature,
	rowSortingFeature,
	filteredRowModel: createFilteredRowModel(),
	groupedRowModel: createGroupedRowModel(),
	sortedRowModel: createSortedRowModel(),
	expandedRowModel: createExpandedRowModel(),
	paginatedRowModel: createPaginatedRowModel(),
	sortFns: AUTO_SORT_FNS
});

export type ClassificationTableFeatures = typeof classificationTableFeatures;
