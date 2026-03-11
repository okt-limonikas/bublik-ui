/* SPDX-License-Identifier: Apache-2.0 */
/* SPDX-FileCopyrightText: 2024-2026 OKTET LTD */
import { useSidebar, Tooltip, Icon, cn } from '@/shared/tailwind-ui';
import { LinkWithProject } from '@/bublik/features/projects';

export const SidebarLogoButton = () => {
	const { isSidebarOpen, toggleSidebar } = useSidebar();

	return (
		<Tooltip
			content="Toggle navigation (S)"
			disabled={isSidebarOpen}
			side="right"
			sideOffset={14}
		>
			<div className="flex items-center gap-2 text-primary transition-all duration-300">
				<button
					type="button"
					onClick={toggleSidebar}
					aria-label="Toggle sidebar open state"
					className={cn(
						'grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-transparent bg-white text-primary shadow-[0_4px_16px_rgba(98,126,251,0.16)] transition-all duration-300 hover:border-primary/10 hover:bg-primary-wash focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25',
						isSidebarOpen ? 'translate-x-0' : 'translate-x-[1px]'
					)}
				>
					<Icon
						name="SidebarArrows"
						className={cn(
							'transition-all duration-300',
							isSidebarOpen ? 'rotate-0' : 'rotate-180'
						)}
					/>
				</button>
				<LinkWithProject
					className={cn(
						'flex min-w-0 items-center rounded-2xl px-2 py-1 transition-all duration-300 hover:bg-primary-wash focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20',
						isSidebarOpen
							? 'max-w-full translate-x-0 opacity-100'
							: 'pointer-events-none max-w-0 -translate-x-2 opacity-0'
					)}
					to="/dashboard"
				>
					<div className="flex min-w-0 flex-col">
						<span className="text-[0.65rem] font-semibold uppercase tracking-[0.24em] text-text-menu">
							Workspace
						</span>
						<span className="truncate text-[1.125rem] font-semibold tracking-[-0.02em] text-text-primary">
							Bublik
						</span>
					</div>
				</LinkWithProject>
			</div>
		</Tooltip>
	);
};
