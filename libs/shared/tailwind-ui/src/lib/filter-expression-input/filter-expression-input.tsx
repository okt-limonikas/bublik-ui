/* SPDX-License-Identifier: Apache-2.0 */
/* SPDX-FileCopyrightText: 2024-2026 OKTET LTD */
import { useRef, useState } from 'react';
import { nanoid } from '@reduxjs/toolkit';

import {
	BuilderModel,
	astToBuilder,
	expressionToTokens,
	parseExpression,
	serializeExpression,
	tokensToExpression,
	tryDnf
} from '@/shared/utils';

import { InputLabel } from '../input-label';
import { cn } from '../utils';
import { FilterExpressionInputProps, FilterMode } from './filter-expression-input.types';
import { ModeBuilder, createEmptyGroup } from './mode-builder';
import { ModeExpression } from './mode-expression';
import { ModeTokens } from './mode-tokens';

const MODE_LABELS: Record<FilterMode, string> = {
	tokens: 'Tags',
	builder: 'Builder',
	expression: 'Expr'
};

type BuilderInit =
	| { kind: 'model'; model: BuilderModel }
	| { kind: 'fallback'; reason: string; canNormalize: boolean };

export const FilterExpressionInput = (props: FilterExpressionInputProps) => {
	const {
		label,
		placeholder,
		mode,
		onModeChange,
		badges,
		onBadgesChange,
		expression,
		onExpressionChange,
		suggestions = [],
		grammar = 'default',
		hideBuilder,
		keyValueDisplayDelimiter,
		keyValueSubmitDelimiter,
		onValidate,
		disabled,
		name,
		labelTrailingContent
	} = props;

	const inputRef = useRef<HTMLInputElement>(null);
	const [notice, setNotice] = useState<string | null>(null);
	const [builderInit, setBuilderInit] = useState<BuilderInit | null>(null);
	// remount the builder when its initial model is recomputed
	const [builderSession, setBuilderSession] = useState(0);

	const computeBuilderInit = (expr: string): BuilderInit => {
		if (!expr.trim()) {
			return { kind: 'model', model: { groups: [createEmptyGroup()] } };
		}

		const { ast, errors } = parseExpression(expr, grammar);

		if (errors.length || !ast) {
			return {
				kind: 'fallback',
				reason: 'Fix expression errors to use the builder',
				canNormalize: false
			};
		}

		const converted = astToBuilder(ast);

		if (converted.ok) return { kind: 'model', model: converted.model };

		const dnf = tryDnf(ast);

		return {
			kind: 'fallback',
			reason: converted.reason,
			canNormalize: dnf !== null
		};
	};

	const handleModeChange = (nextMode: FilterMode) => {
		if (nextMode === mode || disabled) return;

		setNotice(null);

		let nextExpression = expression;

		if (mode === 'tokens' && badges.length) {
			nextExpression = tokensToExpression(
				badges.map((badge) => badge.value),
				grammar
			);
			onExpressionChange(nextExpression);
		}

		if (nextMode === 'tokens' && mode !== 'tokens') {
			const converted = expressionToTokens(expression, grammar);

			if (converted.ok) {
				onBadgesChange(
					converted.values.map((value) => ({ id: nanoid(4), value }))
				);
			} else if (expression.trim()) {
				setNotice(
					'The expression uses OR, NOT or comparison operators and cannot be shown as tags — previous tags are kept'
				);
			}
		}

		if (nextMode === 'builder') {
			setBuilderInit(computeBuilderInit(nextExpression));
			setBuilderSession((session) => session + 1);
		}

		onModeChange(nextMode);
	};

	const handleNormalize = () => {
		const { ast } = parseExpression(expression, grammar);

		if (!ast) return;

		const dnf = tryDnf(ast);

		if (!dnf) return;

		const normalized = serializeExpression(dnf);

		onExpressionChange(normalized);
		setBuilderInit(computeBuilderInit(normalized));
		setBuilderSession((session) => session + 1);
		setNotice('Expression was normalized to an OR of AND groups');
	};

	const availableModes: FilterMode[] = hideBuilder
		? ['tokens', 'expression']
		: ['tokens', 'builder', 'expression'];

	const modeSwitch = (
		<div
			className="inline-flex items-center gap-0.5 rounded border border-border-primary bg-white p-0.5"
			role="radiogroup"
			aria-label={`${label} filter mode`}
		>
			{availableModes.map((availableMode) => (
				<button
					key={availableMode}
					type="button"
					role="radio"
					aria-checked={mode === availableMode}
					onClick={(event) => {
						event.stopPropagation();
						handleModeChange(availableMode);
					}}
					className={cn(
						'rounded px-1.5 py-0.5 text-[0.625rem] font-semibold uppercase tracking-[0.02em] leading-[0.75rem] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20',
						mode === availableMode
							? 'bg-primary-wash text-primary'
							: 'text-text-menu hover:bg-primary-wash hover:text-primary'
					)}
				>
					{MODE_LABELS[availableMode]}
				</button>
			))}
		</div>
	);

	const builderBody = () => {
		const init = builderInit ?? computeBuilderInit(expression);

		if (init.kind === 'fallback') {
			return (
				<div className="flex w-full flex-col gap-2 px-3 py-3">
					<p className="text-xs text-text-menu">{init.reason}</p>
					<code className="break-all rounded bg-bg-body px-2 py-1 font-mono text-xs text-text-secondary">
						{expression}
					</code>
					{init.canNormalize ? (
						<button
							type="button"
							onClick={handleNormalize}
							className="self-start rounded border border-border-primary px-2 py-1 text-xs text-text-secondary transition-colors hover:border-primary hover:text-primary"
						>
							Normalize to OR of AND groups
						</button>
					) : null}
				</div>
			);
		}

		return (
			<ModeBuilder
				key={builderSession}
				initialModel={init.model}
				onExpressionChange={onExpressionChange}
				suggestions={suggestions}
				disabled={disabled}
			/>
		);
	};

	return (
		<div className="w-full">
			<div
				className={cn(
					'relative flex items-center w-full bg-white border border-border-primary rounded-md hover:border-primary transition-all min-h-[40px]',
					'focus-within:border-primary focus-within:shadow-text-field',
					disabled &&
						'cursor-not-allowed border-border-primary shadow-none hover:border-border-primary bg-bg-body'
				)}
				onClick={() => inputRef.current?.focus()}
				data-testid="tw-filter-expression-input"
			>
				<InputLabel className="absolute h-3 bg-white -top-3 left-2" htmlFor={name}>
					{label}
				</InputLabel>
				<div className="absolute -top-3 right-2 flex items-center gap-1 bg-white px-1">
					{modeSwitch}
					{labelTrailingContent}
				</div>
				{mode === 'tokens' ? (
					<ModeTokens
						badges={badges}
						onBadgesChange={onBadgesChange}
						suggestions={suggestions}
						placeholder={placeholder}
						disabled={disabled}
						name={name}
						label={label}
						keyValueDisplayDelimiter={keyValueDisplayDelimiter}
						keyValueSubmitDelimiter={keyValueSubmitDelimiter}
						inputRef={inputRef}
					/>
				) : null}
				{mode === 'expression' ? (
					<ModeExpression
						expression={expression}
						onExpressionChange={onExpressionChange}
						suggestions={suggestions}
						grammar={grammar}
						placeholder={placeholder}
						disabled={disabled}
						name={name}
						onValidate={onValidate}
						inputRef={inputRef}
					/>
				) : null}
				{mode === 'builder' ? builderBody() : null}
			</div>
			{notice ? (
				<p className="mt-1 text-xs text-text-menu" role="status">
					{notice}
				</p>
			) : null}
		</div>
	);
};
