/* SPDX-License-Identifier: Apache-2.0 */
/* SPDX-FileCopyrightText: 2021-2023 OKTET Labs Ltd. */
import { useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useDispatch } from 'react-redux';

import { HistorySearchFormState, useHistoryFormSearchState } from '../slice';
import { BUBLIK_TAG, bublikAPI } from '@/services/bublik-api';
import { historySearchStateToQuery } from '../slice/history-slice.utils';
import { PROJECT_KEY } from '@/bublik/features/projects';
export const useHistoryRefresh = () => {
	const { state } = useHistoryFormSearchState();
	const [searchParams, setSearchParams] = useSearchParams();
	const mode = searchParams.get('mode') ?? 'linear';
	const pageSize = searchParams.get('pageSize') ?? 25;
	const dispatch = useDispatch();

	return useCallback(
		(nextState?: HistorySearchFormState) => {
			const newQuery = historySearchStateToQuery(nextState ?? state);

			const params = new URLSearchParams(newQuery);
			for (const [key, value] of searchParams) {
				if (key !== PROJECT_KEY) continue;
				params.append(PROJECT_KEY, value);
			}

			params.set('mode', mode);
			params.set('page', String(1));
			params.set('pageSize', String(pageSize));
			setSearchParams(params, { replace: true });
			dispatch(bublikAPI.util.invalidateTags([BUBLIK_TAG.HistoryData]));
		},
		[dispatch, mode, pageSize, searchParams, setSearchParams, state]
	);
};
