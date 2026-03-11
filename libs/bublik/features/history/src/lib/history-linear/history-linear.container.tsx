/* SPDX-License-Identifier: Apache-2.0 */
/* SPDX-FileCopyrightText: 2021-2023 OKTET Labs Ltd. */
import { useCallback, useEffect } from 'react';
import { useLocation } from 'react-router-dom';

import { useGetHistoryLinearQuery } from '@/services/bublik-api';

import {
	useHistoryLinearGlobalFilter,
	useHistoryLinearTitle
} from './history-linear.hooks';
import { useHistoryActions } from '../slice';
import { useHistoryPagination, useHistoryQuery } from '../hooks';
import {
	HistoryLinearLoading,
	HistoryLinearTable
} from './history-linear.component';
import { HistoryEmpty } from '../history-empty';
import { HistoryError } from '../history-error';
import { queryToHistorySearchState } from '../slice/history-slice.utils';

export const HistoryLinearContainer = () => {
	const actions = useHistoryActions();
	const { globalFilter, handleGlobalFilterChange } =
		useHistoryLinearGlobalFilter();
	const { pagination, handlePaginationChange } = useHistoryPagination();
	const { query } = useHistoryQuery();
	const state = useLocation().state as { fromRun?: boolean };

	const { data, isLoading, isFetching, error } = useGetHistoryLinearQuery(
		query,
		{ skip: state?.fromRun || !query.testName }
	);

	useEffect(() => {
		if (state?.fromRun || !query.testName || isFetching || error || !data) {
			actions.resetAppliedSearchState();
			return;
		}

		actions.setAppliedSearchState(queryToHistorySearchState(query));
	}, [actions, data, error, isFetching, query, state?.fromRun]);

	useHistoryLinearTitle({ testName: query.testName });

	const handleOpenFormClick = useCallback(
		() => actions.toggleIsGlobalSearchOpen(true),
		[actions]
	);

	if (!query.testName) {
		return (
			<HistoryEmpty type="no-test-name" onOpenFormClick={handleOpenFormClick} />
		);
	}

	if (isLoading) return <HistoryLinearLoading />;

	if (error) {
		return <HistoryError error={error} onButtonClick={handleOpenFormClick} />;
	}

	if (data && !data.results.length && isFetching) {
		return <HistoryLinearLoading />;
	}

	if (!data || !data?.results?.length) {
		return (
			<HistoryEmpty type="no-results" onOpenFormClick={handleOpenFormClick} />
		);
	}

	return (
		<div className={isFetching ? 'pointer-events-none opacity-40' : ''}>
			<HistoryLinearTable
				data={data.results}
				pageCount={data.pagination.count}
				pagination={pagination}
				onPaginationChange={handlePaginationChange}
				globalFilter={globalFilter}
				onGlobalFilterChange={handleGlobalFilterChange}
			/>
		</div>
	);
};
