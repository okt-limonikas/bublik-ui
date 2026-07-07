/* SPDX-License-Identifier: Apache-2.0 */
/* SPDX-FileCopyrightText: 2024-2026 OKTET LTD */
import {
	Dispatch,
	KeyboardEvent,
	SetStateAction,
	useEffect,
	useRef,
	useState
} from 'react';

import { cn } from '../utils';
import {
	FilteredSuggestionGroup,
	SuggestionEntry
} from './use-suggestion-context';

export const flattenEntries = (
	groups: FilteredSuggestionGroup[]
): SuggestionEntry[] => groups.flatMap((group) => group.entries);

interface UseSuggestionNavigationOptions {
	groups: FilteredSuggestionGroup[];
	isOpen: boolean;
	onAccept: (entry: SuggestionEntry) => void;
	onClose: () => void;
}

interface SuggestionNavigation {
	highlight: number;
	setHighlight: Dispatch<SetStateAction<number>>;
	/** Returns true when the event was handled and should not bubble further */
	handleKeyDown: (event: KeyboardEvent) => boolean;
}

export function useSuggestionNavigation({
	groups,
	isOpen,
	onAccept,
	onClose
}: UseSuggestionNavigationOptions): SuggestionNavigation {
	const [highlight, setHighlight] = useState(-1);
	const entries = flattenEntries(groups);

	useEffect(() => {
		setHighlight(-1);
	}, [isOpen]);

	useEffect(() => {
		if (highlight >= entries.length) setHighlight(entries.length - 1);
	}, [entries.length, highlight]);

	const handleKeyDown = (event: KeyboardEvent): boolean => {
		if (!isOpen || !entries.length) return false;

		if (event.key === 'ArrowDown') {
			event.preventDefault();
			setHighlight((current) => (current + 1) % entries.length);
			return true;
		}

		if (event.key === 'ArrowUp') {
			event.preventDefault();
			setHighlight(
				(current) => (current - 1 + entries.length) % entries.length
			);
			return true;
		}

		if (event.key === 'Enter' && highlight >= 0 && highlight < entries.length) {
			event.preventDefault();
			onAccept(entries[highlight]);
			return true;
		}

		if (event.key === 'Escape') {
			event.preventDefault();
			onClose();
			return true;
		}

		return false;
	};

	return { highlight, setHighlight, handleKeyDown };
}

export interface SuggestionDropdownProps {
	groups: FilteredSuggestionGroup[];
	highlight: number;
	onHighlightChange: (index: number) => void;
	onSelect: (entry: SuggestionEntry) => void;
	className?: string;
}

export const SuggestionDropdown = ({
	groups,
	highlight,
	onHighlightChange,
	onSelect,
	className
}: SuggestionDropdownProps) => {
	const listRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		listRef.current
			?.querySelector('[data-highlighted="true"]')
			?.scrollIntoView({ block: 'nearest' });
	}, [highlight]);

	if (!groups.length) return null;

	let flatIndex = -1;

	return (
		<div
			ref={listRef}
			className={cn(
				'absolute left-0 right-0 top-[calc(100%+4px)] z-40 max-h-72 overflow-y-auto rounded-lg border border-border-primary bg-white py-1 shadow-popover',
				className
			)}
			role="listbox"
		>
			{groups.map((group) => (
				<div key={group.label}>
					{group.label ? (
						<div className="border-y border-border-primary bg-bg-body px-3 py-1.5 text-xs font-medium text-text-menu first:border-t-0">
							{group.label}
						</div>
					) : null}
					<ul className="p-1">
						{group.entries.map((entry) => {
							flatIndex++;
							const index = flatIndex;
							const isHighlighted = index === highlight;

							return (
								<li
									key={`${entry.kind}-${entry.insertText}`}
									role="option"
									aria-selected={isHighlighted}
									data-highlighted={isHighlighted}
									className={cn(
										'flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-xs',
										isHighlighted && 'bg-primary-wash text-primary'
									)}
									onMouseEnter={() => onHighlightChange(index)}
									onMouseDown={(event) => {
										event.preventDefault();
										onSelect(entry);
									}}
								>
									<span
										className={cn(
											'max-w-[18rem] truncate rounded px-1 py-0.5 font-medium',
											group.badgeClassName ?? 'bg-badge-0'
										)}
									>
										{entry.display}
									</span>
									{entry.kind === 'key' ? (
										<span className="ml-auto shrink-0 text-text-menu">
											{entry.valueCount} values…
										</span>
									) : null}
								</li>
							);
						})}
					</ul>
				</div>
			))}
		</div>
	);
};
