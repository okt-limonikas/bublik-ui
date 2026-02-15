/* SPDX-License-Identifier: Apache-2.0 */
/* SPDX-FileCopyrightText: 2024-2026 OKTET LTD */
import { nanoid } from '@reduxjs/toolkit';

import {
	BadgeQueryBadge,
	BadgeQueryBinaryOperator,
	BadgeQueryBuilderState,
	BadgeQueryExpressionType,
	BadgeQueryMode,
	BadgeQueryRule,
	BadgeQueryValue
} from './types';

type ExpressionNode =
	| { type: 'term'; value: string }
	| { type: 'not'; value: ExpressionNode }
	| { type: 'and'; left: ExpressionNode; right: ExpressionNode }
	| { type: 'or'; left: ExpressionNode; right: ExpressionNode };

const META_IDENTIFIER_REGEX = /^[A-Za-z0-9._\-/%+:]+$/;
const META_RELATION_REGEX =
	/^([A-Za-z0-9._\-/%+:]+)\s*(>=|<=|!=|>|<|=)\s*([A-Za-z0-9._\-/%+:!]+)$/;
const VERDICT_REGEX = /^"[^"]*"$/;

const modeSet: ReadonlySet<BadgeQueryMode> = new Set([
	'simple',
	'builder',
	'raw'
]);

const EMPTY_BADGE_QUERY_VALUE: BadgeQueryValue = {
	mode: 'simple',
	badges: [],
	expression: ''
};

const escapeVerdictText = (value: string) => value.replace(/"/g, '');

const normalizeMetaTerm = (value: string) => {
	const trimmed = value.trim();
	const relationMatch = trimmed.match(META_RELATION_REGEX);

	if (!relationMatch) return trimmed;

	return `${relationMatch[1]}${relationMatch[2]}${relationMatch[3]}`;
};

const normalizeTermForExpressionType = (
	value: string,
	expressionType: BadgeQueryExpressionType
) => {
	const trimmed = value.trim();

	if (expressionType === 'verdict') {
		if (trimmed === 'None') return trimmed;
		if (VERDICT_REGEX.test(trimmed)) return trimmed;

		return `"${escapeVerdictText(trimmed)}"`;
	}

	return normalizeMetaTerm(trimmed);
};

const expressionTypeToExample = (
	expressionType: BadgeQueryExpressionType
): string => {
	if (expressionType === 'verdict') return 'None | "Unexpectedly failed"';
	if (expressionType === 'test_argument') {
		return 'argument1 != 5 & argument2 >= 10';
	}

	return 'meta_name1 & meta_name2=32';
};

const stripVerdictQuotes = (value: string) => {
	if (!VERDICT_REGEX.test(value)) return value;

	return value.slice(1, -1);
};

const splitNegationPrefix = (token: string) => {
	let rest = token.trim();
	let negationCount = 0;

	while (rest.startsWith('!')) {
		rest = rest.slice(1).trimStart();
		negationCount += 1;
	}

	return { negationCount, term: rest };
};

const tokenizeExpression = (expression: string): string[] => {
	const tokens: string[] = [];
	let current = '';
	let index = 0;

	while (index < expression.length) {
		const symbol = expression[index];

		if (symbol === '"') {
			const quoteStart = index;
			index += 1;

			while (index < expression.length && expression[index] !== '"') {
				index += 1;
			}

			if (index >= expression.length) {
				throw new Error('Unclosed quote in expression');
			}

			current += expression.slice(quoteStart, index + 1);
			index += 1;
			continue;
		}

		if (symbol === '&' || symbol === '|' || symbol === '(' || symbol === ')') {
			const term = current.trim();

			if (term.length) tokens.push(term);
			tokens.push(symbol);
			current = '';
			index += 1;
			continue;
		}

		current += symbol;
		index += 1;
	}

	const tail = current.trim();
	if (tail.length) tokens.push(tail);

	return tokens;
};

class ExpressionParser {
	private index = 0;

	constructor(
		private readonly tokens: string[],
		private readonly expressionType: BadgeQueryExpressionType
	) {}

	parse() {
		if (!this.tokens.length) {
			throw new Error('Expression is empty');
		}

		const result = this.parseOr();

		if (this.hasNext()) {
			throw new Error(`Unexpected token '${this.peek()}'`);
		}

		return result;
	}

	private parseOr(): ExpressionNode {
		let node = this.parseAnd();

		while (this.peek() === '|') {
			this.consume();
			node = {
				type: 'or',
				left: node,
				right: this.parseAnd()
			};
		}

		return node;
	}

	private parseAnd(): ExpressionNode {
		let node = this.parsePrimary();

		while (this.peek() === '&') {
			this.consume();
			node = {
				type: 'and',
				left: node,
				right: this.parsePrimary()
			};
		}

		return node;
	}

	private parsePrimary(): ExpressionNode {
		const token = this.peek();

		if (!token) throw new Error('Unexpected end of expression');

		if (token === '(') {
			this.consume();
			const nested = this.parseOr();

			if (this.peek() !== ')') {
				throw new Error("Missing ')' in expression");
			}

			this.consume();
			return nested;
		}

		if (token === ')') {
			throw new Error("Unexpected ')' in expression");
		}

		if (token === '&' || token === '|') {
			throw new Error(`Unexpected operator '${token}'`);
		}

		this.consume();

		const { negationCount, term } = splitNegationPrefix(token);
		let node: ExpressionNode;

		if (!term) {
			node = this.parsePrimary();
		} else {
			if (!isValidExpressionTerm(term, this.expressionType)) {
				throw new Error(`Invalid term '${term}'`);
			}

			node = {
				type: 'term',
				value: normalizeTermForExpressionType(term, this.expressionType)
			};
		}

		for (let index = 0; index < negationCount; index += 1) {
			node = { type: 'not', value: node };
		}

		return node;
	}

	private peek() {
		return this.tokens[this.index];
	}

	private consume() {
		const token = this.tokens[this.index];
		this.index += 1;

		return token;
	}

	private hasNext() {
		return this.index < this.tokens.length;
	}
}

const parseExpressionAst = (
	expression: string,
	expressionType: BadgeQueryExpressionType
) => {
	const tokens = tokenizeExpression(expression);
	const parser = new ExpressionParser(tokens, expressionType);

	return parser.parse();
};

const extractRule = (
	node: ExpressionNode,
	expressionType: BadgeQueryExpressionType
): BadgeQueryRule | null => {
	if (node.type === 'term') {
		return {
			id: nanoid(6),
			value:
				expressionType === 'verdict'
					? stripVerdictQuotes(node.value)
					: node.value,
			negated: false
		};
	}

	if (node.type === 'not' && node.value.type === 'term') {
		return {
			id: nanoid(6),
			value:
				expressionType === 'verdict'
					? stripVerdictQuotes(node.value.value)
					: node.value.value,
			negated: true
		};
	}

	return null;
};

const collectRules = (
	node: ExpressionNode,
	operator: BadgeQueryBinaryOperator,
	expressionType: BadgeQueryExpressionType,
	rules: BadgeQueryRule[]
): boolean => {
	const type = operator === '&' ? 'and' : 'or';

	if (node.type === 'and' || node.type === 'or') {
		if (node.type !== type) return false;

		return (
			collectRules(node.left, operator, expressionType, rules) &&
			collectRules(node.right, operator, expressionType, rules)
		);
	}

	const rule = extractRule(node, expressionType);
	if (!rule) return false;

	rules.push(rule);

	return true;
};

export const createBadgeQueryValue = (
	partialValue: Partial<BadgeQueryValue> = {}
): BadgeQueryValue => {
	return {
		...EMPTY_BADGE_QUERY_VALUE,
		...partialValue,
		badges: dedupeBadges(partialValue.badges ?? EMPTY_BADGE_QUERY_VALUE.badges)
	};
};

export const dedupeBadges = (badges: BadgeQueryBadge[]): BadgeQueryBadge[] => {
	const uniqueValues = new Set<string>();
	const result: BadgeQueryBadge[] = [];

	for (const badge of badges) {
		const trimmedValue = badge.value.trim();
		if (!trimmedValue || uniqueValues.has(trimmedValue)) continue;

		uniqueValues.add(trimmedValue);
		result.push({
			...badge,
			value: trimmedValue,
			label: badge.label?.trim() || trimmedValue
		});
	}

	return result;
};

export const normalizeBadgeQueryValue = (
	value: BadgeQueryValue | undefined,
	expressionType: BadgeQueryExpressionType = 'tag'
): BadgeQueryValue => {
	if (!value) return createBadgeQueryValue();

	const badges = dedupeBadges(value.badges ?? []);
	const mode = modeSet.has(value.mode) ? value.mode : 'simple';
	const expression =
		typeof value.expression === 'string'
			? value.expression
			: mode === 'simple'
			? buildExpressionFromBadges(badges, expressionType)
			: '';

	return { mode, badges, expression };
};

export const isValidExpressionTerm = (
	term: string,
	expressionType: BadgeQueryExpressionType
) => {
	const normalized = term.trim();
	if (!normalized.length) return false;

	if (expressionType === 'verdict') {
		return normalized === 'None' || VERDICT_REGEX.test(normalized);
	}

	return (
		META_IDENTIFIER_REGEX.test(normalized) ||
		META_RELATION_REGEX.test(normalized)
	);
};

export const getExpressionExample = expressionTypeToExample;

export const getExpressionValidationError = (
	expression: string,
	expressionType: BadgeQueryExpressionType
): string | undefined => {
	const normalized = expression.trim();
	if (!normalized.length) return undefined;

	try {
		parseExpressionAst(normalized, expressionType);
		return undefined;
	} catch (error) {
		const parsedError = error instanceof Error ? error.message : 'Parse error';

		return `${parsedError}. Example: ${expressionTypeToExample(
			expressionType
		)}`;
	}
};

export const buildExpressionFromBuilder = (
	builderState: BadgeQueryBuilderState,
	expressionType: BadgeQueryExpressionType
) => {
	const terms = builderState.rules
		.map((rule) => {
			const normalized = rule.value.trim();
			if (!normalized.length) return undefined;

			const term = normalizeTermForExpressionType(normalized, expressionType);
			return rule.negated ? `!${term}` : term;
		})
		.filter((term): term is string => Boolean(term));

	if (!terms.length) return '';

	return terms.join(` ${builderState.operator} `);
};

export const buildExpressionFromBadges = (
	badges: BadgeQueryBadge[],
	expressionType: BadgeQueryExpressionType
) => {
	const rules: BadgeQueryRule[] = dedupeBadges(badges).map((badge) => ({
		id: badge.id,
		value: badge.value,
		negated: false
	}));

	return buildExpressionFromBuilder({ operator: '&', rules }, expressionType);
};

export const parseFlatBuilderExpression = (
	expression: string,
	expressionType: BadgeQueryExpressionType
): BadgeQueryBuilderState | null => {
	const normalized = expression.trim();
	if (!normalized.length) {
		return { operator: '&', rules: [] };
	}

	let ast: ExpressionNode;

	try {
		ast = parseExpressionAst(normalized, expressionType);
	} catch {
		return null;
	}

	if (ast.type === 'term' || ast.type === 'not') {
		const rule = extractRule(ast, expressionType);
		if (!rule) return null;

		return { operator: '&', rules: [rule] };
	}

	const operator: BadgeQueryBinaryOperator = ast.type === 'and' ? '&' : '|';
	const rules: BadgeQueryRule[] = [];

	if (!collectRules(ast, operator, expressionType, rules)) return null;

	return { operator, rules };
};
