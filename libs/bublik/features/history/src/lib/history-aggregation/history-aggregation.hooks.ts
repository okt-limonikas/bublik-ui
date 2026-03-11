/* SPDX-License-Identifier: Apache-2.0 */
/* SPDX-FileCopyrightText: 2021-2023 OKTET Labs Ltd. */
import { useCallback } from 'react';
import { useSelector } from 'react-redux';
import { OnChangeFn } from '@tanstack/react-table';

import { HistoryAggregationGlobalFilter } from './history-aggregation.types';

import { isFunction } from '@/shared/utils';
import {
	selectAggregationGlobalFilter,
	selectSearchState,
	useHistoryActions
} from '../slice';
import { applyGlobalFilterToSearchState } from '../slice/history-slice.utils';

export const useAggregationGlobalFilter = () => {
	const actions = useHistoryActions();
	const globalFilter = useSelector(selectAggregationGlobalFilter);
	const searchState = useSelector(selectSearchState);

	const handleGlobalFilterChange: OnChangeFn<HistoryAggregationGlobalFilter> =
		useCallback(
			(updaterOrValue) => {
				const nextGlobalFilter = isFunction(updaterOrValue)
					? updaterOrValue(globalFilter)
					: updaterOrValue;

				actions.updateSearchForm(
					applyGlobalFilterToSearchState(searchState, {
						...globalFilter,
						...nextGlobalFilter
					})
				);
				actions.updateAggregationGlobalFilter({
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
