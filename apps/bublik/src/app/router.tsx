/* SPDX-License-Identifier: Apache-2.0 */
/* SPDX-FileCopyrightText: 2024-2026 OKTET LTD */
import { lazy, useEffect, useState, Suspense } from 'react';
import {
	Outlet,
	To,
	createBrowserRouter,
	RouterProvider,
	useLocation
} from 'react-router-dom';
import { QueryParamProvider } from 'use-query-params';
import { ReactRouter6Adapter } from 'use-query-params/adapters/react-router-6';

import { config } from '@/bublik/config';
import { ErrorBoundary } from '@/shared/tailwind-ui';

import { AuthLayout } from '../pages/auth/auth.layout';
import { Layout } from './layout';
import { RedirectToDashboard, RedirectToLogPage } from './redirects';

import { AdminUsersPage } from '../pages/admin-users/admin-users.page';
import { ConfigsPage } from '../pages/configs/configs.page';
import { DashboardPageV2 } from '../pages/dashboard-page/dashboard-page-v2';
import {
	DevelopersLayout,
	FlowerFeature
} from '../pages/developers-page/developers-page';
import { EmailActivationPage } from '../pages/auth/email-activation.page';
import { ForgotPage } from '../pages/auth/forgot.page';
import { HelpPage } from '../pages/help-page/help-page';
import { LoginPage } from '../pages/auth/login.page';
import { LogPage } from '../pages/log-page/log-page';
import { NoMatchFeature } from '../pages/not-found-page/not-found-page';
import { ResetPasswordPage } from '../pages/auth/reset-password.page';
import { RunDiffPage } from '../pages/run-diff-page/run-diff-page';
import { RunMultiplePage } from '../pages/run-multiple';
import { RunPage } from '../pages/run-page/run-page';
import { HistoryPageV2 } from '../pages/history-page/history-page';

import { CopyShortUrlCommandItemContainer } from '@/bublik/features/copy-url';
import {
	Command,
	CommandDialog,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
	CommandSeparator,
	Icon,
	Spinner
} from '@/shared/tailwind-ui';
import { useNavigateWithProject } from '@/bublik/features/projects';
import { RunsPage } from '../pages/runs-page';

const ImportPage = lazy(() =>
	import('../pages/import-page/import-page').then((module) => ({
		default: module.ImportPage
	}))
);

const MeasurementsPage = lazy(() =>
	import('../pages/measurements-page/measurements-page').then((module) => ({
		default: module.MeasurementsPage
	}))
);

const NetPacketAnalyzerPage = lazy(() =>
	import('../pages/net-packet-analyzer/net-packet-analyzer.page').then(
		(module) => ({
			default: module.NetPacketAnalyzerPage
		})
	)
);

const RunReportPage = lazy(() =>
	import('../pages/run-report/run-report.page').then((module) => ({
		default: module.RunReportPage
	}))
);

type BreadcrumbItem = {
	label: string;
	to?: To;
};

type BreadcrumbResolver =
	| BreadcrumbItem[]
	| ((params: Record<string, string | undefined>) => BreadcrumbItem[]);

const breadcrumb = (breadcrumbs: BreadcrumbResolver) => ({ breadcrumbs });

const formatEntityLabel = (prefix: string, value?: string) => {
	if (!value) return prefix;

	return `${prefix} ${value.slice(0, 8)}`;
};

function BublikCommand() {
	const [open, setOpen] = useState(false);
	const navigate = useNavigateWithProject();
	const location = useLocation();

	useEffect(() => {
		const down = (e: KeyboardEvent) => {
			if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
				e.preventDefault();
				setOpen((open) => !open);
			}
		};

		document.addEventListener('keydown', down);
		return () => document.removeEventListener('keydown', down);
	}, []);

	function handleSelect(action: () => void) {
		return (_value: string) => {
			action();
			setOpen(false);
		};
	}

	return (
		<CommandDialog open={open} onOpenChange={setOpen}>
			<Command className="border rounded-lg shadow-xl">
				<CommandInput
					startIcon={
						<Icon name="MagnifyingGlass" className="size-5 text-text-menu" />
					}
					placeholder="Type a command or search..."
				/>
				<CommandList>
					<CommandEmpty>No results found.</CommandEmpty>
					<CommandGroup heading="Navigation">
						<CommandItem onSelect={handleSelect(() => navigate('/dashboard'))}>
							<Icon name="Category" className="w-4 h-4 mr-2" />
							<span>Dashboard</span>
						</CommandItem>
						<CommandItem onSelect={handleSelect(() => navigate('/history'))}>
							<Icon name="TimeCircle" className="w-4 h-4 mr-2" />
							<span>History</span>
						</CommandItem>
						<CommandItem onSelect={handleSelect(() => navigate('/runs'))}>
							<Icon name="Play" className="w-4 h-4 mr-2" />
							<span>Runs</span>
						</CommandItem>
					</CommandGroup>
					<CommandSeparator />
					<CommandGroup heading="Settings">
						<CommandItem
							onSelect={handleSelect(() =>
								navigate(
									`${location.pathname}?settings-open=1&settings-tab=account`
								)
							)}
						>
							<Icon name="Profile" className="w-4 h-4 mr-2" />
							<span>Profile</span>
						</CommandItem>
						<CommandItem onSelect={handleSelect(() => navigate('/help/faq'))}>
							<Icon name="Bulb" className="w-4 h-4 mr-2" />
							<span>Help</span>
						</CommandItem>
						<CommandItem
							onSelect={handleSelect(() => navigate('/help/changelog'))}
						>
							<Icon name="PaperChangelog" className="w-4 h-4 mr-2" />
							<span>Changelog</span>
						</CommandItem>
					</CommandGroup>
					<CommandGroup heading="Utils">
						<CopyShortUrlCommandItemContainer
							onComplete={() => setOpen(false)}
						/>
					</CommandGroup>
				</CommandList>
			</Command>
		</CommandDialog>
	);
}

function LazyRoute({ children }: { children: React.ReactNode }) {
	return (
		<Suspense fallback={<Spinner className="h-48" />}>{children}</Suspense>
	);
}

const router = createBrowserRouter(
	[
		{
			element: (
				<QueryParamProvider
					adapter={ReactRouter6Adapter}
					options={{ updateType: 'replaceIn' }}
				>
					<BublikCommand />
					<Outlet />
				</QueryParamProvider>
			),
			ErrorBoundary: () => <ErrorBoundary />,
			children: [
				{
					path: 'auth',
					element: (
						<AuthLayout>
							<Outlet />
						</AuthLayout>
					),
					children: [
						{ path: 'login', element: <LoginPage /> },
						{ path: 'forgot', element: <ForgotPage /> },
						{
							path: 'forgot_password/password_reset/:userId/:resetToken',
							element: <ResetPasswordPage />
						},
						{
							path: 'register/activate/:userId/:token/',
							element: <EmailActivationPage />
						}
					]
				},
				{
					element: (
						<Layout>
							<Outlet />
						</Layout>
					),
					ErrorBoundary: () => <ErrorBoundary />,
					children: [
						{ path: '/', element: <RedirectToDashboard /> },
						{
							path: '/dashboard',
							element: <DashboardPageV2 />,
							handle: breadcrumb([{ label: 'Dashboard' }])
						},
						{
							path: '/tools/packet-viewer',
							element: (
								<LazyRoute>
									<NetPacketAnalyzerPage />
								</LazyRoute>
							),
							handle: breadcrumb([
								{ label: 'Tools' },
								{ label: 'Packet Viewer' }
							])
						},
						{
							path: '/history',
							element: <HistoryPageV2 />,
							handle: breadcrumb([{ label: 'History' }])
						},
						{
							path: '/history/v2',
							element: <HistoryPageV2 />,
							handle: breadcrumb([{ label: 'History' }])
						},
						{ path: '/log/:runId/:old', element: <RedirectToLogPage /> },
						{
							path: '/log/:runId',
							element: <LogPage />,
							handle: breadcrumb((params) => [
								{ label: 'Runs', to: '/runs' },
								{
									label: formatEntityLabel('Run', params.runId),
									to: `/runs/${params.runId}`
								},
								{ label: 'Log' }
							])
						},
						{
							path: '/runs/:runId/report',
							element: (
								<LazyRoute>
									<RunReportPage />
								</LazyRoute>
							),
							handle: breadcrumb((params) => [
								{ label: 'Runs', to: '/runs' },
								{
									label: formatEntityLabel('Run', params.runId),
									to: `/runs/${params.runId}`
								},
								{ label: 'Report' }
							])
						},
						{
							path: '/runs/:runId/results/:resultId/measurements',
							element: (
								<LazyRoute>
									<MeasurementsPage />
								</LazyRoute>
							),
							handle: breadcrumb((params) => [
								{ label: 'Runs', to: '/runs' },
								{
									label: formatEntityLabel('Run', params.runId),
									to: `/runs/${params.runId}`
								},
								{ label: formatEntityLabel('Result', params.resultId) },
								{ label: 'Measurements' }
							])
						},
						{
							path: '/runs',
							element: <RunsPage />,
							handle: breadcrumb([{ label: 'Runs' }])
						},
						{
							path: '/compare',
							element: <RunDiffPage />,
							handle: breadcrumb([
								{ label: 'Runs', to: '/runs' },
								{ label: 'Compare' }
							])
						},
						{
							path: '/multiple',
							element: <RunMultiplePage />,
							handle: breadcrumb([
								{ label: 'Runs', to: '/runs' },
								{ label: 'Multiple' }
							])
						},
						{
							path: '/runs/:runId',
							element: <RunPage />,
							handle: breadcrumb((params) => [
								{ label: 'Runs', to: '/runs' },
								{ label: formatEntityLabel('Run', params.runId) }
							])
						},
						{
							path: '/admin',
							element: <DevelopersLayout />,
							handle: breadcrumb([{ label: 'Admin' }]),
							children: [
								{
									path: 'import',
									element: (
										<LazyRoute>
											<ImportPage />
										</LazyRoute>
									),
									handle: breadcrumb([
										{ label: 'Admin', to: '/admin/import' },
										{ label: 'Import' }
									])
								},
								{
									path: 'flower',
									element: <FlowerFeature />,
									handle: breadcrumb([
										{ label: 'Admin', to: '/admin/import' },
										{ label: 'Flower' }
									])
								},
								{
									path: 'users',
									element: (
										<LazyRoute>
											<AdminUsersPage />
										</LazyRoute>
									),
									handle: breadcrumb([
										{ label: 'Admin', to: '/admin/import' },
										{ label: 'Users' }
									])
								},
								{
									path: 'config',
									element: (
										<LazyRoute>
											<ConfigsPage />
										</LazyRoute>
									),
									handle: breadcrumb([
										{ label: 'Admin', to: '/admin/import' },
										{ label: 'Configs' }
									])
								},
								{
									element: <NoMatchFeature />,
									handle: breadcrumb([{ label: 'Not Found' }])
								}
							]
						},
						{
							path: '/help',
							handle: breadcrumb([{ label: 'Help' }]),
							children: [
								{
									path: 'faq',
									element: <HelpPage />,
									handle: breadcrumb([
										{ label: 'Help', to: '/help/faq' },
										{ label: 'FAQ' }
									])
								}
							]
						},
						{
							path: '*',
							element: <NoMatchFeature />,
							handle: breadcrumb([{ label: 'Not Found' }])
						}
					]
				}
			]
		}
	],
	{
		basename: config.baseUrl,
		future: { v7_normalizeFormMethod: true }
	}
);

export const Router = () => {
	return <RouterProvider router={router} />;
};
