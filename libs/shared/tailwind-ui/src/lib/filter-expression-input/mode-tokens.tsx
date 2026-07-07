/* SPDX-License-Identifier: Apache-2.0 */
/* SPDX-FileCopyrightText: 2024-2026 OKTET LTD */
import {
	ChangeEvent,
	KeyboardEvent,
	useCallback,
	useMemo,
	useState
} from 'react';
import { nanoid } from '@reduxjs/toolkit';

import {
	DEFAULT_KEY_VALUE_DISPLAY_DELIMITER,
	DEFAULT_KEY_VALUE_SUBMIT_DELIMITER,
	formatKeyValueForDisplay,
	normalizeKeyValueForSubmit
} from '@/shared/utils';

import { BadgeItem, parseBadgeString } from '../badge-input';
import { BadgeInputContext } from '../badge-input/context';
import { BadgeList } from '../badge-input/badge-list';
import {
	SuggestionDropdown,
	useSuggestionNavigation
} from './suggestion-popover';
import {
	SuggestionEntry,
	filterSuggestions,
	getSuggestionContext
} from './use-suggestion-context';
import { SuggestionGroup } from './filter-expression-input.types';

export interface ModeTokensProps {
	badges: BadgeItem[];
	onBadgesChange: (badges: BadgeItem[]) => void;
	suggestions: SuggestionGroup[];
	placeholder?: string;
	disabled?: boolean;
	name?: string;
	label?: string;
	keyValueDisplayDelimiter?: string;
	keyValueSubmitDelimiter?: string;
	inputRef: React.RefObject<HTMLInputElement>;
}

export const ModeTokens = ({
	badges,
	onBadgesChange,
	suggestions,
	placeholder,
	disabled,
	name,
	label,
	keyValueDisplayDelimiter,
	keyValueSubmitDelimiter,
	inputRef
}: ModeTokensProps) => {
	const [value, setValue] = useState('');
	const [isKeyReleased, setIsKeyReleased] = useState(false);
	const [isPopoverOpen, setIsPopoverOpen] = useState(false);

	const formatBadgeValueForInput = useCallback(
		(badgeValue: string) =>
			formatKeyValueForDisplay(badgeValue, {
				displayDelimiter: keyValueDisplayDelimiter,
				submitDelimiter: keyValueSubmitDelimiter
			}),
		[keyValueDisplayDelimiter, keyValueSubmitDelimiter]
	);

	const normalizedValue = normalizeKeyValueForSubmit(value, {
		displayDelimiter: keyValueDisplayDelimiter,
		submitDelimiter: keyValueSubmitDelimiter
	});

	const filteredGroups = useMemo(() => {
		const context = getSuggestionContext(
			normalizedValue,
			normalizedValue.length
		);
		const excluded = new Set(badges.map((badge) => badge.value));

		return filterSuggestions(suggestions, context, excluded);
	}, [normalizedValue, suggestions, badges]);

	const isDropdownVisible = isPopoverOpen && filteredGroups.length > 0;

	const commitBadges = (values: string[]) => {
		const existing = new Set(badges.map((badge) => badge.value));
		const parsed: BadgeItem[] = values
			.filter((badgeValue) => !existing.has(badgeValue))
			.map((badgeValue) => ({ id: nanoid(4), value: badgeValue }));

		if (parsed.length) onBadgesChange([...badges, ...parsed]);
		setValue('');
	};

	const handleAccept = (entry: SuggestionEntry) => {
		if (entry.kind === 'key') {
			setValue(formatBadgeValueForInput(entry.insertText));
			setIsPopoverOpen(true);
			queueMicrotask(() => inputRef.current?.focus());
			return;
		}

		commitBadges([entry.insertText]);
		queueMicrotask(() => inputRef.current?.focus());
	};

	const { highlight, setHighlight, handleKeyDown: handleNavigationKeyDown } =
		useSuggestionNavigation({
			groups: filteredGroups,
			isOpen: isDropdownVisible,
			onAccept: handleAccept,
			onClose: () => setIsPopoverOpen(false)
		});

	const handleKeyDown = (e: KeyboardEvent) => {
		if (handleNavigationKeyDown(e)) return;

		const { key } = e;
		const input = value.trim();

		if (
			key === 'Enter' &&
			input.length &&
			!badges.some((badge) => badge.value === input)
		) {
			e.preventDefault();

			const parsedConfig = {
				separator: ',',
				displayDelimiter:
					keyValueDisplayDelimiter ?? DEFAULT_KEY_VALUE_DISPLAY_DELIMITER,
				submitDelimiter:
					keyValueSubmitDelimiter ?? DEFAULT_KEY_VALUE_SUBMIT_DELIMITER
			};

			commitBadges(parseBadgeString(input, parsedConfig));
		}

		if (key === 'Backspace' && !value.length && badges.length && isKeyReleased) {
			e.preventDefault();

			const badgesCopy = [...badges];
			const poppedBadge = badgesCopy.pop();

			setValue(poppedBadge ? formatBadgeValueForInput(poppedBadge.value) : '');
			onBadgesChange(badgesCopy);
		}

		setIsKeyReleased(false);
	};

	const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
		setValue(e.target.value);
		setIsPopoverOpen(true);
	};

	const handleBadgeEdit = useCallback(
		(badgeToEdit: BadgeItem) => {
			setValue(formatBadgeValueForInput(badgeToEdit.value));
			onBadgesChange(badges.filter((badge) => badge.id !== badgeToEdit.id));
			queueMicrotask(() => inputRef.current?.focus());
		},
		[onBadgesChange, badges, formatBadgeValueForInput, inputRef]
	);

	const handleBadgeDeleteClick = useCallback(
		(idOfBadgeToDelete: string) => {
			onBadgesChange(badges.filter((badge) => badge.id !== idOfBadgeToDelete));
		},
		[onBadgesChange, badges]
	);

	const contextValue = useMemo<BadgeInputContext>(
		() => ({
			onBadgeEdit: handleBadgeEdit,
			onDeleteClick: handleBadgeDeleteClick
		}),
		[handleBadgeDeleteClick, handleBadgeEdit]
	);

	return (
		<BadgeInputContext.Provider value={contextValue}>
			<div className="flex flex-wrap flex-grow h-full">
				{!disabled ? (
					<BadgeList
						label={label}
						badges={badges}
						keyValueDisplayDelimiter={keyValueDisplayDelimiter}
						keyValueSubmitDelimiter={keyValueSubmitDelimiter}
					/>
				) : null}
				<input
					className="flex w-full outline-none placeholder:font-normal disabled:bg-bg-body pr-2 pl-4 py-2 cursor-[inherit] bg-transparent placeholder:text-text-menu border-none text-text-secondary leading-[1.5rem] font-medium text-[0.875rem] focus:ring-transparent"
					value={value}
					id={label}
					onChange={handleChange}
					onKeyDown={handleKeyDown}
					onKeyUp={() => setIsKeyReleased(true)}
					onFocus={() => setIsPopoverOpen(true)}
					onBlur={() => setIsPopoverOpen(false)}
					placeholder={placeholder}
					ref={inputRef}
					disabled={disabled}
					name={name}
					autoComplete="off"
				/>
			</div>
			{isDropdownVisible ? (
				<SuggestionDropdown
					groups={filteredGroups}
					highlight={highlight}
					onHighlightChange={setHighlight}
					onSelect={handleAccept}
				/>
			) : null}
		</BadgeInputContext.Provider>
	);
};
