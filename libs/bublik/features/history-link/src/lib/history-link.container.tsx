/* SPDX-License-Identifier: Apache-2.0 */
/* SPDX-FileCopyrightText: 2021-2023 OKTET Labs Ltd. */
import { useMemo } from 'react';
import { skipToken } from '@reduxjs/toolkit/query';

import { HistoryMode, RunDataResults } from '@/shared/types';
import { getHistorySearch } from '@/shared/utils';
import {
	useGetResultInfoQuery,
	useGetRunDetailsQuery
} from '@/services/bublik-api';
import { useUserPreferences } from '@/bublik/features/user-preferences';

import { HistoryLinkComponent } from './history-link.component';

type HistoryLinkContainerPropsCommon = {
	runId: number;
	userPreferredHistoryMode?: HistoryMode;
};

export type HistoryLinkContainerProps =
	| (HistoryLinkContainerPropsCommon & {
			result: RunDataResults;
			resultId?: never;
	  })
	| (HistoryLinkContainerPropsCommon & { resultId: number; result?: never });

function HistoryLinkContainer(props: HistoryLinkContainerProps) {
	const { runId, userPreferredHistoryMode } = props;
	const { userPreferences } = useUserPreferences();

	const resultId = 'resultId' in props ? props.resultId : undefined;
	const result = 'result' in props ? props.result : undefined;

	const { data, isFetching, isError } = useGetResultInfoQuery(
		resultId ?? skipToken
	);
	const { data: runDetails } = useGetRunDetailsQuery(runId);

	const historyMode =
		userPreferredHistoryMode ?? userPreferences.history.defaultMode;

	const resultData = result ?? data;

	const search = useMemo(() => {
		if (!resultData || !runDetails) return null;

		return getHistorySearch(runDetails, resultData, historyMode);
	}, [resultData, runDetails, historyMode]);

	const disabled = Boolean(!resultData || isError);

	return (
		<HistoryLinkComponent
			search={search}
			isLoading={isFetching}
			isError={isError}
			disabled={disabled}
		/>
	);
}

export { HistoryLinkContainer };
