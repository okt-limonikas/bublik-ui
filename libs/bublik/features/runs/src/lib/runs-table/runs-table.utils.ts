/* SPDX-License-Identifier: Apache-2.0 */
/* SPDX-FileCopyrightText: 2021-2023 OKTET Labs Ltd. */
import { FilterFnOption } from '@tanstack/react-table';

import { RunsData } from '@/shared/types';

import { RunsTableFeatures } from './runs-table.features';

export const globalFilterFn: FilterFnOption<RunsTableFeatures, RunsData> = (
	row,
	columnId,
	filterValue
) => {
	const globalFilter: string[] = filterValue;

	if (!filterValue.length) return true;

	const allTags = [
		...row.original.relevant_tags,
		...row.original.important_tags,
		...row.original.metadata
	];

	return globalFilter.every((filteredTag) => allTags.includes(filteredTag));
};
