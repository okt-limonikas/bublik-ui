/* SPDX-License-Identifier: Apache-2.0 */
/* SPDX-FileCopyrightText: 2024-2026 OKTET LTD */
import { PropsWithChildren, Suspense } from 'react';
import { useSearchParams } from 'react-router-dom';

import { AppShell, ErrorBoundary, Spinner } from '@/shared/tailwind-ui';
import { HIDE_SIDEBAR_QUERY_KEY } from '@/bublik/features/projects';
import { Sidebar } from '@/bublik/features/sidebar';

import { AppBreadcrumbs } from './app-breadcrumbs';

const parseHideSidebarQuery = (value: string | null) => {
	if (!value) return null;

	const normalizedValue = value.toLowerCase();

	if (normalizedValue === '1' || normalizedValue === 'true') return true;
	if (normalizedValue === '0' || normalizedValue === 'false') return false;

	return null;
};

export const Layout = (props: PropsWithChildren) => {
	const [searchParams] = useSearchParams();
	const queryValue = searchParams.get(HIDE_SIDEBAR_QUERY_KEY);
	const parsedQueryValue = parseHideSidebarQuery(queryValue);
	const hideSidebar = parsedQueryValue ?? false;

	return (
		<AppShell sidebar={<Sidebar />} hideSidebar={hideSidebar}>
			<ErrorBoundary>
				<Suspense fallback={<Spinner className="h-screen" />}>
					<div className="flex min-h-full flex-col">
						{hideSidebar ? null : (
							<div className="px-4 pb-3 pt-4 md:px-6">
								<AppBreadcrumbs />
							</div>
						)}
						<div className="min-h-0 flex-1">{props.children}</div>
					</div>
				</Suspense>
			</ErrorBoundary>
		</AppShell>
	);
};
