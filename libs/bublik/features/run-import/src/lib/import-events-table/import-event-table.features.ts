/* SPDX-License-Identifier: Apache-2.0 */
/* SPDX-FileCopyrightText: 2024-2026 OKTET LTD */
import {
	columnVisibilityFeature,
	rowExpandingFeature,
	rowPaginationFeature,
	tableFeatures
} from '@tanstack/react-table';

export const importEventTableFeatures = tableFeatures({
	columnVisibilityFeature,
	rowExpandingFeature,
	rowPaginationFeature
});

export type ImportEventTableFeatures = typeof importEventTableFeatures;
