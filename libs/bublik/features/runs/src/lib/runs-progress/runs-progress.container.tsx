/* SPDX-License-Identifier: Apache-2.0 */
/* SPDX-FileCopyrightText: 2024-2026 OKTET LTD */
import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import { useGetRunsStatsByRunIdsQuery } from '@/services/bublik-api';

import {
	RunsProgress,
	RunsProgressEmpty,
	RunsProgressError,
	RunsProgressLoading
} from './runs-progress.component';
import { useRunsProgressRuns } from './runs-progress.hooks';
import {
	buildFilterSummary,
	buildRunsProgressRows,
	getMetadataKeys,
	groupRuns,
	sortRunsNewestFirst
} from './runs-progress.utils';
import type { RunsProgressRun } from './runs-progress.types';

function RunsProgressContainer() {
	const [searchParams] = useSearchParams();
	const [groupKey, setGroupKey] = useState<string | null>(null);
	const runsQuery = useRunsProgressRuns();

	const sortedRuns = useMemo(
		() => sortRunsNewestFirst(runsQuery.runs),
		[runsQuery.runs]
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

	const availableGroupKeys = useMemo(
		() => getMetadataKeys(sortedRuns),
		[sortedRuns]
	);
	const { orderedRuns, groups } = useMemo(
		() => groupRuns(progressRuns, groupKey),
		[progressRuns, groupKey]
	);
	const rows = useMemo(
		() => buildRunsProgressRows(orderedRuns),
		[orderedRuns]
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
			runs={orderedRuns}
			rows={rows}
			groups={groups}
			groupKey={groupKey}
			availableGroupKeys={availableGroupKeys}
			onGroupKeyChange={setGroupKey}
			filters={filters}
			isFetching={runsQuery.isFetching || statsQuery.isFetching}
			isCapped={runsQuery.isCapped}
			total={runsQuery.total}
			cap={runsQuery.cap}
		/>
	);
}

export { RunsProgressContainer };
