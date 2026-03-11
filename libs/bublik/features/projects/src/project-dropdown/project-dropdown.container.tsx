/* SPDX-License-Identifier: Apache-2.0 */
/* SPDX-FileCopyrightText: 2024-2026 OKTET LTD */
import { useState } from 'react';

import { bublikAPI } from '@/services/bublik-api';
import { Icon, Tooltip, cn, useSidebar } from '@/shared/tailwind-ui';

import { useProjectSearch } from '../hooks';

function ProjectPickerContainer() {
	const { isSidebarOpen, toggleSidebar } = useSidebar();
	const {
		data: projects,
		isLoading,
		error
	} = bublikAPI.useGetAllProjectsQuery();
	const [isOpen, setIsOpen] = useState(false);

	const { projectIds, setProjectsIds } = useProjectSearch();

	const handleValueChange = (projectId: number | undefined) => {
		if (typeof projectId === 'undefined') {
			setProjectsIds([]);
		} else {
			setProjectsIds([projectId]);
		}
	};

	if (isLoading) return null;

	if (error) return null;

	if (!projects?.length) return null;

	const selectedProject = projects.find(
		(project) => project.id === projectIds.at(0)
	);

	return (
		<div className="flex flex-col">
			<Tooltip
				content={selectedProject ? selectedProject.name : 'Projects'}
				disabled={isSidebarOpen}
				side="right"
				sideOffset={14}
			>
				<div
					className={cn(
						'group/project relative flex min-h-[46px] w-full items-center overflow-hidden rounded-xl border transition-all duration-200 ease-out',
						'focus-within:shadow-[0_0_0_3px_rgba(98,126,251,0.12)]',
						isOpen && isSidebarOpen
							? 'border-[rgba(98,126,251,0.18)] bg-primary-wash text-primary shadow-[0_10px_24px_rgba(98,126,251,0.12)]'
							: 'border-transparent text-text-secondary hover:border-[rgba(148,163,184,0.14)] hover:bg-primary-wash hover:text-text-primary'
					)}
				>
					{isOpen && isSidebarOpen ? (
						<div className="absolute left-1.5 top-1/2 h-6 w-1 -translate-y-1/2 rounded-full bg-primary" />
					) : null}
					<button
						className={cn(
							'flex min-w-0 flex-1 items-center gap-3 rounded-[inherit] py-3 text-left outline-none transition-colors focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:ring-offset-2 focus-visible:ring-offset-white',
							isSidebarOpen ? 'pl-3 pr-2' : 'justify-center px-0'
						)}
						onClick={() => {
							if (!isSidebarOpen) {
								toggleSidebar();
								setIsOpen(true);
								return;
							}

							setIsOpen((value) => !value);
						}}
						type="button"
					>
						<div
							className={cn(
								'grid size-10 shrink-0 place-items-center rounded-xl transition-all duration-200',
								isOpen && isSidebarOpen
									? 'bg-white text-primary shadow-[0_4px_16px_rgba(98,126,251,0.18)]'
									: 'text-text-menu group-hover/project:text-primary'
							)}
						>
							<Icon name="Folder" size={24} />
						</div>
						{isSidebarOpen ? (
							<div className="min-w-0 flex-1">
								<span className="block truncate text-[0.95rem] font-medium tracking-[-0.01em]">
									{selectedProject ? selectedProject.name : 'Projects'}
								</span>
							</div>
						) : null}
					</button>
					{isSidebarOpen ? (
						<button
							aria-expanded={isOpen}
							aria-label="Toggle project list"
							className={cn(
								'grid size-8 shrink-0 place-items-center rounded-lg text-text-menu transition-all duration-200 hover:bg-white hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20',
								'mr-2',
								isOpen ? 'text-primary' : 'text-text-menu'
							)}
							onClick={() => setIsOpen((value) => !value)}
							type="button"
						>
							<Icon
								name="ArrowShortTop"
								className={cn(
									'transition-transform duration-200',
									isOpen ? 'rotate-180' : 'rotate-90'
								)}
								size={20}
							/>
						</button>
					) : null}
				</div>
			</Tooltip>
			<div
				className={cn(
					'grid transition-[grid-template-rows,opacity,margin] duration-200 ease-out',
					isOpen && isSidebarOpen
						? 'mt-2 grid-rows-[1fr] opacity-100'
						: 'mt-0 grid-rows-[0fr] opacity-70'
				)}
			>
				<div className="overflow-hidden">
					<ul className="ml-5 flex flex-col gap-1.5 border-l border-border-primary pl-3">
						<li>
							<button
								className={cn(
									'group flex min-h-[38px] w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-all duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:ring-offset-2 focus-visible:ring-offset-white',
									!projectIds?.length
										? 'border-[rgba(98,126,251,0.16)] bg-white text-primary shadow-[0_8px_18px_rgba(98,126,251,0.08)]'
										: 'border-transparent text-text-secondary hover:bg-white hover:text-text-primary'
								)}
								onClick={() => handleValueChange(undefined)}
								type="button"
							>
								<div className="grid size-8 shrink-0 place-items-center rounded-lg text-primary">
									<div
										className={cn(
											'h-2.5 w-2.5 rounded-full bg-primary transition-opacity duration-200',
											projectIds?.length ? 'opacity-0' : 'opacity-100'
										)}
									/>
								</div>
								<span className="truncate text-[0.875rem] font-medium leading-6 tracking-[-0.01em]">
									All projects
								</span>
							</button>
						</li>
						{projects.map((project) => {
							const isSelected = projectIds?.includes(project.id);

							return (
								<li key={project.id}>
									<button
										className={cn(
											'group flex min-h-[38px] w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-all duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:ring-offset-2 focus-visible:ring-offset-white',
											isSelected
												? 'border-[rgba(98,126,251,0.16)] bg-white text-primary shadow-[0_8px_18px_rgba(98,126,251,0.08)]'
												: 'border-transparent text-text-secondary hover:bg-white hover:text-text-primary'
										)}
										onClick={() => handleValueChange(project.id)}
										type="button"
									>
										<div className="grid size-8 shrink-0 place-items-center rounded-lg text-primary">
											<div
												className={cn(
													'h-2.5 w-2.5 rounded-full bg-primary transition-opacity duration-200',
													isSelected ? 'opacity-100' : 'opacity-0'
												)}
											/>
										</div>
										<span className="truncate text-[0.875rem] font-medium leading-6 tracking-[-0.01em]">
											{project.name}
										</span>
									</button>
								</li>
							);
						})}
					</ul>
				</div>
			</div>
		</div>
	);
}

export { ProjectPickerContainer };
