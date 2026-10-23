/* SPDX-License-Identifier: Apache-2.0 */
/* SPDX-FileCopyrightText: 2024-2026 OKTET LTD */
import { columnVisibilityFeature, tableFeatures } from '@tanstack/react-table';

export const importLogTableFeatures = tableFeatures({
	columnVisibilityFeature
});

export type ImportLogTableFeatures = typeof importLogTableFeatures;
