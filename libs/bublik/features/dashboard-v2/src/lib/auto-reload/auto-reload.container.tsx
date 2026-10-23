/* SPDX-License-Identifier: Apache-2.0 */
/* SPDX-FileCopyrightText: 2021-2023 OKTET Labs Ltd. */
import { analyticsEventNames, trackEvent } from '@/bublik/features/analytics';
import { AutoReloadControl } from '@/shared/tailwind-ui';

import {
	DASHBOARD_RELOAD_INTERVAL_MS,
	useDashboardClock,
	useDashboardReload
} from '../hooks';

export const AutoReloadContainer = () => {
	const { isEnabled, setIsEnabled } = useDashboardReload();
	const { latestTimestamp, isFetching, refetch } = useDashboardClock();

	const handleCheckedChange = (enabled: boolean) => {
		trackEvent(analyticsEventNames.dashboardAutoReloadToggle, {
			enabled
		});

		setIsEnabled(enabled);
	};

	const handleRefreshClick = () => {
		trackEvent(analyticsEventNames.dashboardManualRefresh, {
			source: 'button'
		});

		refetch();
	};

	return (
		<AutoReloadControl
			checked={isEnabled}
			onCheckedChange={handleCheckedChange}
			onRefreshClick={handleRefreshClick}
			intervalMs={DASHBOARD_RELOAD_INTERVAL_MS}
			isFetching={isFetching}
			updatedAt={latestTimestamp}
			switchLabel="Auto reload"
			refreshLabel="Refresh dashboard"
		/>
	);
};
