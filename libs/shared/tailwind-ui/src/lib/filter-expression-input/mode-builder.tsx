/* SPDX-License-Identifier: Apache-2.0 */
/* SPDX-FileCopyrightText: 2024-2026 OKTET LTD */
import { useMemo, useState } from 'react';

import {
	BuilderCondition,
	BuilderGroup,
	BuilderModel,
	ExprOperator,
	builderToAst,
	getKeyValueParts,
	nextBuilderId,
	serializeExpression
} from '@/shared/utils';

import { Icon } from '../icon';
import { cn } from '../utils';
import {
	SuggestionDropdown,
	useSuggestionNavigation
} from './suggestion-popover';
import {
	FilteredSuggestionGroup,
	SuggestionEntry
} from './use-suggestion-context';
import { SuggestionGroup } from './filter-expression-input.types';

const OPERATORS: ExprOperator[] = ['=', '!=', '<', '<=', '>', '>='];

export const createEmptyCondition = (): BuilderCondition => ({
	id: nextBuilderId('bc'),
	negated: false,
	key: '',
	op: '=',
	value: ''
});

export const createEmptyGroup = (): BuilderGroup => ({
	id: nextBuilderId('bg'),
	conditions: [createEmptyCondition()]
});

interface BuilderComboboxProps {
	value: string;
	onChange: (value: string) => void;
	options: string[];
	placeholder: string;
	badgeClassName?: string;
	disabled?: boolean;
	'aria-label': string;
}

const BuilderCombobox = ({
	value,
	onChange,
	options,
	placeholder,
	disabled,
	'aria-label': ariaLabel
}: BuilderComboboxProps) => {
	const [isOpen, setIsOpen] = useState(false);

	const filteredGroups = useMemo<FilteredSuggestionGroup[]>(() => {
		const query = value.toLowerCase();
		const entries = options
			.filter((option) => !query || option.toLowerCase().includes(query))
			.slice(0, 30)
			.map<SuggestionEntry>((option) => ({
				kind: 'pair',
				insertText: option,
				display: option
			}));

		return entries.length ? [{ label: '', entries }] : [];
	}, [options, value]);

	const isDropdownVisible = isOpen && filteredGroups.length > 0;

	const handleAccept = (entry: SuggestionEntry) => {
		onChange(entry.insertText);
		setIsOpen(false);
	};

	const { highlight, setHighlight, handleKeyDown } = useSuggestionNavigation({
		groups: filteredGroups,
		isOpen: isDropdownVisible,
		onAccept: handleAccept,
		onClose: () => setIsOpen(false)
	});

	return (
		<div className="relative min-w-0 flex-1">
			<input
				className="w-full rounded border border-border-primary bg-white px-2 py-1 text-xs text-text-secondary outline-none transition-colors placeholder:text-text-menu hover:border-primary focus:border-primary focus:ring-0 disabled:bg-bg-body"
				value={value}
				onChange={(event) => {
					onChange(event.target.value);
					setIsOpen(true);
				}}
				onKeyDown={(event) => handleKeyDown(event)}
				onFocus={() => setIsOpen(true)}
				onBlur={() => setIsOpen(false)}
				placeholder={placeholder}
				disabled={disabled}
				aria-label={ariaLabel}
				autoComplete="off"
			/>
			{isDropdownVisible ? (
				<SuggestionDropdown
					groups={filteredGroups}
					highlight={highlight}
					onHighlightChange={setHighlight}
					onSelect={handleAccept}
					className="min-w-[12rem]"
				/>
			) : null}
		</div>
	);
};

export interface ModeBuilderProps {
	initialModel: BuilderModel;
	onExpressionChange: (expression: string) => void;
	suggestions: SuggestionGroup[];
	disabled?: boolean;
}

export const ModeBuilder = ({
	initialModel,
	onExpressionChange,
	suggestions,
	disabled
}: ModeBuilderProps) => {
	const [model, setModel] = useState<BuilderModel>(initialModel);

	const { keys, valuesByKey } = useMemo(() => {
		const keys: string[] = [];
		const valuesByKey = new Map<string, string[]>();

		for (const group of suggestions) {
			for (const item of group.items) {
				const [key, value] = getKeyValueParts(item, '=');

				if (!keys.includes(key)) keys.push(key);
				if (value === undefined) continue;

				const values = valuesByKey.get(key) ?? [];
				values.push(value);
				valuesByKey.set(key, values);
			}
		}

		return { keys, valuesByKey };
	}, [suggestions]);

	const applyModel = (next: BuilderModel) => {
		setModel(next);

		const ast = builderToAst(next);

		onExpressionChange(ast ? serializeExpression(ast) : '');
	};

	const updateCondition = (
		groupId: string,
		conditionId: string,
		patch: Partial<BuilderCondition>
	) => {
		applyModel({
			groups: model.groups.map((group) =>
				group.id !== groupId
					? group
					: {
							...group,
							conditions: group.conditions.map((condition) =>
								condition.id !== conditionId
									? condition
									: { ...condition, ...patch }
							)
					  }
			)
		});
	};

	const removeCondition = (groupId: string, conditionId: string) => {
		const groups = model.groups
			.map((group) =>
				group.id !== groupId
					? group
					: {
							...group,
							conditions: group.conditions.filter(
								(condition) => condition.id !== conditionId
							)
					  }
			)
			.filter((group) => group.conditions.length > 0);

		applyModel({ groups: groups.length ? groups : [createEmptyGroup()] });
	};

	const addCondition = (groupId: string) => {
		applyModel({
			groups: model.groups.map((group) =>
				group.id !== groupId
					? group
					: { ...group, conditions: [...group.conditions, createEmptyCondition()] }
			)
		});
	};

	const addGroup = () => {
		applyModel({ groups: [...model.groups, createEmptyGroup()] });
	};

	return (
		<div className="flex w-full flex-col gap-2 px-3 py-3">
			{model.groups.map((group, groupIndex) => (
				<div key={group.id} className="flex flex-col gap-2">
					{groupIndex > 0 ? (
						<div className="flex items-center gap-2">
							<div className="h-px flex-1 bg-border-primary" />
							<span className="text-[0.625rem] font-semibold uppercase tracking-[0.02em] text-text-menu">
								or
							</span>
							<div className="h-px flex-1 bg-border-primary" />
						</div>
					) : null}
					<div className="flex flex-col gap-1.5 rounded-md border border-border-primary p-2">
						{group.conditions.map((condition) => (
							<div key={condition.id} className="flex items-center gap-1.5">
								<button
									type="button"
									aria-label="Negate condition"
									aria-pressed={condition.negated}
									disabled={disabled}
									onClick={() =>
										updateCondition(group.id, condition.id, {
											negated: !condition.negated
										})
									}
									className={cn(
										'shrink-0 rounded border px-1.5 py-1 font-mono text-xs font-semibold leading-none transition-colors',
										condition.negated
											? 'border-primary bg-primary-wash text-primary'
											: 'border-border-primary text-text-menu hover:border-primary hover:text-primary'
									)}
								>
									!
								</button>
								<BuilderCombobox
									value={condition.key}
									onChange={(key) =>
										updateCondition(group.id, condition.id, { key })
									}
									options={keys}
									placeholder="name"
									disabled={disabled}
									aria-label="Condition name"
								/>
								<select
									value={condition.op}
									disabled={disabled}
									aria-label="Condition operator"
									onChange={(event) =>
										updateCondition(group.id, condition.id, {
											op: event.target.value as ExprOperator
										})
									}
									className="shrink-0 rounded border border-border-primary bg-white py-1 pl-2 pr-6 font-mono text-xs text-text-secondary outline-none transition-colors hover:border-primary focus:border-primary focus:ring-0 disabled:bg-bg-body"
								>
									{OPERATORS.map((op) => (
										<option key={op} value={op}>
											{op}
										</option>
									))}
								</select>
								<BuilderCombobox
									value={condition.value}
									onChange={(value) =>
										updateCondition(group.id, condition.id, { value })
									}
									options={valuesByKey.get(condition.key) ?? []}
									placeholder="value (empty = present)"
									disabled={disabled}
									aria-label="Condition value"
								/>
								<button
									type="button"
									aria-label="Remove condition"
									disabled={disabled}
									onClick={() => removeCondition(group.id, condition.id)}
									className="shrink-0 rounded p-1 text-text-menu transition-colors hover:bg-primary-wash hover:text-primary"
								>
									<Icon name="CrossSimple" size={14} />
								</button>
							</div>
						))}
						<button
							type="button"
							disabled={disabled}
							onClick={() => addCondition(group.id)}
							className="self-start rounded px-1.5 py-0.5 text-xs text-text-menu transition-colors hover:bg-primary-wash hover:text-primary"
						>
							+ and
						</button>
					</div>
				</div>
			))}
			<button
				type="button"
				disabled={disabled}
				onClick={addGroup}
				className="self-start rounded px-1.5 py-0.5 text-xs text-text-menu transition-colors hover:bg-primary-wash hover:text-primary"
			>
				+ or group
			</button>
		</div>
	);
};
