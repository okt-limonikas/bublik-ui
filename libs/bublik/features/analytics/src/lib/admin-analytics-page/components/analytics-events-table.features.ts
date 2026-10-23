/* SPDX-License-Identifier: Apache-2.0 */
/* SPDX-FileCopyrightText: 2024-2026 OKTET LTD */
import {
	columnVisibilityFeature,
	createExpandedRowModel,
	rowExpandingFeature,
	tableFeatures
} from '@tanstack/react-table';

export const analyticsEventsTableFeatures = tableFeatures({
	columnVisibilityFeature,
	rowExpandingFeature,
	expandedRowModel: createExpandedRowModel()
});

export type AnalyticsEventsTableFeatures = typeof analyticsEventsTableFeatures;
