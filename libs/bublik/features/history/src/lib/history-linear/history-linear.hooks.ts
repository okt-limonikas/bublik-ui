/* SPDX-License-Identifier: Apache-2.0 */
/* SPDX-FileCopyrightText: 2021-2023 OKTET Labs Ltd. */
import { useCallback } from 'react';
import { useSelector } from 'react-redux';
import { OnChangeFn } from '@tanstack/react-table';

import { isFunction } from '@/shared/utils';

import { useTabTitleWithPrefix } from '@/bublik/features/projects';

import { HistoryLinearGlobalFilter } from './history-linear.types';
import {
	selectLinearGlobalFilter,
	selectSearchState,
	useHistoryActions
} from '../slice';
import { applyGlobalFilterToSearchState } from '../slice/history-slice.utils';

export const useHistoryLinearGlobalFilter = () => {
	const actions = useHistoryActions();
	const globalFilter = useSelector(selectLinearGlobalFilter);
	const searchState = useSelector(selectSearchState);

	const handleGlobalFilterChange: OnChangeFn<HistoryLinearGlobalFilter> =
		useCallback(
			(updaterOrValue) => {
				const nextGlobalFilter = isFunction(updaterOrValue)
					? updaterOrValue(globalFilter)
					: updaterOrValue;

				actions.updateSearchForm(
					applyGlobalFilterToSearchState(searchState, nextGlobalFilter)
				);
				actions.updateLinearGlobalFilter({
					tags: nextGlobalFilter.tags,
					verdicts: nextGlobalFilter.verdicts,
					isNotExpected: nextGlobalFilter.isNotExpected,
					resultType: nextGlobalFilter.resultType,
					parameters: nextGlobalFilter.parameters
				});
			},
			[actions, globalFilter, searchState]
		);

	return { globalFilter, handleGlobalFilterChange };
};

export const useHistoryLinearTitle = (config: { testName?: string }) => {
	useTabTitleWithPrefix([config?.testName, 'Linear - History - Bublik']);
};
