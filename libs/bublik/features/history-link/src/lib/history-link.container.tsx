/* SPDX-License-Identifier: Apache-2.0 */
/* SPDX-FileCopyrightText: 2021-2023 OKTET Labs Ltd. */
import { useMemo } from 'react';

import {
	HistoryMode,
	RunDataResults,
	HistoryDefaultResultAPIResponse
} from '@/shared/types';
import { getHistorySearch } from '@/shared/utils';
import {
	bublikAPI,
	useGetHistoryLinkDefaultsQuery,
	useGetRunDetailsQuery
} from '@/services/bublik-api';
import { useUserPreferences } from '@/bublik/features/user-preferences';

import { HistoryLinkComponent } from './history-link.component';

export interface HistoryLinkContainerProps {
	runId: string;
	resultId: string;
	focusId?: string | number | null;
	userPreferredHistoryMode?: HistoryMode;
}

/**
 * Transforms HistoryDefaultResultAPIResponse to RunDataResults format
 * for compatibility with getHistorySearch utility
 */
function transformToRunDataResults(
	apiResponse: HistoryDefaultResultAPIResponse,
	runId: string
): RunDataResults {
	const { result } = apiResponse;
	return {
		name: result.name,
		result_id: result.obtained_result.result_id,
		iteration_id: result.iteration_id,
		run_id: runId,
		has_measurements: result.has_measurements,
		has_error: result.has_error,
		expected_results: result.expected_result
			? [
					{
						...result.expected_result,
						keys: []
					}
			  ]
			: [],
		obtained_result: result.obtained_result,
		comments: result.comments,
		parameters: result.parameters,
		start: result.start,
		finish: '' // Will be populated from runDetails
	};
}

export const HistoryLinkContainer = (props: HistoryLinkContainerProps) => {
	const { runId, resultId, focusId, userPreferredHistoryMode } = props;
	const { userPreferences } = useUserPreferences();

	// Tree checking: only if focusId is provided (for log view)
	const { node } = bublikAPI.endpoints.getTreeByRunId.useQueryState(runId, {
		selectFromResult: (state) => ({
			node:
				!state.data || !focusId ? undefined : state.data.tree[String(focusId)]
		})
	});

	const isTest = focusId ? node?.entity === 'test' : true;
	const nodeId = node?.id;

	// Fetch history data (respecting tree check)
	const { data, isFetching, isError } = useGetHistoryLinkDefaultsQuery(
		focusId && nodeId && isTest
			? parseInt(String(nodeId))
			: parseInt(String(resultId))
	);
	const { data: runDetails } = useGetRunDetailsQuery(runId);

	// Use provided mode or fall back to user preference
	const historyMode =
		userPreferredHistoryMode ?? userPreferences.history.defaultMode;

	// Compute all 9 search options using getHistorySearch
	const search = useMemo(() => {
		if (!data || !runDetails) return null;

		const transformedResult = transformToRunDataResults(data, runId);
		return getHistorySearch(runDetails, transformedResult, historyMode);
	}, [data, runDetails, runId, historyMode]);

	// Disabled state: no data, error, or tree node is not a test
	const disabled = Boolean(!data || isError || (focusId && !isTest));

	return (
		<HistoryLinkComponent
			search={search}
			isLoading={isFetching}
			isError={isError}
			disabled={disabled}
		/>
	);
};
