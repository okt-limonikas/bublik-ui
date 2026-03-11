/* SPDX-License-Identifier: Apache-2.0 */
/* SPDX-FileCopyrightText: 2021-2023 OKTET Labs Ltd. */
import { createSelector } from '@reduxjs/toolkit';

import { HISTORY_SLICE_NAME } from './history-slice';
import { AppStateWithHistorySlice } from './history-slice.types';
import {
	getComparableHistorySearchForm,
	historySearchStateToForm
} from './history-slice.utils';
import { DEFAULT_GLOBAL_FILTER } from './history-slice';

const selectHistorySliceState = (state: AppStateWithHistorySlice) => {
	return state[HISTORY_SLICE_NAME];
};

export const selectGlobalFilter = createSelector(
	selectHistorySliceState,
	(state) => state.globalFilter
);

export const selectSearchState = createSelector(
	selectHistorySliceState,
	(state) => state.searchForm
);

export const selectAppliedSearchState = createSelector(
	selectHistorySliceState,
	(state) => state.appliedSearchState
);

export const selectIsGlobalSearchFormOpen = createSelector(
	selectHistorySliceState,
	(state) => state.isGlobalSearchFormOpen
);

export const selectLinearGlobalFilter = createSelector(
	selectGlobalFilter,
	(filter) => ({
		tags: filter.tags,
		parameters: filter.parameters,
		verdicts: filter.verdicts,
		resultType: filter.resultType,
		isNotExpected: filter.isNotExpected,
		substringFilter: filter.substringFilter
	})
);

export const selectAggregationGlobalFilter = createSelector(
	selectGlobalFilter,
	(filter) => ({
		verdicts: filter.verdicts,
		parameters: filter.parameters,
		resultType: filter.resultType,
		isNotExpected: filter.isNotExpected,
		substringFilter: filter.substringFilter
	})
);

export const selectHistoryForm = createSelector(
	selectSearchState,
	(searchState) => historySearchStateToForm(searchState)
);

export const selectHasPendingHistorySearchChanges = createSelector(
	selectSearchState,
	selectAppliedSearchState,
	(searchState, appliedSearchState) => {
		if (!appliedSearchState) return true;

		return (
			JSON.stringify(
				getComparableHistorySearchForm(searchState, DEFAULT_GLOBAL_FILTER)
			) !==
			JSON.stringify(
				getComparableHistorySearchForm(appliedSearchState, DEFAULT_GLOBAL_FILTER)
			)
		);
	}
);
