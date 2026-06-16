/* SPDX-License-Identifier: Apache-2.0 */
/* SPDX-FileCopyrightText: 2024-2026 OKTET LTD */
import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';

import {
	useGetRunsStatsByRunIdsQuery,
	useGetRunsTablePageQuery
} from '@/services/bublik-api';

import { useRunsQuery } from '../hooks';
import {
	RunsProgress,
	RunsProgressEmpty,
	RunsProgressError,
	RunsProgressLoading
} from './runs-progress.component';
import {
	buildFilterSummary,
	buildRunsProgressRows,
	sortRunsNewestFirst
} from './runs-progress.utils';
import type { RunsProgressRun } from './runs-progress.types';

function RunsProgressContainer() {
	const [searchParams] = useSearchParams();
	const { query } = useRunsQuery();
	const runsQuery = useGetRunsTablePageQuery(query, {
		refetchOnFocus: true,
		refetchOnMountOrArgChange: true
	});

	const sortedRuns = useMemo(
		() => sortRunsNewestFirst(runsQuery.data?.results ?? []),
		[runsQuery.data?.results]
	);
	const statsParams = useMemo(
		() => sortedRuns.map((run) => ({ runId: run.id })),
		[sortedRuns]
	);
	const statsQuery = useGetRunsStatsByRunIdsQuery(statsParams, {
		skip: statsParams.length === 0
	});

	const progressRuns = useMemo(() => {
		const statsByRunId = new Map(
			(statsQuery.data?.runs ?? []).map((run) => [run.runId, run.results[0]])
		);

		return sortedRuns
			.map((run) => {
				const root = statsByRunId.get(run.id);

				return root ? { run, root } : null;
			})
			.filter((run): run is RunsProgressRun => run !== null);
	}, [sortedRuns, statsQuery.data?.runs]);

	const rows = useMemo(
		() => buildRunsProgressRows(progressRuns),
		[progressRuns]
	);
	const filters = useMemo(
		() => buildFilterSummary(searchParams),
		[searchParams]
	);

	if (runsQuery.error || statsQuery.error) {
		return <RunsProgressError error={runsQuery.error || statsQuery.error} />;
	}

	if (runsQuery.isLoading || statsQuery.isLoading) return <RunsProgressLoading />;

	if (!progressRuns.length || !rows.length) return <RunsProgressEmpty />;

	return (
		<RunsProgress
			runs={progressRuns}
			rows={rows}
			filters={filters}
			isFetching={runsQuery.isFetching || statsQuery.isFetching}
		/>
	);
}

export { RunsProgressContainer };
