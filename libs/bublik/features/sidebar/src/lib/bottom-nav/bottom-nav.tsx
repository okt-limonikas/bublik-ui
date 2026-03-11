/* SPDX-License-Identifier: Apache-2.0 */
/* SPDX-FileCopyrightText: 2024-2026 OKTET LTD */
import { ReactNode } from 'react';

import { Icon, cn, useSidebar } from '@/shared/tailwind-ui';
import { config } from '@/bublik/config';

import { SettingsModal } from '@/bublik/features/settings';

import { NavLink, SidebarItem } from '../nav-link';

const getNavSections = () => {
	const devSection: SidebarItem = {
		label: 'Admin',
		icon: <Icon name="Edit" />,
		to: '/admin/import',
		pattern: [{ path: '/admin/*' }],
		subitems: [
			{
				label: 'Configs',
				icon: <Icon name="SettingsSliders" size={24} />,
				to: '/admin/config',
				pattern: { path: '/admin/config' }
			},
			{
				label: 'Users',
				icon: <Icon name="TwoUsers" size={24} />,
				to: '/admin/users',
				pattern: { path: '/admin/users' }
			},
			{
				label: 'Import',
				icon: <Icon name="Import" size={24} />,
				to: '/admin/import',
				pattern: { path: '/admin/import' }
			},
			{
				label: 'Flower',
				icon: <Icon name="LineChartOnline" size={24} />,
				to: '/admin/flower',
				pattern: { path: '/admin/flower' }
			}
		]
	};

	const bottomNav: SidebarItem[] = [
		{
			label: 'Help',
			icon: <Icon name="Bulb" size={28} />,
			to: '/help/faq',
			pattern: [{ path: '/help', end: false }, { path: '/help/faq' }],
			subitems: [
				{
					label: 'Documentation',
					icon: <Icon name="PaperText" />,
					href: `${config.oldBaseUrl}/docs`
				},
				{
					label: 'Changelog',
					icon: <Icon name="PaperChangelog" />,
					href: `${config.oldBaseUrl}/docs/blog`
				}
			]
		}
	];

	return [devSection, ...bottomNav];
};

const links = getNavSections();

function SectionLabel({ children }: { children: ReactNode }) {
	const { isSidebarOpen } = useSidebar();

	return (
		<div
			className={cn(
				'px-3 text-[0.65rem] font-semibold uppercase tracking-[0.22em] text-text-menu transition-all duration-200',
				isSidebarOpen
					? 'translate-y-0 opacity-100'
					: 'pointer-events-none -translate-y-1 opacity-0'
			)}
		>
			{children}
		</div>
	);
}

export const BottomNavigation = () => {
	const [adminLink, helpLink] = links;

	return (
		<nav aria-label="Secondary navigation" className="flex flex-col gap-5">
			<section className="flex flex-col gap-2">
				<SectionLabel>Preferences</SectionLabel>
				<SettingsModal />
			</section>
			{adminLink ? (
				<section className="flex flex-col gap-2">
					<SectionLabel>Administration</SectionLabel>
					<ul className="flex flex-col gap-1.5">
						<li>
							<NavLink {...adminLink} />
						</li>
					</ul>
				</section>
			) : null}
			{helpLink ? (
				<section className="flex flex-col gap-2">
					<SectionLabel>Support</SectionLabel>
					<ul className="flex flex-col gap-1.5">
						<li>
							<NavLink {...helpLink} />
						</li>
					</ul>
				</section>
			) : null}
		</nav>
	);
};
