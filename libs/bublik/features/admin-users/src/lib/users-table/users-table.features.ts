/* SPDX-License-Identifier: Apache-2.0 */
/* SPDX-FileCopyrightText: 2024-2026 OKTET LTD */
import {
	columnVisibilityFeature,
	createPaginatedRowModel,
	createSortedRowModel,
	rowPaginationFeature,
	rowSortingFeature,
	tableFeatures
} from '@tanstack/react-table';

import { AUTO_SORT_FNS } from '@/shared/utils';

export const usersTableFeatures = tableFeatures({
	columnVisibilityFeature,
	rowSortingFeature,
	rowPaginationFeature,
	sortedRowModel: createSortedRowModel(),
	paginatedRowModel: createPaginatedRowModel(),
	sortFns: AUTO_SORT_FNS
});

export type UsersTableFeatures = typeof usersTableFeatures;
