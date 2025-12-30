/* SPDX-License-Identifier: Apache-2.0 */
/* SPDX-FileCopyrightText: 2024 OKTET LTD */
import { ButtonTw, cn, Icon } from '@/shared/tailwind-ui';

import { useTocContext } from './run-report-toc-context-hook';
import { TocItem } from './run-report-toc-item.component';

export function TocPanel() {
	const { contents, isVisible, toggleVisibility } = useTocContext();

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
					{/* Header */}
					<div className="flex items-center justify-between px-4 py-2 border-b border-border-primary shrink-0">
						<span className="text-[0.75rem] font-semibold leading-[0.875rem] text-text-primary">
							Table of Contents
						</span>
					</div>

					{/* Scrollable content */}
					<div className="flex-1 overflow-y-auto overflow-x-hidden p-2">
						<nav>
							{contents.map((item) => (
								<TocItem key={item.id} item={item} />
							))}
						</nav>
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
}
