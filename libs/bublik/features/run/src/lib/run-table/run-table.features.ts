/* SPDX-License-Identifier: Apache-2.0 */
/* SPDX-FileCopyrightText: 2024-2026 OKTET LTD */
import {
	columnFilteringFeature,
	columnVisibilityFeature,
	createExpandedRowModel,
	createFilteredRowModel,
	createSortedRowModel,
	globalFilteringFeature,
	rowExpandingFeature,
	rowSortingFeature,
	tableFeatures
} from '@tanstack/react-table';

import { AUTO_SORT_FNS } from '@/shared/utils';

export const runTableFeatures = tableFeatures({
	columnFilteringFeature,
	globalFilteringFeature,
	columnVisibilityFeature,
	rowExpandingFeature,
	rowSortingFeature,
	filteredRowModel: createFilteredRowModel(),
	sortedRowModel: createSortedRowModel(),
	expandedRowModel: createExpandedRowModel(),
	sortFns: AUTO_SORT_FNS
});

export type RunTableFeatures = typeof runTableFeatures;
