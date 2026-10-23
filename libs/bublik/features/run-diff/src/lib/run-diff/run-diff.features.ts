/* SPDX-License-Identifier: Apache-2.0 */
/* SPDX-FileCopyrightText: 2024-2026 OKTET LTD */
import {
	columnVisibilityFeature,
	createExpandedRowModel,
	rowExpandingFeature,
	tableFeatures
} from '@tanstack/react-table';

export const runDiffTableFeatures = tableFeatures({
	columnVisibilityFeature,
	rowExpandingFeature,
	expandedRowModel: createExpandedRowModel()
});

export type RunDiffTableFeatures = typeof runDiffTableFeatures;
