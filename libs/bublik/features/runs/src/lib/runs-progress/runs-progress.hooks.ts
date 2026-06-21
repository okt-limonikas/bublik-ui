/* SPDX-License-Identifier: Apache-2.0 */
/* SPDX-FileCopyrightText: 2024-2026 OKTET LTD */
import { useMemo } from 'react';

import { RunsAPIQuery, RunsData } from '@/shared/types';
import { useGetRunsTablePageQuery } from '@/services/bublik-api';

import { useRunsQuery } from '../hooks';

// When no date boundary is set, "show all" could mean every run on the instance,
// and each run additionally triggers its own /runs/{id}/stats request. Cap the
// unbounded case to the newest N runs so the page stays responsive; a date range
// or duration lifts the cap (the window is then bounded by the dates).
const SAFETY_CAP = 200;

type RunsProgressRunsResult = {
	runs: RunsData[];
	total: number;
	cap: number;
	isCapped: boolean;
	isLoading: boolean;
	isFetching: boolean;
	error: unknown;
};

/**
 * Fetches the runs for the progress matrix driven by the selected dates/duration
 * instead of the runs-table pagination. A cheap probe reads the total `count`
 * matching the current filters, then the full set is fetched in one page. With no
 * date boundary the window is capped to {@link SAFETY_CAP} newest runs.
 */
function useRunsProgressRuns(): RunsProgressRunsResult {
	const { query } = useRunsQuery();
	const hasDateBoundary = Boolean(query.startDate) || Boolean(query.finishDate);

	// Filters only — page/pageSize are owned by this hook, not the table pagination.
	const baseQuery = useMemo<RunsAPIQuery>(
		() => ({
			startDate: query.startDate,
			finishDate: query.finishDate,
			runData: query.runData,
			tagExpr: query.tagExpr,
			projects: query.projects
		}),
		[query.startDate, query.finishDate, query.runData, query.tagExpr, query.projects]
	);

	// Probe: smallest possible page just to read pagination.count for the filters.
	const probeQuery = useGetRunsTablePageQuery(
		{ ...baseQuery, page: '1', pageSize: '1' },
		{ refetchOnFocus: true, refetchOnMountOrArgChange: true }
	);

	const total = probeQuery.data?.pagination.count ?? 0;
	const isCapped = !hasDateBoundary && total > SAFETY_CAP;
	const effectiveSize = hasDateBoundary ? total : Math.min(total, SAFETY_CAP);

	// Full fetch: one page sized to the window. Backend default order is newest-first,
	// so capping page 1 keeps the newest runs. Skipped until the count is known.
	const fullQuery = useGetRunsTablePageQuery(
		{ ...baseQuery, page: '1', pageSize: effectiveSize.toString() },
		{ skip: effectiveSize === 0, refetchOnFocus: true, refetchOnMountOrArgChange: true }
	);

	const runs = fullQuery.data?.results ?? [];
	// Once the probe resolves with 0 runs the full query is skipped, so loading must
	// not hang on the skipped query — fall back to the probe's state in that case.
	const isLoading =
		probeQuery.isLoading || (effectiveSize > 0 && fullQuery.isLoading);
	const isFetching = probeQuery.isFetching || fullQuery.isFetching;

	return {
		runs,
		total,
		cap: SAFETY_CAP,
		isCapped,
		isLoading,
		isFetching,
		error: probeQuery.error || fullQuery.error
	};
}

export { useRunsProgressRuns };
