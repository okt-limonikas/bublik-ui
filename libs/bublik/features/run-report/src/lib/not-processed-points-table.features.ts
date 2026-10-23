/* SPDX-License-Identifier: Apache-2.0 */
/* SPDX-FileCopyrightText: 2024-2026 OKTET LTD */
import { columnVisibilityFeature, tableFeatures } from '@tanstack/react-table';

export const notProcessedPointsTableFeatures = tableFeatures({
	columnVisibilityFeature
});

export type NotProcessedPointsTableFeatures =
	typeof notProcessedPointsTableFeatures;
