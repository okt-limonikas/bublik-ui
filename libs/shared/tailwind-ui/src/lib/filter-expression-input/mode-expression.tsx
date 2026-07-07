/* SPDX-License-Identifier: Apache-2.0 */
/* SPDX-FileCopyrightText: 2024-2026 OKTET LTD */
import {
	ChangeEvent,
	KeyboardEvent,
	SyntheticEvent,
	useEffect,
	useMemo,
	useRef,
	useState
} from 'react';

import {
	ExprError,
	ExprGrammar,
	debounce,
	parseExpression
} from '@/shared/utils';

import { Icon } from '../icon';
import { cn } from '../utils';
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

export interface ModeExpressionProps {
	expression: string;
	onExpressionChange: (expression: string) => void;
	suggestions: SuggestionGroup[];
	grammar: ExprGrammar;
	placeholder?: string;
	disabled?: boolean;
	name?: string;
	onValidate?: (errors: ExprError[]) => void;
	inputRef: React.RefObject<HTMLInputElement>;
}

export const ModeExpression = ({
	expression,
	onExpressionChange,
	suggestions,
	grammar,
	placeholder,
	disabled,
	name,
	onValidate,
	inputRef
}: ModeExpressionProps) => {
	const [caret, setCaret] = useState(expression.length);
	const [isPopoverOpen, setIsPopoverOpen] = useState(false);
	const [errors, setErrors] = useState<ExprError[]>([]);
	const onValidateRef = useRef(onValidate);

	onValidateRef.current = onValidate;

	const validate = useMemo(
		() =>
			debounce((value: string) => {
				const result = parseExpression(value, grammar).errors;

				setErrors(result);
				onValidateRef.current?.(result);
			}, 150),
		[grammar]
	);

	useEffect(() => {
		validate(expression);
		return () => validate.cancel();
	}, [expression, validate]);

	const context = getSuggestionContext(expression, caret);
	const filteredGroups = useMemo(
		() =>
			context.query.length > 0
				? filterSuggestions(suggestions, context)
				: [],
		[suggestions, context]
	);

	const isDropdownVisible = isPopoverOpen && filteredGroups.length > 0;

	const handleAccept = (entry: SuggestionEntry) => {
		const { start, end } = context.replaceSpan;
		const next =
			expression.slice(0, start) + entry.insertText + expression.slice(end);
		const nextCaret = start + entry.insertText.length;

		onExpressionChange(next);
		setCaret(nextCaret);
		setIsPopoverOpen(true);
		queueMicrotask(() => {
			inputRef.current?.focus();
			inputRef.current?.setSelectionRange(nextCaret, nextCaret);
		});
	};

	const { highlight, setHighlight, handleKeyDown: handleNavigationKeyDown } =
		useSuggestionNavigation({
			groups: filteredGroups,
			isOpen: isDropdownVisible,
			onAccept: handleAccept,
			onClose: () => setIsPopoverOpen(false)
		});

	const syncCaret = (event: SyntheticEvent<HTMLInputElement>) => {
		setCaret(event.currentTarget.selectionStart ?? 0);
	};

	const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
		onExpressionChange(event.target.value);
		setCaret(event.target.selectionStart ?? event.target.value.length);
		setIsPopoverOpen(true);
	};

	const handleKeyDown = (event: KeyboardEvent) => {
		handleNavigationKeyDown(event);
	};

	const firstError = errors[0];
	const isValid = !firstError && expression.trim().length > 0;

	return (
		<>
			<div className="flex items-center flex-grow h-full">
				<input
					className="flex w-full outline-none placeholder:font-normal disabled:bg-bg-body pr-2 pl-4 py-2 cursor-[inherit] bg-transparent placeholder:text-text-menu border-none text-text-secondary leading-[1.5rem] font-medium text-[0.875rem] font-mono focus:ring-transparent"
					value={expression}
					onChange={handleChange}
					onKeyDown={handleKeyDown}
					onKeyUp={syncCaret}
					onClick={syncCaret}
					onFocus={(event) => {
						syncCaret(event);
						setIsPopoverOpen(true);
					}}
					onBlur={() => setIsPopoverOpen(false)}
					placeholder={placeholder}
					ref={inputRef}
					disabled={disabled}
					name={name}
					autoComplete="off"
					spellCheck={false}
				/>
				{expression.trim().length > 0 ? (
					<div
						className={cn(
							'grid place-items-center pr-2',
							isValid ? 'text-text-expected' : 'text-text-unexpected'
						)}
					>
						<Icon
							name={isValid ? 'InformationCircleCheckmark' : 'TriangleExclamationMark'}
							size={16}
						/>
					</div>
				) : null}
			</div>
			{isDropdownVisible ? (
				<SuggestionDropdown
					groups={filteredGroups}
					highlight={highlight}
					onHighlightChange={setHighlight}
					onSelect={handleAccept}
				/>
			) : null}
			{firstError ? (
				<div className="absolute left-0 top-[calc(100%+2px)] z-10 text-xs text-text-unexpected">
					{firstError.message}
					{firstError.start < expression.length
						? ` (at position ${firstError.start + 1})`
						: ''}
				</div>
			) : null}
		</>
	);
};
