/* SPDX-License-Identifier: Apache-2.0 */
/* SPDX-FileCopyrightText: 2024 OKTET LTD */
import { memo } from 'react';

import { ButtonTw, cn, Icon, Tooltip } from '@/shared/tailwind-ui';

import { useTocStatic, useTocUI } from './run-report-toc.context';
import { TocItem } from './run-report-toc-item.component';

// Memoized content component - only re-renders when contents change
const TocContent = memo(function TocContent() {
	const { contents } = useTocStatic();

	return (
		<nav>
			{contents.map((item) => (
				<TocItem key={item.id} item={item} />
			))}
		</nav>
	);
});

// Mode toggle - only subscribes to UI context
const TocModeToggle = memo(function TocModeToggle() {
	const { displayMode, setDisplayMode } = useTocUI();

	return (
		<Tooltip
			content={
				displayMode === 'floating' ? 'Switch to sidebar' : 'Switch to floating'
			}
		>
			<ButtonTw
				variant="ghost"
				size="xss"
				onClick={() =>
					setDisplayMode(displayMode === 'floating' ? 'sidebar' : 'floating')
				}
			>
				<Icon
					name={
						displayMode === 'floating' ? 'LayoutLogSidebar' : 'LayoutLogSingle'
					}
					className="size-4"
				/>
			</ButtonTw>
		</Tooltip>
	);
});

// Header is static, memoize it
const TocHeader = memo(function TocHeader() {
	return (
		<div className="flex items-center justify-between px-4 py-2 border-b border-border-primary shrink-0">
			<span className="text-[0.75rem] font-semibold leading-[0.875rem] text-text-primary">
				Table of Contents
			</span>
			<div className="flex items-center gap-1">
				<TocModeToggle />
			</div>
		</div>
	);
});

// Floating panel - subscribes only to UI context for visibility
export const TocFloatingPanel = memo(function TocFloatingPanel() {
	const { isVisible, toggleVisibility } = useTocUI();

	return (
		<>
			{/* Floating panel on the right side */}
			<aside
				className={cn(
					'fixed right-0 top-1/2 -translate-y-1/2 z-40',
					'flex bg-white border border-border-primary rounded-l-lg shadow-lg',
					'transition-all duration-200 ease-in-out overflow-hidden',
					isVisible ? 'w-[320px] h-[60vh] opacity-100' : 'w-0 h-0 opacity-0'
				)}
			>
				{/* Panel content */}
				<div className="flex flex-col flex-1 min-w-0">
					<TocHeader />
					{/* Scrollable content */}
					<div className="flex-1 overflow-y-auto overflow-x-hidden p-2">
						<TocContent />
					</div>
				</div>
			</aside>

			{/* Toggle button - always on the left edge of panel, outside */}
			<ButtonTw
				variant="secondary"
				size="xss"
				onClick={toggleVisibility}
				className={cn(
					'fixed top-1/2 -translate-y-1/2 z-50 rounded-l-lg rounded-r-none px-2 py-4 shadow-lg',
					'transition-all duration-200 ease-in-out',
					isVisible ? 'right-[320px]' : 'right-0'
				)}
			>
				<Icon
					name={isVisible ? 'CrossSimple' : 'PaperListText'}
					className="size-5"
				/>
			</ButtonTw>
		</>
	);
});

// Sidebar component
export const TocSidebar = memo(function TocSidebar() {
	const { isVisible, toggleVisibility } = useTocUI();

	return (
		<aside
			className={cn(
				'sticky top-4 rounded-lg h-[calc(100vh-32px)] flex flex-col bg-white border-r border-border-primary shrink-0',
				'transition-all duration-200 ease-in-out overflow-hidden',
				isVisible ? 'w-[280px]' : 'w-0'
			)}
		>
			<div className="flex items-center justify-between px-4 py-2 border-b border-border-primary shrink-0">
				<span className="text-[0.75rem] font-semibold leading-[0.875rem] text-text-primary">
					Table of Contents
				</span>
				<div className="flex items-center gap-1">
					<TocModeToggle />
					<ButtonTw variant="ghost" size="xss" onClick={toggleVisibility}>
						<Icon name="CrossSimple" className="size-4" />
					</ButtonTw>
				</div>
			</div>
			{/* Scrollable content */}
			<div className="flex-1 overflow-y-auto overflow-x-hidden p-2">
				<TocContent />
			</div>
		</aside>
	);
});

// Main panel component - decides which layout to use
export const TocPanel = memo(function TocPanel() {
	const { displayMode, isVisible, toggleVisibility } = useTocUI();

	if (displayMode === 'sidebar') {
		return (
			<>
				<TocSidebar />
				{/* Show button when sidebar is collapsed */}
				{!isVisible && (
					<ButtonTw
						variant="secondary"
						size="xss"
						onClick={toggleVisibility}
						className="fixed right-0 top-1/2 -translate-y-1/2 z-50 rounded-r-lg rounded-l-none px-2 py-4 shadow-lg"
					>
						<Icon name="PaperListText" className="size-5" />
					</ButtonTw>
				)}
			</>
		);
	}

	return <TocFloatingPanel />;
});
