/* SPDX-License-Identifier: Apache-2.0 */
/* SPDX-FileCopyrightText: 2024-2026 OKTET LTD */
import {
	columnFilteringFeature,
	columnVisibilityFeature,
	createFilteredRowModel,
	createSortedRowModel,
	globalFilteringFeature,
	rowExpandingFeature,
	rowSortingFeature,
	tableFeatures
} from '@tanstack/react-table';

import { AUTO_SORT_FNS } from '@/shared/utils';

/** Shared by the grid and the legacy dashboard tables. */
export const dashboardTableFeatures = tableFeatures({
	columnFilteringFeature,
	globalFilteringFeature,
	columnVisibilityFeature,
	rowExpandingFeature,
	rowSortingFeature,
	filteredRowModel: createFilteredRowModel(),
	sortedRowModel: createSortedRowModel(),
	sortFns: AUTO_SORT_FNS
});

export type DashboardTableFeatures = typeof dashboardTableFeatures;
