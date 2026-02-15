/* SPDX-License-Identifier: Apache-2.0 */
/* SPDX-FileCopyrightText: 2024-2026 OKTET LTD */
import {
	ChangeEvent,
	FocusEvent,
	KeyboardEvent,
	RefObject,
	forwardRef,
	useEffect,
	useId,
	useMemo,
	useRef,
	useState
} from 'react';
import { nanoid } from '@reduxjs/toolkit';
import { mergeRefs } from '@react-aria/utils';

import { useClickOutside, useControllableState } from '@/shared/hooks';

import {
	BadgeQueryBuilderState,
	BadgeQueryInputProps,
	BadgeQueryValue
} from './types';
import {
	buildExpressionFromBadges,
	buildExpressionFromBuilder,
	createBadgeQueryValue,
	dedupeBadges,
	getExpressionValidationError,
	normalizeBadgeQueryValue,
	parseFlatBuilderExpression
} from './utils';
import { cn } from '../utils';
import { ErrorMessage } from '../error-message';
import { Icon } from '../icon';
import { InputLabel } from '../input-label';

type ResolvedOption = {
	key: string;
	sectionId: string;
	sectionLabel: string;
	value: string;
	label: string;
	badgeClassName?: string;
};

const modeLabels: Record<BadgeQueryValue['mode'], string> = {
	simple: 'Simple',
	builder: 'Builder',
	raw: 'Raw'
};

const defaultExpressionPlaceholder = {
	tag: 'tag_a & !tag_b',
	label: 'label_a | label_b',
	branch: 'master | stable',
	revision: 'commit_hash & !another_hash',
	test_argument: 'argument1 != 5 & argument2 >= 10',
	verdict: 'None | "Unexpectedly failed"'
} as const;

const createBuilderStateFromValue = (
	value: BadgeQueryValue,
	expressionType: NonNullable<BadgeQueryInputProps['expressionType']>
) => {
	const parsedExpression = parseFlatBuilderExpression(
		value.expression,
		expressionType
	);

	if (parsedExpression) {
		return {
			state: parsedExpression,
			notice: undefined
		};
	}

	const fallbackState: BadgeQueryBuilderState = {
		operator: '&',
		rules: value.badges.map((badge) => ({
			id: badge.id,
			value: badge.value,
			negated: false
		}))
	};

	if (!value.expression.trim().length) {
		return { state: fallbackState, notice: undefined };
	}

	return {
		state: fallbackState,
		notice:
			'Current expression cannot be displayed in Builder mode. Use Raw mode for mixed operators and nested groups.'
	};
};

const normalizeBuilderRuleValue = (
	value: string,
	expressionType: NonNullable<BadgeQueryInputProps['expressionType']>
) => {
	const trimmed = value.trim();
	if (!trimmed.length) return '';

	if (expressionType !== 'verdict') return trimmed;
	if (trimmed === 'None') return 'None';

	if (trimmed.startsWith('"') && trimmed.endsWith('"')) return trimmed;

	return `"${trimmed.replace(/"/g, '')}"`;
};

export const BadgeQueryInput = forwardRef<
	HTMLInputElement,
	BadgeQueryInputProps
>((props, ref) => {
	const {
		label,
		name,
		placeholder,
		disabled,
		icon,
		trailingContent,
		error,
		sections = [],
		value,
		defaultValue,
		onValueChange,
		onBlur,
		allowCustomValues = true,
		customValueValidator,
		expressionType = 'tag',
		showModeToggle = true
	} = props;

	const [stateValue = createBadgeQueryValue(), setStateValue] =
		useControllableState<BadgeQueryValue>({
			prop: value,
			defaultProp: defaultValue,
			onChange: onValueChange
		});

	const queryValue = useMemo(
		() => normalizeBadgeQueryValue(stateValue, expressionType),
		[stateValue, expressionType]
	);

	const setQueryValue = (
		nextValue:
			| BadgeQueryValue
			| ((currentValue: BadgeQueryValue) => BadgeQueryValue)
	) => {
		setStateValue((previousState) => {
			const previousValue = normalizeBadgeQueryValue(
				previousState,
				expressionType
			);
			const resolvedValue =
				typeof nextValue === 'function' ? nextValue(previousValue) : nextValue;

			return normalizeBadgeQueryValue(resolvedValue, expressionType);
		});
	};

	const [inputValue, setInputValue] = useState('');
	const [isAutocompleteOpen, setIsAutocompleteOpen] = useState(false);
	const [activeOptionKey, setActiveOptionKey] = useState<string | null>(null);

	const initialBuilderState = useMemo(
		() => createBuilderStateFromValue(queryValue, expressionType),
		// This memo is used for initial state only.
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[]
	);

	const [builderState, setBuilderState] = useState<BadgeQueryBuilderState>(
		initialBuilderState.state
	);
	const [builderNotice, setBuilderNotice] = useState<string | undefined>(
		initialBuilderState.notice
	);

	const inputRef = useRef<HTMLInputElement>(null);
	const clickOutsideRef = useClickOutside<HTMLDivElement>(() => {
		setIsAutocompleteOpen(false);
	});

	const inputId = useId();
	const resolvedInputId = name || inputId;

	const selectedValues = useMemo(
		() => new Set(queryValue.badges.map((badge) => badge.value)),
		[queryValue.badges]
	);

	const resolvedOptions = useMemo<ResolvedOption[]>(() => {
		const loweredFilter = inputValue.trim().toLowerCase();
		const options: ResolvedOption[] = [];

		for (const section of sections) {
			for (const option of section.options) {
				const optionLabel = option.label || option.value;
				const searchableFields = [
					option.value,
					optionLabel,
					...(option.keywords || [])
				]
					.join(' ')
					.toLowerCase();

				if (loweredFilter.length && !searchableFields.includes(loweredFilter)) {
					continue;
				}

				options.push({
					key: `${section.id}:${option.value}`,
					sectionId: section.id,
					sectionLabel: section.label,
					value: option.value,
					label: optionLabel,
					badgeClassName: option.badgeClassName || section.badgeClassName
				});
			}
		}

		return options;
	}, [inputValue, sections]);

	const groupedOptions = useMemo(() => {
		const grouped = new Map<
			string,
			{ label: string; options: ResolvedOption[] }
		>();

		for (const option of resolvedOptions) {
			if (!grouped.has(option.sectionId)) {
				grouped.set(option.sectionId, {
					label: option.sectionLabel,
					options: []
				});
			}

			grouped.get(option.sectionId)?.options.push(option);
		}

		return grouped;
	}, [resolvedOptions]);

	const canCreateCustomValue = useMemo(() => {
		if (!allowCustomValues || disabled) return false;

		const trimmed = inputValue.trim();
		if (!trimmed.length) return false;
		if (selectedValues.has(trimmed)) return false;

		if (customValueValidator) {
			return customValueValidator(trimmed);
		}

		return true;
	}, [
		allowCustomValues,
		customValueValidator,
		disabled,
		inputValue,
		selectedValues
	]);

	const activeOption = useMemo(
		() => resolvedOptions.find((option) => option.key === activeOptionKey),
		[activeOptionKey, resolvedOptions]
	);

	const expressionValidationError = useMemo(() => {
		if (queryValue.mode === 'simple') return undefined;

		return getExpressionValidationError(queryValue.expression, expressionType);
	}, [expressionType, queryValue.expression, queryValue.mode]);

	const builderValidationError = useMemo(() => {
		if (queryValue.mode !== 'builder') return undefined;

		for (const rule of builderState.rules) {
			if (!rule.value.trim().length) {
				return 'Builder condition cannot be empty.';
			}

			const normalizedTerm = normalizeBuilderRuleValue(
				rule.value,
				expressionType
			);

			if (!normalizedTerm.length) {
				return 'Builder condition cannot be empty.';
			}
		}

		return undefined;
	}, [builderState.rules, expressionType, queryValue.mode]);

	const finalError =
		error || builderValidationError || expressionValidationError;

	useEffect(() => {
		if (queryValue.mode !== 'builder') return;

		const currentBuilderExpression = buildExpressionFromBuilder(
			builderState,
			expressionType
		);

		if (currentBuilderExpression === queryValue.expression) {
			return;
		}

		const nextBuilderState = createBuilderStateFromValue(
			{
				mode: queryValue.mode,
				expression: queryValue.expression,
				badges: queryValue.badges
			},
			expressionType
		);

		setBuilderState(nextBuilderState.state);
		setBuilderNotice(nextBuilderState.notice);
	}, [
		builderState,
		expressionType,
		queryValue.badges,
		queryValue.expression,
		queryValue.mode
	]);

	useEffect(() => {
		if (!resolvedOptions.length) {
			setActiveOptionKey(null);
			return;
		}

		if (!activeOptionKey) {
			setActiveOptionKey(resolvedOptions[0].key);
			return;
		}

		if (!resolvedOptions.some((option) => option.key === activeOptionKey)) {
			setActiveOptionKey(resolvedOptions[0].key);
		}
	}, [activeOptionKey, resolvedOptions]);

	const updateBadges = (nextBadges: BadgeQueryValue['badges']) => {
		const dedupedBadges = dedupeBadges(nextBadges);

		setQueryValue((previousValue) => {
			if (previousValue.mode !== 'simple') {
				return { ...previousValue, badges: dedupedBadges };
			}

			return {
				...previousValue,
				badges: dedupedBadges,
				expression: buildExpressionFromBadges(dedupedBadges, expressionType)
			};
		});
	};

	const handleOptionSelect = (option: ResolvedOption) => {
		if (selectedValues.has(option.value)) {
			setInputValue('');
			setIsAutocompleteOpen(false);
			return;
		}

		updateBadges([
			...queryValue.badges,
			{
				id: nanoid(6),
				value: option.value,
				label: option.label,
				sectionId: option.sectionId,
				badgeClassName: option.badgeClassName
			}
		]);

		setInputValue('');
		setIsAutocompleteOpen(false);
	};

	const handleCreateCustomValue = () => {
		const customValue = inputValue.trim();
		if (!canCreateCustomValue || !customValue.length) return;

		updateBadges([
			...queryValue.badges,
			{
				id: nanoid(6),
				value: customValue,
				label: customValue,
				isCustom: true
			}
		]);

		setInputValue('');
		setIsAutocompleteOpen(false);
	};

	const handleBadgeDelete = (idToDelete: string) => {
		updateBadges(queryValue.badges.filter((badge) => badge.id !== idToDelete));
	};

	const handleInputKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
		if (disabled) return;

		if (event.key === 'ArrowDown') {
			event.preventDefault();
			setIsAutocompleteOpen(true);

			if (!resolvedOptions.length) return;

			if (!activeOption) {
				setActiveOptionKey(resolvedOptions[0].key);
				return;
			}

			const activeIndex = resolvedOptions.findIndex(
				(option) => option.key === activeOption.key
			);
			const nextIndex = (activeIndex + 1) % resolvedOptions.length;
			setActiveOptionKey(resolvedOptions[nextIndex].key);
			return;
		}

		if (event.key === 'ArrowUp') {
			event.preventDefault();
			setIsAutocompleteOpen(true);

			if (!resolvedOptions.length) return;

			if (!activeOption) {
				setActiveOptionKey(resolvedOptions.at(-1)?.key || null);
				return;
			}

			const activeIndex = resolvedOptions.findIndex(
				(option) => option.key === activeOption.key
			);
			const nextIndex =
				(activeIndex - 1 + resolvedOptions.length) % resolvedOptions.length;
			setActiveOptionKey(resolvedOptions[nextIndex].key);
			return;
		}

		if (event.key === 'Escape') {
			event.preventDefault();
			setIsAutocompleteOpen(false);
			return;
		}

		if (event.key === 'Backspace' && !inputValue.length) {
			const lastBadge = queryValue.badges.at(-1);
			if (!lastBadge) return;

			event.preventDefault();
			handleBadgeDelete(lastBadge.id);
			return;
		}

		if (event.key === 'Enter' || event.key === ',') {
			event.preventDefault();

			if (activeOption) {
				handleOptionSelect(activeOption);
				return;
			}

			handleCreateCustomValue();
		}
	};

	const handleInputChange = (event: ChangeEvent<HTMLInputElement>) => {
		setInputValue(event.target.value);
		setIsAutocompleteOpen(true);
	};

	const handleModeChange = (mode: BadgeQueryValue['mode']) => {
		if (disabled) return;
		if (mode === queryValue.mode) return;

		if (mode === 'simple') {
			setQueryValue({
				...queryValue,
				mode,
				expression: buildExpressionFromBadges(queryValue.badges, expressionType)
			});
			setBuilderNotice(undefined);
			return;
		}

		if (mode === 'builder') {
			const nextBuilderState = createBuilderStateFromValue(
				{
					mode: queryValue.mode,
					expression: queryValue.expression,
					badges: queryValue.badges
				},
				expressionType
			);

			setBuilderState(nextBuilderState.state);
			setBuilderNotice(nextBuilderState.notice);

			setQueryValue({
				...queryValue,
				mode,
				expression: buildExpressionFromBuilder(
					nextBuilderState.state,
					expressionType
				)
			});
			return;
		}

		setQueryValue({ ...queryValue, mode });
		setBuilderNotice(undefined);
	};

	const handleBuilderOperatorChange = (
		operator: BadgeQueryBuilderState['operator']
	) => {
		if (disabled) return;

		const nextBuilderState = {
			...builderState,
			operator
		};

		setBuilderState(nextBuilderState);
		setBuilderNotice(undefined);

		setQueryValue({
			...queryValue,
			mode: 'builder',
			expression: buildExpressionFromBuilder(nextBuilderState, expressionType)
		});
	};

	const handleBuilderRuleChange = (ruleId: string, nextRuleValue: string) => {
		if (disabled) return;

		const nextBuilderState = {
			...builderState,
			rules: builderState.rules.map((rule) =>
				rule.id === ruleId ? { ...rule, value: nextRuleValue } : rule
			)
		};

		setBuilderState(nextBuilderState);

		setQueryValue({
			...queryValue,
			mode: 'builder',
			expression: buildExpressionFromBuilder(nextBuilderState, expressionType)
		});
	};

	const handleBuilderRuleNegation = (ruleId: string) => {
		if (disabled) return;

		const nextBuilderState = {
			...builderState,
			rules: builderState.rules.map((rule) =>
				rule.id === ruleId ? { ...rule, negated: !rule.negated } : rule
			)
		};

		setBuilderState(nextBuilderState);

		setQueryValue({
			...queryValue,
			mode: 'builder',
			expression: buildExpressionFromBuilder(nextBuilderState, expressionType)
		});
	};

	const handleBuilderRuleDelete = (ruleId: string) => {
		if (disabled) return;

		const nextBuilderState = {
			...builderState,
			rules: builderState.rules.filter((rule) => rule.id !== ruleId)
		};

		setBuilderState(nextBuilderState);

		setQueryValue({
			...queryValue,
			mode: 'builder',
			expression: buildExpressionFromBuilder(nextBuilderState, expressionType)
		});
	};

	const handleBuilderRuleAdd = () => {
		if (disabled) return;

		const nextBuilderState = {
			...builderState,
			rules: [
				...builderState.rules,
				{ id: nanoid(6), value: '', negated: false }
			]
		};

		setBuilderState(nextBuilderState);
	};

	const handleRawExpressionChange = (
		event: ChangeEvent<HTMLTextAreaElement>
	) => {
		if (disabled) return;

		setQueryValue({
			...queryValue,
			mode: 'raw',
			expression: event.target.value
		});
	};

	const handleRootBlur = (event: FocusEvent<HTMLDivElement>) => {
		const nextFocusedElement = event.relatedTarget as Node | null;
		if (event.currentTarget.contains(nextFocusedElement)) return;

		onBlur?.();
		setIsAutocompleteOpen(false);
	};

	const shouldShowAutocomplete =
		isAutocompleteOpen &&
		!disabled &&
		(resolvedOptions.length > 0 || canCreateCustomValue);

	const expressionPreview =
		queryValue.mode === 'simple'
			? buildExpressionFromBadges(queryValue.badges, expressionType)
			: queryValue.expression;

	return (
		<div
			className="relative"
			ref={clickOutsideRef as unknown as RefObject<HTMLDivElement>}
			onBlurCapture={handleRootBlur}
		>
			<div
				className={cn(
					'relative flex min-h-[40px] w-full items-center rounded-md border border-border-primary bg-white transition-all hover:border-primary',
					'data-[disabled=true]:cursor-not-allowed data-[disabled=true]:bg-bg-body data-[disabled=true]:hover:border-border-primary',
					finalError &&
						'border-bg-error shadow-text-field-error hover:border-bg-error',
					disabled &&
						'cursor-not-allowed border-border-primary bg-bg-body hover:border-border-primary'
				)}
				onClick={() => {
					if (disabled) return;
					inputRef.current?.focus();
				}}
				data-disabled={Boolean(disabled)}
				data-testid="tw-badge-query-input"
			>
				{label ? (
					<InputLabel
						className="absolute -top-3 left-2 h-3 bg-white"
						htmlFor={resolvedInputId}
					>
						{label}
					</InputLabel>
				) : null}
				{icon ? (
					<div className="grid place-items-center pl-2 text-primary">
						{icon}
					</div>
				) : null}

				<div className="flex min-h-[40px] flex-grow flex-wrap items-center gap-1 py-1 pl-2 pr-2">
					{queryValue.badges.map((badge) => (
						<span
							key={badge.id}
							className={cn(
								'inline-flex items-center gap-1 rounded px-2 py-0.5 text-[0.75rem] font-medium leading-[1.125rem]',
								badge.badgeClassName || 'bg-badge-0'
							)}
						>
							<span>{badge.label || badge.value}</span>
							<button
								type="button"
								onClick={(event) => {
									event.stopPropagation();
									handleBadgeDelete(badge.id);
								}}
								className={cn(
									'grid h-4 w-4 place-items-center rounded transition-colors hover:bg-black/10',
									disabled && 'pointer-events-none opacity-50'
								)}
								disabled={disabled}
							>
								<Icon name="CrossSimple" size={14} />
							</button>
						</span>
					))}

					<input
						id={resolvedInputId}
						name={name}
						className="min-w-[180px] flex-grow border-none bg-transparent py-1 text-[0.875rem] font-medium leading-[1.5rem] text-text-secondary outline-none placeholder:text-text-menu focus:ring-transparent"
						placeholder={placeholder}
						value={inputValue}
						onChange={handleInputChange}
						onKeyDown={handleInputKeyDown}
						onFocus={() => {
							if (disabled) return;
							setIsAutocompleteOpen(true);
						}}
						autoComplete="off"
						spellCheck={false}
						disabled={disabled}
						ref={mergeRefs(inputRef, ref)}
					/>
				</div>

				{showModeToggle ? (
					<div className="flex h-full items-center border-l border-border-primary px-1.5">
						{(['simple', 'builder', 'raw'] as BadgeQueryValue['mode'][]).map(
							(mode) => (
								<button
									key={mode}
									type="button"
									onClick={() => handleModeChange(mode)}
									className={cn(
										'rounded px-2 py-1 text-[0.6875rem] font-semibold leading-[0.875rem] transition-colors',
										queryValue.mode === mode
											? 'bg-primary-wash text-primary'
											: 'text-text-menu hover:bg-primary-wash hover:text-primary',
										disabled && 'pointer-events-none opacity-50'
									)}
									aria-pressed={queryValue.mode === mode}
									disabled={disabled}
								>
									{modeLabels[mode]}
								</button>
							)
						)}
					</div>
				) : null}

				{trailingContent ? (
					<div className="flex h-full shrink-0 items-center border-l border-border-primary px-1.5">
						{trailingContent}
					</div>
				) : null}
			</div>

			{shouldShowAutocomplete ? (
				<div className="absolute z-50 mt-1 max-h-72 w-full overflow-y-auto rounded-md border border-border-primary bg-white py-1 shadow-popover">
					{Array.from(groupedOptions.entries()).map(([groupId, groupValue]) => (
						<div key={groupId} className="pt-1">
							<div className="px-3 py-1 text-[0.6875rem] font-semibold uppercase tracking-[0.02em] text-text-menu">
								{groupValue.label}
							</div>
							{groupValue.options.map((option) => {
								const isSelected = selectedValues.has(option.value);
								const isActive = option.key === activeOptionKey;

								return (
									<button
										key={option.key}
										type="button"
										onMouseDown={(event) => {
											event.preventDefault();
											handleOptionSelect(option);
										}}
										onMouseEnter={() => setActiveOptionKey(option.key)}
										className={cn(
											'flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-[0.8125rem] leading-5 text-text-secondary transition-colors',
											isActive && 'bg-primary-wash text-primary'
										)}
									>
										<div className="flex min-w-0 items-center gap-2">
											<span
												className={cn(
													'h-2 w-2 shrink-0 rounded-full bg-border-primary',
													option.badgeClassName
												)}
											/>
											<span className="truncate">{option.label}</span>
										</div>
										{isSelected ? <Icon name="BoxCheckmark" size={14} /> : null}
									</button>
								);
							})}
						</div>
					))}
					{canCreateCustomValue ? (
						<button
							type="button"
							onMouseDown={(event) => {
								event.preventDefault();
								handleCreateCustomValue();
							}}
							className="flex w-full items-center gap-2 border-t border-border-primary px-3 py-2 text-left text-[0.8125rem] leading-5 text-primary"
						>
							<Icon name="AddSymbol" size={14} />
							<span className="truncate">
								Create custom value: {inputValue.trim()}
							</span>
						</button>
					) : null}
				</div>
			) : null}

			{queryValue.mode === 'simple' ? (
				<div className="mt-1 px-1 text-[0.6875rem] leading-4 text-text-menu">
					Expression preview: {expressionPreview || 'None'}
				</div>
			) : null}

			{queryValue.mode === 'builder' ? (
				<div className="mt-2 rounded-md border border-border-primary bg-white p-3">
					{builderNotice ? (
						<div className="mb-2 rounded bg-primary-wash px-2 py-1 text-[0.6875rem] leading-4 text-primary">
							{builderNotice}
						</div>
					) : null}
					<div className="mb-3 flex items-center justify-between">
						<span className="text-[0.75rem] font-semibold text-text-menu">
							Match conditions using
						</span>
						<div className="flex items-center gap-1">
							{(['&', '|'] as const).map((operator) => (
								<button
									key={operator}
									type="button"
									onClick={() => handleBuilderOperatorChange(operator)}
									className={cn(
										'rounded px-2 py-1 text-[0.6875rem] font-semibold leading-[0.875rem] transition-colors',
										builderState.operator === operator
											? 'bg-primary-wash text-primary'
											: 'text-text-menu hover:bg-primary-wash hover:text-primary'
									)}
									disabled={disabled}
								>
									{operator === '&' ? 'AND' : 'OR'}
								</button>
							))}
						</div>
					</div>

					<div className="space-y-2">
						{builderState.rules.map((rule, index) => (
							<div key={rule.id} className="flex items-center gap-2">
								{index === 0 ? (
									<span className="w-9 text-center text-[0.6875rem] font-semibold text-text-menu">
										IF
									</span>
								) : (
									<span className="w-9 text-center text-[0.6875rem] font-semibold text-text-menu">
										{builderState.operator === '&' ? 'AND' : 'OR'}
									</span>
								)}
								<button
									type="button"
									onClick={() => handleBuilderRuleNegation(rule.id)}
									className={cn(
										'rounded border px-2 py-1 text-[0.6875rem] font-semibold leading-[0.875rem] transition-colors',
										rule.negated
											? 'border-primary bg-primary-wash text-primary'
											: 'border-border-primary text-text-menu hover:border-primary hover:text-primary'
									)}
									disabled={disabled}
								>
									NOT
								</button>
								<input
									type="text"
									className="h-8 flex-grow rounded border border-border-primary px-2 text-[0.75rem] leading-[1rem] outline-none focus:border-primary focus:shadow-text-field"
									value={rule.value}
									onChange={(event) =>
										handleBuilderRuleChange(rule.id, event.target.value)
									}
									placeholder={defaultExpressionPlaceholder[expressionType]}
									disabled={disabled}
								/>
								<button
									type="button"
									onClick={() => handleBuilderRuleDelete(rule.id)}
									className="grid h-7 w-7 place-items-center rounded text-text-menu transition-colors hover:bg-primary-wash hover:text-primary"
									disabled={disabled}
								>
									<Icon name="CrossSimple" size={16} />
								</button>
							</div>
						))}
					</div>

					<button
						type="button"
						onClick={handleBuilderRuleAdd}
						className="mt-3 inline-flex items-center gap-1 rounded px-2 py-1 text-[0.6875rem] font-semibold leading-[0.875rem] text-primary transition-colors hover:bg-primary-wash"
						disabled={disabled}
					>
						<Icon name="AddSymbol" size={14} />
						Add condition
					</button>
				</div>
			) : null}

			{queryValue.mode === 'raw' ? (
				<div className="mt-2 rounded-md border border-border-primary bg-white p-2">
					<textarea
						className="min-h-[84px] w-full resize-y rounded border border-border-primary p-2 text-[0.75rem] leading-[1rem] outline-none focus:border-primary focus:shadow-text-field"
						value={queryValue.expression}
						onChange={handleRawExpressionChange}
						placeholder={defaultExpressionPlaceholder[expressionType]}
						disabled={disabled}
					/>
				</div>
			) : null}

			{finalError ? <ErrorMessage>{finalError}</ErrorMessage> : null}
		</div>
	);
});
