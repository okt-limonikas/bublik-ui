/* SPDX-License-Identifier: Apache-2.0 */
/* SPDX-FileCopyrightText: 2024-2026 OKTET LTD */
import {
	columnFilteringFeature,
	columnVisibilityFeature,
	createSortedRowModel,
	globalFilteringFeature,
	rowPaginationFeature,
	rowSelectionFeature,
	rowSortingFeature,
	tableFeatures
} from '@tanstack/react-table';

import { AUTO_SORT_FNS } from '@/shared/utils';

export const runsTableFeatures = tableFeatures({
	columnFilteringFeature,
	globalFilteringFeature,
	columnVisibilityFeature,
	rowPaginationFeature,
	rowSelectionFeature,
	rowSortingFeature,
	sortedRowModel: createSortedRowModel(),
	sortFns: AUTO_SORT_FNS
});

export type RunsTableFeatures = typeof runsTableFeatures;
