/* SPDX-License-Identifier: Apache-2.0 */
/* SPDX-FileCopyrightText: 2024-2026 OKTET LTD */
import {
	CSSProperties,
	PropsWithChildren,
	ReactNode,
	useCallback,
	ComponentType
} from 'react';

import { useLocalStorage, useKey } from '@/shared/hooks';
import { isFocusInInput } from '@/shared/utils';

import { SidebarProvider, useSidebar } from './context';
import {
	APP_SIDEBAR_COLLAPSED_WIDTH,
	APP_SIDEBAR_WIDTH
} from './sidebar.constants';
import { cn } from '../utils';

const SidebarStory = () => {
	const { isSidebarOpen } = useSidebar();

	return (
		<div
			className="sticky top-0 z-20 h-screen bg-white/80 backdrop-blur-sm transition-[width] duration-300 ease-out"
			style={{
				width: isSidebarOpen ? APP_SIDEBAR_WIDTH : APP_SIDEBAR_COLLAPSED_WIDTH
			}}
		/>
	);
};

export const withSidebar = (hideSidebar?: boolean) => {
	return (Story: ComponentType) => (
		<AppShell
			sidebar={hideSidebar ? null : <SidebarStory />}
			hideSidebar={hideSidebar}
		>
			<Story />
		</AppShell>
	);
};

export interface AppShellProps {
	sidebar: ReactNode;
	hideSidebar?: boolean;
}

export const AppShell = ({
	sidebar,
	hideSidebar = false,
	children
}: PropsWithChildren<AppShellProps>) => {
	const [isSidebarOpen, setIsSidebarOpen] = useLocalStorage(
		'sidebar-open',
		false
	);

	const isSidebarVisible = !hideSidebar;
	const sidebarWidth = isSidebarVisible
		? isSidebarOpen
			? APP_SIDEBAR_WIDTH
			: APP_SIDEBAR_COLLAPSED_WIDTH
		: '0px';

	const toggleSidebar = useCallback(() => {
		if (!isSidebarVisible) return;

		setIsSidebarOpen(!isSidebarOpen);
	}, [isSidebarOpen, isSidebarVisible, setIsSidebarOpen]);

	useKey(
		(e) =>
			isSidebarVisible &&
			e.code === 'KeyS' &&
			!e.ctrlKey &&
			!e.metaKey &&
			!isFocusInInput(e),
		toggleSidebar,
		{ event: 'keypress' }
	);

	return (
		<div
			className="relative flex h-full"
			data-testid="tw-app-shell"
			style={{ '--app-shell-sidebar-width': sidebarWidth } as CSSProperties}
		>
			<SidebarProvider
				isSidebarOpen={isSidebarVisible ? isSidebarOpen : false}
				setSidebarOpen={setIsSidebarOpen}
				toggleSidebar={toggleSidebar}
			>
				{isSidebarVisible ? (
					<div
						className="sticky top-0 z-20 h-screen h-svh shrink-0 transition-[width] duration-300 ease-out"
						id="sidebar"
						style={{ width: sidebarWidth }}
					>
						{sidebar}
					</div>
				) : null}
				<div className="flex-grow overflow-auto" id="page-container">
					{children}
				</div>
			</SidebarProvider>
		</div>
	);
};
