/* SPDX-License-Identifier: Apache-2.0 */
/* SPDX-FileCopyrightText: 2021-2023 OKTET Labs Ltd. */
import {
	createSlice,
	EntityId,
	EntityState,
	PayloadAction
} from '@reduxjs/toolkit';

import { bublikAPI } from '@/services/bublik-api';
import { RunsData } from '@/shared/types';

import { runsAdapter } from './runs-slice.selectors';

export const RUNS_PAGE_SLICE = 'runsPage';

export interface AppStateWithRunsSlice {
	[RUNS_PAGE_SLICE]: RunsPageSliceState;
}

export interface RunsPageSliceState {
	globalFilter: string[];
	results: EntityState<RunsData, EntityId>;
	rowSelection: string[];
}

export const initialRunsPageState: RunsPageSliceState = {
	globalFilter: [],
	results: runsAdapter.getInitialState(),
	rowSelection: []
};

export const runsPageSlice = createSlice({
	name: RUNS_PAGE_SLICE,
	initialState: initialRunsPageState,
	reducers: {
		updateGlobalFilter: (state, action: PayloadAction<string[]>) => {
			state.globalFilter = action.payload;
		},
		resetSelection: (state) => {
			state.rowSelection = [];
		},
		addToSelection: (state, action: PayloadAction<string>) => {
			state.rowSelection.push(action.payload);
		},
		removeFromSelection: (state, action: PayloadAction<string>) => {
			state.rowSelection = state.rowSelection.filter(
				(id) => id !== action.payload
			);
		}
	},
	extraReducers: (builder) => {
		builder.addMatcher(
			bublikAPI.endpoints.getRunsTablePage.matchFulfilled,
			(state, action) => {
				runsAdapter.upsertMany(state.results, action.payload.results);
			}
		);
	}
});

export const runsPageReducer = runsPageSlice.reducer;
export const {
	updateGlobalFilter,
	resetSelection,
	removeFromSelection,
	addToSelection
} = runsPageSlice.actions;
