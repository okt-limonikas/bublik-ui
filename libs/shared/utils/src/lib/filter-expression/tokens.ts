/* SPDX-License-Identifier: Apache-2.0 */
/* SPDX-FileCopyrightText: 2024-2026 OKTET LTD */
import { parseExpression } from './parser';
import { ExprGrammar } from './types';

/**
 * Converts a token list (badge values) to the equivalent expression string:
 * conditions joined with ' & '. Verdict grammar quotes each value except the
 * special None.
 */
export function tokensToExpression(
	values: string[],
	grammar: ExprGrammar = 'default'
): string {
	const cleaned = values.map((value) => value.trim()).filter(Boolean);

	if (grammar === 'verdict') {
		return cleaned
			.map((value) =>
				value === 'None' ? value : `"${value.replaceAll('"', '')}"`
			)
			.join(' & ');
	}

	return cleaned.join(' & ');
}

/**
 * Converts an expression back to a token list. Only succeeds for a pure AND
 * of positive conditions (bare names or key=value); OR, NOT and other
 * operators cannot be represented as tokens.
 */
export function expressionToTokens(
	expr: string,
	grammar: ExprGrammar = 'default'
): { ok: true; values: string[] } | { ok: false } {
	const { ast, errors } = parseExpression(expr, grammar);

	if (errors.length) return { ok: false };
	if (!ast) return { ok: true, values: [] };

	const conditionNodes = ast.kind === 'and' ? ast.children : [ast];
	const values: string[] = [];

	for (const node of conditionNodes) {
		if (node.kind !== 'condition') return { ok: false };

		if (grammar === 'verdict') {
			values.push(node.value ?? '');
			continue;
		}

		if (node.op === null || node.value === null) {
			values.push(node.key ?? '');
			continue;
		}

		if (node.op !== '=') return { ok: false };

		values.push(`${node.key}=${node.value}`);
	}

	return { ok: true, values };
}
