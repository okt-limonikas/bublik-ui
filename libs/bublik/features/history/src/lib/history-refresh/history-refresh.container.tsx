/* SPDX-License-Identifier: Apache-2.0 */
/* SPDX-FileCopyrightText: 2021-2023 OKTET Labs Ltd. */
import { useSelector } from 'react-redux';
import { useCallback } from 'react';

import {
	selectHasPendingHistorySearchChanges,
	useHistoryFormSearchState
} from '../slice';
import { useHistoryRefresh } from '../hooks';
import { HistoryRefresh } from './history-refresh.component';

export const HistoryRefreshContainer = () => {
	const { state } = useHistoryFormSearchState();
	const refresh = useHistoryRefresh();
	const hasPendingChanges = useSelector(selectHasPendingHistorySearchChanges);

	const handleRefreshClick = useCallback(
		() => refresh(state),
		[state, refresh]
	);

	return (
		<HistoryRefresh
			hasPendingChanges={hasPendingChanges}
			onRefreshClick={handleRefreshClick}
		/>
	);
};
