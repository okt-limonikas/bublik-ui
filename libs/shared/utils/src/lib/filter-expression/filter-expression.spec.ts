/* SPDX-License-Identifier: Apache-2.0 */
/* SPDX-FileCopyrightText: 2024-2026 OKTET LTD */
import { describe, expect, it } from 'vitest';

import { astToBuilder, builderToAst, tryDnf } from './builder';
import { parseExpression } from './parser';
import { serializeExpression } from './serializer';
import { expressionToTokens, tokensToExpression } from './tokens';
import { ConditionNode, ExprNode } from './types';

const parseOk = (input: string, grammar?: 'default' | 'verdict'): ExprNode => {
	const { ast, errors } = parseExpression(input, grammar);

	expect(errors).toEqual([]);
	expect(ast).not.toBeNull();

	return ast as ExprNode;
};

const roundTrip = (input: string, grammar?: 'default' | 'verdict') => {
	const serialized = serializeExpression(parseOk(input, grammar));
	expect(serializeExpression(parseOk(serialized, grammar))).toBe(serialized);
	return serialized;
};

describe('parseExpression', () => {
	it('parses a single key=value condition', () => {
		const ast = parseOk('fixture=net-drv-ts') as ConditionNode;

		expect(ast).toMatchObject({
			kind: 'condition',
			key: 'fixture',
			op: '=',
			value: 'net-drv-ts'
		});
	});

	it('parses bare meta names mixed with conditions', () => {
		const ast = parseOk('meta_name1 & meta_name2=32');

		expect(ast).toMatchObject({
			kind: 'and',
			children: [
				{ kind: 'condition', key: 'meta_name1', op: null, value: null },
				{ kind: 'condition', key: 'meta_name2', op: '=', value: '32' }
			]
		});
	});

	it('respects precedence: ! over & over |', () => {
		const ast = parseOk('a=1 & b!=2 | !c');

		expect(ast).toMatchObject({
			kind: 'or',
			children: [
				{
					kind: 'and',
					children: [
						{ kind: 'condition', key: 'a', op: '=', value: '1' },
						{ kind: 'condition', key: 'b', op: '!=', value: '2' }
					]
				},
				{
					kind: 'not',
					child: { kind: 'condition', key: 'c', op: null, value: null }
				}
			]
		});
	});

	it('parses parenthesized groups', () => {
		const ast = parseOk('(a=1 | b=2) & c');

		expect(ast).toMatchObject({
			kind: 'and',
			children: [
				{ kind: 'or' },
				{ kind: 'condition', key: 'c', op: null, value: null }
			]
		});
	});

	it('parses values with the extended ident charset', () => {
		const ast = parseOk(
			'CFG=virtio_virtio:dain & env=VAR.env.peer2peer & path=/usr/bin%2f'
		);

		expect(ast).toMatchObject({
			kind: 'and',
			children: [
				{ key: 'CFG', value: 'virtio_virtio:dain' },
				{ key: 'env', value: 'VAR.env.peer2peer' },
				{ key: 'path', value: '/usr/bin%2f' }
			]
		});
	});

	it('parses revision-style values with trailing plus', () => {
		const ast = parseOk('X_REV=abc123+') as ConditionNode;

		expect(ast).toMatchObject({ key: 'X_REV', op: '=', value: 'abc123+' });
	});

	it('folds the ! sign into the value (string_with_sign)', () => {
		const ast = parseOk('key=!val') as ConditionNode;

		expect(ast).toMatchObject({ key: 'key', op: '=', value: '!val' });
	});

	it('accepts numeric comparisons', () => {
		const ast = parseOk('ordinal>=16 & rate<1.5e+3');

		expect(ast).toMatchObject({
			kind: 'and',
			children: [
				{ key: 'ordinal', op: '>=', value: '16' },
				{ key: 'rate', op: '<', value: '1.5e+3' }
			]
		});
	});

	it('reports non-numeric values for numeric operators with a span', () => {
		const { ast, errors } = parseExpression('ordinal>banana');

		expect(ast).not.toBeNull();
		expect(errors).toHaveLength(1);
		expect(errors[0]).toMatchObject({
			message: "Operator '>' requires a numeric value",
			start: 'ordinal>'.length,
			end: 'ordinal>banana'.length
		});
	});

	it('reports syntax errors with positions', () => {
		const { ast, errors } = parseExpression('a= & b');

		expect(ast).toBeNull();
		expect(errors[0].message).toContain('Expected a value');
	});

	it('reports unmatched parentheses', () => {
		expect(parseExpression('(a=1').errors[0].message).toBe("Expected ')'");
		expect(parseExpression('a=1)').errors[0].message).toBe("Unmatched ')'");
	});

	it('returns empty result for blank input', () => {
		expect(parseExpression('   ')).toEqual({ ast: null, errors: [] });
	});

	it('parses verdict grammar: None and quoted strings', () => {
		const ast = parseOk('None | "Unexpectedly failed & lost"', 'verdict');

		expect(ast).toMatchObject({
			kind: 'or',
			children: [
				{ kind: 'condition', key: null, value: 'None', quoted: false },
				{
					kind: 'condition',
					key: null,
					value: 'Unexpectedly failed & lost',
					quoted: true
				}
			]
		});
	});

	it('rejects unquoted verdicts', () => {
		const { ast, errors } = parseExpression('some verdict', 'verdict');

		expect(ast).toBeNull();
		expect(errors[0].message).toContain('quoted verdict');
	});

	it('reports unterminated verdict strings', () => {
		const { errors } = parseExpression('"unterminated', 'verdict');

		expect(errors[0].message).toBe('Unterminated quoted string');
	});
});

describe('serializeExpression', () => {
	it('round-trips flat expressions', () => {
		expect(roundTrip('a=1 & b!=2 | !c')).toBe('a=1 & b!=2 | !c');
	});

	it('keeps parentheses required by precedence', () => {
		expect(roundTrip('(a=1 | b=2) & c')).toBe('(a=1 | b=2) & c');
	});

	it('parenthesizes negated groups', () => {
		expect(roundTrip('!(a=1 & b=2)')).toBe('!(a=1 & b=2)');
	});

	it('drops redundant parentheses', () => {
		expect(roundTrip('(a=1) & (b=2)')).toBe('a=1 & b=2');
	});

	it('round-trips verdict expressions', () => {
		expect(roundTrip('None | "Some verdict"', 'verdict')).toBe(
			'None | "Some verdict"'
		);
	});
});

describe('astToBuilder / builderToAst', () => {
	it('maps OR of ANDs to groups and rows', () => {
		const result = astToBuilder(parseOk('a=1 & !b!=2 | c'));

		expect(result.ok).toBe(true);
		if (!result.ok) return;

		expect(result.model.groups).toHaveLength(2);
		expect(result.model.groups[0].conditions).toMatchObject([
			{ negated: false, key: 'a', op: '=', value: '1' },
			{ negated: true, key: 'b', op: '!=', value: '2' }
		]);
		expect(result.model.groups[1].conditions).toMatchObject([
			{ negated: false, key: 'c', op: '=', value: '' }
		]);
	});

	it('collapses double negation', () => {
		const result = astToBuilder(parseOk('!!a=1'));

		expect(result.ok).toBe(true);
		if (!result.ok) return;

		expect(result.model.groups[0].conditions[0]).toMatchObject({
			negated: false,
			key: 'a'
		});
	});

	it('rejects non-DNF shapes', () => {
		expect(astToBuilder(parseOk('(a=1 | b=2) & c')).ok).toBe(false);
		expect(astToBuilder(parseOk('!(a=1 & b=2)')).ok).toBe(false);
	});

	it('round-trips builder -> ast -> builder', () => {
		const original = parseOk('a=1 & b>2 | !c=3');
		const toBuilder = astToBuilder(original);

		expect(toBuilder.ok).toBe(true);
		if (!toBuilder.ok) return;

		const back = builderToAst(toBuilder.model);

		expect(back).not.toBeNull();
		expect(serializeExpression(back as ExprNode)).toBe(
			serializeExpression(original)
		);
	});

	it('skips rows without a key and returns null for empty models', () => {
		expect(
			builderToAst({
				groups: [
					{
						id: 'g1',
						conditions: [
							{ id: 'c1', negated: false, key: '  ', op: '=', value: '1' }
						]
					}
				]
			})
		).toBeNull();
	});

	it('serializes bare rows (empty value) as bare names', () => {
		const ast = builderToAst({
			groups: [
				{
					id: 'g1',
					conditions: [
						{ id: 'c1', negated: true, key: 'fixture', op: '=', value: '' }
					]
				}
			]
		});

		expect(serializeExpression(ast as ExprNode)).toBe('!fixture');
	});
});

describe('tryDnf', () => {
	it('distributes AND over OR', () => {
		const dnf = tryDnf(parseOk('(a=1 | b=2) & c'));

		expect(dnf).not.toBeNull();
		expect(serializeExpression(dnf as ExprNode)).toBe('a=1 & c | b=2 & c');
		expect(astToBuilder(dnf as ExprNode).ok).toBe(true);
	});

	it('pushes negation inward via De Morgan', () => {
		const dnf = tryDnf(parseOk('!(a=1 & b=2)'));

		expect(serializeExpression(dnf as ExprNode)).toBe('!a=1 | !b=2');
	});

	it('bails out past the condition budget', () => {
		const expr = Array.from({ length: 8 }, (_, i) => `(a${i}=1 | b${i}=2)`).join(
			' & '
		);

		expect(tryDnf(parseOk(expr), 32)).toBeNull();
	});
});

describe('tokensToExpression / expressionToTokens', () => {
	it('joins tokens with AND', () => {
		expect(tokensToExpression(['fixture=net-drv-ts', ' mix=err ', ''])).toBe(
			'fixture=net-drv-ts & mix=err'
		);
	});

	it('quotes verdict tokens except None', () => {
		expect(tokensToExpression(['Some verdict', 'None'], 'verdict')).toBe(
			'"Some verdict" & None'
		);
	});

	it('round-trips tokens through expressions', () => {
		const tokens = ['fixture=net-drv-ts', 'mix=err', 'bare_meta'];
		const result = expressionToTokens(tokensToExpression(tokens));

		expect(result).toEqual({ ok: true, values: tokens });
	});

	it('round-trips verdict tokens', () => {
		const tokens = ['Some verdict', 'None'];
		const result = expressionToTokens(
			tokensToExpression(tokens, 'verdict'),
			'verdict'
		);

		expect(result).toEqual({ ok: true, values: tokens });
	});

	it('rejects OR, NOT and non-equality operators', () => {
		expect(expressionToTokens('a=1 | b=2')).toEqual({ ok: false });
		expect(expressionToTokens('!a=1')).toEqual({ ok: false });
		expect(expressionToTokens('a>1')).toEqual({ ok: false });
	});

	it('treats empty expressions as empty token lists', () => {
		expect(expressionToTokens('')).toEqual({ ok: true, values: [] });
	});
});
