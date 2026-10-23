/* SPDX-License-Identifier: Apache-2.0 */
/* SPDX-FileCopyrightText: 2021-2023 OKTET Labs Ltd. */
import { PropsWithChildren, useState } from 'react';
import {
	JsonParam,
	useQueryParam,
	useQueryParams,
	withDefault
} from 'use-query-params';
import {
	ExpandedState,
	OnChangeFn,
	PaginationState
} from '@tanstack/react-table';

import { analyticsEventNames, trackEvent } from '@/bublik/features/analytics';
import { ImportTaskFilters } from '@/shared/types';
import { useGetImportEventLogQuery } from '@/services/bublik-api';
import { AutoReloadControl } from '@/shared/tailwind-ui';

import {
	ImportEventTable,
	ImportEventTableEmpty,
	ImportEventTableError,
	ImportEventTableLoading
} from './import-event-table.component';
import { ImportRunFilterForm } from '../import-run-filter-form';

const DEFAULT_FILTERS: ImportTaskFilters = {
	job: undefined,
	run: undefined,
	url: undefined,
	celery_task: undefined,
	status: undefined
};

const DEFAULT_PAGINATION: PaginationState = {
	pageIndex: 0,
	pageSize: 25
};

const FilterParams = withDefault(JsonParam, DEFAULT_FILTERS);

const PaginationParam = withDefault(JsonParam, DEFAULT_PAGINATION);

const IMPORT_EVENTS_POLLING_INTERVAL_MS = 5000;

function useImportLogExpanded() {
	const [expanded, setExpanded] = useQueryParam<ExpandedState>(
		'expanded',
		JsonParam
	);

	return { expanded, setExpanded };
}

const useImportEventQueryParams = () => {
	const [{ filters, pagination }, setParams] = useQueryParams({
		filters: FilterParams,
		pagination: PaginationParam
	});

	const resetPagination = (value: PaginationState): PaginationState => ({
		...value,
		pageIndex: 0
	});

	const setPagination: OnChangeFn<PaginationState> = (updater) => {
		setParams((latestValues) => {
			const latestPagination = latestValues.pagination ?? DEFAULT_PAGINATION;
			const nextPagination =
				typeof updater === 'function' ? updater(latestPagination) : updater;

			return { pagination: nextPagination };
		}, 'replaceIn');
	};

	const handleFilterChange = (values: ImportTaskFilters) => {
		trackEvent(analyticsEventNames.importEventsFilterApply, {
			hasUrl: Boolean(values.url),
			hasCeleryTask: Boolean(values.celery_task),
			hasJob: Boolean(values.job),
			hasRun: Boolean(values.run),
			hasStatus: Boolean(values.status)
		});

		setParams((latestValues) => {
			const latestPagination = latestValues.pagination ?? DEFAULT_PAGINATION;

			return {
				filters: values,
				pagination: resetPagination(latestPagination)
			};
		}, 'replaceIn');
	};

	const handleResetClick = () => {
		trackEvent(analyticsEventNames.importEventsFilterReset, {
			source: 'import_page'
		});

		setParams((latestValues) => {
			const latestPagination = latestValues.pagination ?? DEFAULT_PAGINATION;

			return {
				filters: DEFAULT_FILTERS,
				pagination: resetPagination(latestPagination)
			};
		}, 'replaceIn');
	};

	return {
		query: filters,
		setQuery: handleFilterChange,
		onResetClick: handleResetClick,
		pagination,
		setPagination
	};
};

export const ImportEventsTableContainer = (props: PropsWithChildren) => {
	const { query, setQuery, onResetClick, pagination, setPagination } =
		useImportEventQueryParams();
	const { expanded, setExpanded } = useImportLogExpanded();
	const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(true);
	const isAutoRefreshAvailable = pagination.pageIndex === 0;
	const isPollingEnabled = isAutoRefreshAvailable && autoRefreshEnabled;
	const { data, isLoading, isFetching, error, fulfilledTimeStamp, refetch } =
		useGetImportEventLogQuery(
			{
				...query,
				page: pagination.pageIndex + 1,
				page_size: pagination.pageSize
			},
			{
				pollingInterval: isPollingEnabled
					? IMPORT_EVENTS_POLLING_INTERVAL_MS
					: 0,
				refetchOnFocus: isPollingEnabled,
				refetchOnMountOrArgChange: true
			}
		);
	return (
		<>
			<div className="px-6 py-4 bg-bg-primary rounded-t-xl">
				<div className="flex flex-wrap items-center justify-between gap-4">
					<ImportRunFilterForm
						key={JSON.stringify(query)}
						onFiltersChange={setQuery}
						defaultValues={query}
						onResetClick={onResetClick}
					/>
					<div className="flex flex-wrap items-center justify-end gap-3">
						<AutoReloadControl
							checked={autoRefreshEnabled}
							onCheckedChange={setAutoRefreshEnabled}
							onRefreshClick={refetch}
							intervalMs={IMPORT_EVENTS_POLLING_INTERVAL_MS}
							isFetching={isFetching}
							updatedAt={fulfilledTimeStamp}
							switchLabel="Auto reload"
							refreshLabel="Refresh event log"
							unavailableReason={
								isAutoRefreshAvailable ? undefined : 'Only on the first page'
							}
						/>
						{props.children}
					</div>
				</div>
			</div>
			<div className="relative flex min-h-0 flex-grow flex-col overflow-hidden rounded-b-xl bg-bg-body">
				{isLoading ? (
					<ImportEventTableLoading />
				) : error ? (
					<ImportEventTableError error={error} />
				) : data && data.results.length ? (
					<ImportEventTable
						data={data.results}
						pagination={pagination}
						setPagination={setPagination}
						expanded={expanded}
						setExpanded={setExpanded}
						rowCount={data.pagination.count}
					/>
				) : (
					<ImportEventTableEmpty />
				)}
			</div>
		</>
	);
};
