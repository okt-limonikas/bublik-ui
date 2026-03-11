/* SPDX-License-Identifier: Apache-2.0 */
/* SPDX-FileCopyrightText: 2024-2026 OKTET LTD */
import { Fragment } from 'react';
import { To, UIMatch, useMatches } from 'react-router-dom';

import { LinkWithProject } from '@/bublik/features/projects';
import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbLink,
	BreadcrumbList,
	BreadcrumbPage,
	BreadcrumbSeparator
} from '@/shared/tailwind-ui';

type AppBreadcrumbItem = {
	label: string;
	to?: To;
};

type BreadcrumbResolver =
	| AppBreadcrumbItem[]
	| ((params: Record<string, string | undefined>) => AppBreadcrumbItem[]);

type BreadcrumbHandle = {
	breadcrumbs?: BreadcrumbResolver;
};

const hasBreadcrumbs = (handle: unknown): handle is BreadcrumbHandle => {
	return Boolean(
		handle && typeof handle === 'object' && 'breadcrumbs' in handle
	);
};

const resolveBreadcrumbs = (matches: UIMatch[]) => {
	const activeMatch = [...matches]
		.reverse()
		.find((match) => hasBreadcrumbs(match.handle));

	if (!activeMatch || !hasBreadcrumbs(activeMatch.handle)) {
		return [];
	}

	const { breadcrumbs } = activeMatch.handle;

	if (!breadcrumbs) return [];

	return typeof breadcrumbs === 'function'
		? breadcrumbs(activeMatch.params)
		: breadcrumbs;
};

export const AppBreadcrumbs = () => {
	const matches = useMatches();
	const items = resolveBreadcrumbs(matches);

	if (items.length === 0) return null;

	return (
		<div className="rounded-2xl border border-border-primary/70 bg-white/80 px-4 py-3 shadow-[0_10px_28px_rgba(15,23,42,0.05)] backdrop-blur-sm">
			<Breadcrumb>
				<BreadcrumbList>
					{items.map((item, index) => {
						const isLast = index === items.length - 1;

						return (
							<Fragment key={`${item.label}_${index}`}>
								<BreadcrumbItem>
									{isLast ? (
										<BreadcrumbPage>{item.label}</BreadcrumbPage>
									) : item.to ? (
										<BreadcrumbLink asChild>
											<LinkWithProject to={item.to}>
												{item.label}
											</LinkWithProject>
										</BreadcrumbLink>
									) : (
										<BreadcrumbPage>{item.label}</BreadcrumbPage>
									)}
								</BreadcrumbItem>
								{isLast ? null : <BreadcrumbSeparator />}
							</Fragment>
						);
					})}
				</BreadcrumbList>
			</Breadcrumb>
		</div>
	);
};
