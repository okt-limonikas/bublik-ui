/* SPDX-License-Identifier: Apache-2.0 */
/* SPDX-FileCopyrightText: 2024 OKTET LTD */
import { useRef, useEffect, useMemo } from 'react';

import { cn, Icon, Tooltip } from '@/shared/tailwind-ui';

import { TableOfContentsItem } from './run-report-toc.types';
import { useTocContext } from './run-report-toc.context';

interface TocItemProps {
	item: TableOfContentsItem;
	depth?: number;
}

export function TocItem({ item, depth = 0 }: TocItemProps) {
	const {
		activeId,
		activeParentIds,
		expandedIds,
		toggleExpanded,
		scrollToItem
	} = useTocContext();
	const itemRef = useRef<HTMLDivElement>(null);

	const isActive = activeId === item.id;
	const isExpanded = expandedIds.has(item.id);
	const hasChildren = item.children && item.children.length > 0;

	// Check if this item is a parent of the active item and get its level
	const parentIndex = activeParentIds.indexOf(item.id);
	const isActiveParent = parentIndex !== -1;
	// Level 0 = immediate parent (strongest), higher = more distant (lighter)
	const parentLevel = isActiveParent
		? activeParentIds.length - 1 - parentIndex
		: -1;

	const isArgValBlock = item.type === 'arg-val-block';
	const argsEntries = useMemo(() => {
		if (!isArgValBlock || !item.argsVals) return [];
		return Object.entries(item.argsVals);
	}, [isArgValBlock, item.argsVals]);

	useEffect(() => {
		if (isActive && itemRef.current) {
			itemRef.current.scrollIntoView({
				behavior: 'smooth',
				block: 'nearest'
			});
		}
	}, [isActive]);

	if (!item.label) {
		return null;
	}

	const handleClick = () => {
		scrollToItem(item.id);
	};

	const handleToggleExpand = (e: React.MouseEvent) => {
		e.stopPropagation();
		toggleExpanded(item.id);
	};

	// Determine background color based on active state or parent level
	const getHighlightStyles = () => {
		if (isActive) {
			return 'bg-primary-wash border-l-2 border-primary font-semibold';
		}
		if (isActiveParent) {
			// Immediate parent (level 0) gets stronger highlight, distant parents get lighter
			if (parentLevel === 0) {
				return 'bg-primary-wash/70 border-l-2 border-primary/70';
			}
			if (parentLevel === 1) {
				return 'bg-primary-wash/40 border-l-2 border-primary/40';
			}
			return 'bg-primary-wash/20 border-l-2 border-primary/20';
		}
		return '';
	};

	// Render arg-val-block with compact badge-style display
	if (isArgValBlock && argsEntries.length > 0) {
		return (
			<div>
				<div
					ref={itemRef}
					className={cn(
						'w-full text-left py-1.5 rounded-r text-[0.75rem] leading-[0.875rem]',
						'flex flex-col gap-1',
						'hover:bg-primary-wash transition-colors cursor-pointer',
						getHighlightStyles()
					)}
					style={{ paddingLeft: `${depth * 12 + 8}px`, paddingRight: '8px' }}
					onClick={handleClick}
				>
					<div className="flex items-center gap-1">
						{hasChildren ? (
							<button
								type="button"
								className="grid place-items-center p-0.5 rounded hover:bg-border-primary shrink-0"
								onClick={handleToggleExpand}
							>
								<Icon
									name="ChevronDown"
									className={cn('size-3', !isExpanded && '-rotate-90')}
								/>
							</button>
						) : (
							<span className="size-4 shrink-0" />
						)}
						<span className="text-text-menu text-[0.65rem]">Arguments:</span>
					</div>
					<div className="flex flex-wrap gap-1" style={{ paddingLeft: '20px' }}>
						{argsEntries.slice(0, 4).map(([key, value]) => (
							<span
								key={key}
								className="inline-flex items-center bg-badge-1 rounded px-1.5 py-0.5 text-[0.625rem] leading-tight"
							>
								<span>{key}:</span>
								<span className="ml-0.5 font-medium">{value}</span>
							</span>
						))}
						{argsEntries.length > 4 && (
							<Tooltip
								content={argsEntries
									.slice(4)
									.map(([k, v]) => `${k}: ${v}`)
									.join('\n')}
								side="right"
							>
								<span className="inline-flex items-center bg-badge-1 rounded px-1.5 py-0.5 text-[0.625rem] leading-tight text-text-menu">
									+{argsEntries.length - 4} more
								</span>
							</Tooltip>
						)}
					</div>
				</div>

				{hasChildren && isExpanded && (
					<div>
						{item.children?.map((child) => (
							<TocItem key={child.id} item={child} depth={depth + 1} />
						))}
					</div>
				)}
			</div>
		);
	}

	return (
		<div>
			<div
				ref={itemRef}
				className={cn(
					'w-full text-left py-1.5 rounded-r text-[0.75rem] leading-[0.875rem]',
					'flex items-center gap-1',
					'hover:bg-primary-wash transition-colors cursor-pointer',
					getHighlightStyles()
				)}
				style={{ paddingLeft: `${depth * 12 + 8}px`, paddingRight: '8px' }}
			>
				{hasChildren ? (
					<button
						type="button"
						className="grid place-items-center p-0.5 rounded hover:bg-border-primary shrink-0"
						onClick={handleToggleExpand}
					>
						<Icon
							name="ChevronDown"
							className={cn('size-3', !isExpanded && '-rotate-90')}
						/>
					</button>
				) : (
					<span className="size-4 shrink-0" />
				)}
				<Tooltip content={item.label} side="right" sideOffset={8}>
					<span
						className="truncate cursor-pointer flex-1"
						onClick={handleClick}
					>
						{item.label}
					</span>
				</Tooltip>
			</div>

			{hasChildren && isExpanded && (
				<div>
					{item.children?.map((child) => (
						<TocItem key={child.id} item={child} depth={depth + 1} />
					))}
				</div>
			)}
		</div>
	);
}
