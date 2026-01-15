/* SPDX-License-Identifier: Apache-2.0 */
/* SPDX-FileCopyrightText: 2021-2023 OKTET Labs Ltd. */
import { addDays } from 'date-fns';

import { DASHBOARD_MODE } from '@/shared/types';
import { useGetDashboardByDateQuery } from '@/services/bublik-api';
import { useProjectSearch } from '@/bublik/features/projects';
import { cn } from '@/shared/tailwind-ui';

import {
	DASHBOARD_TABLE_ID,
	useDashboardDate,
	useDashboardMode
} from '../hooks';
import {
	DashboardTableContainer,
	DashboardTableLoading
} from '../dashboard-table';

const LayoutHandlerLoading = () => {
	return (
		<div className="flex gap-1">
			<DashboardTableLoading rowNumber={25} />
			<DashboardTableLoading rowNumber={25} />
		</div>
	);
};

export const LayoutHandlerContainer = () => {
	const modeSettings = useDashboardMode();
	const dateSearch = useDashboardDate(DASHBOARD_TABLE_ID.Main);
	const secondaryDateSearch = useDashboardDate(DASHBOARD_TABLE_ID.Secondary);
	const { projectIds } = useProjectSearch();
	const todayQuery = useGetDashboardByDateQuery({ projects: projectIds });

	if (todayQuery.isLoading || modeSettings.isModeLoading) {
		return <LayoutHandlerLoading />;
	}

	if (modeSettings.mode === DASHBOARD_MODE.Columns) {
		const initialMainDate = todayQuery.data?.date
			? new Date(todayQuery.data?.date)
			: new Date();
		const initialSecondaryDate = addDays(
			todayQuery.data?.date ? new Date(todayQuery.data.date) : new Date(),
			-1
		);

		// Determine effective dates (URL param takes priority over initial)
		const effectiveMainDate = dateSearch.date || initialMainDate;
		const effectiveSecondaryDate =
			secondaryDateSearch.date || initialSecondaryDate;

		// Check if dates need to be swapped to maintain chronological order (older on left)
		const shouldSwap =
			effectiveSecondaryDate &&
			effectiveMainDate &&
			effectiveSecondaryDate.getTime() > effectiveMainDate.getTime();

		// Determine which table goes on which side based on date comparison
		const leftTable = shouldSwap
			? { id: DASHBOARD_TABLE_ID.Main, initialDate: initialMainDate }
			: { id: DASHBOARD_TABLE_ID.Secondary, initialDate: initialSecondaryDate };
		const rightTable = shouldSwap
			? { id: DASHBOARD_TABLE_ID.Secondary, initialDate: initialSecondaryDate }
			: { id: DASHBOARD_TABLE_ID.Main, initialDate: initialMainDate };

		return (
			<div className="flex flex-grow gap-1 overflow-hidden h-full">
				<div
					className={cn('overflow-auto w-full relative styled-scrollbar pr-1')}
				>
					<DashboardTableContainer
						id={leftTable.id}
						mode={modeSettings.mode}
						initialDate={leftTable.initialDate}
					/>
				</div>
				<div
					className={cn('overflow-auto w-full relative styled-scrollbar pr-1')}
				>
					<DashboardTableContainer
						id={rightTable.id}
						mode={modeSettings.mode}
						initialDate={rightTable.initialDate}
					/>
				</div>
			</div>
		);
	}

	return (
		<DashboardTableContainer
			id={DASHBOARD_TABLE_ID.Main}
			mode={modeSettings.mode}
			initialDate={
				dateSearch.date ||
				(todayQuery.data?.date ? new Date(todayQuery.data?.date) : new Date())
			}
		/>
	);
};
