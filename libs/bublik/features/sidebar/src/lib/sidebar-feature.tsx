/* SPDX-License-Identifier: Apache-2.0 */
/* SPDX-FileCopyrightText: 2024-2026 OKTET LTD */

import { cn, useSidebar } from '@/shared/tailwind-ui';

import { SidebarLogoButton } from './logo-button';
import { MainNavigation } from './main-nav';
import { BottomNavigation } from './bottom-nav';

export const Sidebar = () => {
	const { isSidebarOpen } = useSidebar();

	return (
		<nav
			aria-label="Sidebar navigation"
			className={cn(
				'relative flex h-full w-full flex-col overflow-hidden border-r border-border-primary/80 bg-white/95 text-text-primary shadow-[0_18px_48px_rgba(15,23,42,0.08)] backdrop-blur-sm transition-[border-radius,box-shadow] duration-300',
				isSidebarOpen ? 'rounded-r-[1.75rem]' : 'rounded-r-[1.35rem]'
			)}
		>
			<div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-[linear-gradient(180deg,rgba(236,241,255,0.85)_0%,rgba(255,255,255,0)_100%)]" />
			<div
				className={cn(
					'relative z-10 border-b border-border-primary/70 px-3 pb-3 pt-4',
					isSidebarOpen ? 'pt-5' : 'pt-4'
				)}
			>
				<SidebarLogoButton />
			</div>
			<div className="relative z-10 flex-1 overflow-y-auto px-3 py-4 styled-scrollbar">
				<MainNavigation />
			</div>
			<div
				className={cn(
					'relative z-10 mt-auto border-t border-border-primary/70 px-3 pb-5 pt-4',
					isSidebarOpen ? 'pb-6' : 'pb-5'
				)}
			>
				<BottomNavigation />
			</div>
		</nav>
	);
};
