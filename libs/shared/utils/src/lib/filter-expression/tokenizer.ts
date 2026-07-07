/* SPDX-License-Identifier: Apache-2.0 */
/* SPDX-FileCopyrightText: 2024-2026 OKTET LTD */
import { ExprError, ExprGrammar, ExprToken } from './types';

/** Word(alphanums + '._-/%+:') from bublik/core/run/filter_expression.py */
export const EXPR_IDENT_CHAR = /[A-Za-z0-9._\-/%+:]/;

export function tokenize(
	input: string,
	grammar: ExprGrammar = 'default'
): { tokens: ExprToken[]; errors: ExprError[] } {
	const tokens: ExprToken[] = [];
	const errors: ExprError[] = [];
	let i = 0;

	const push = (type: ExprToken['type'], text: string, start: number) => {
		tokens.push({ type, text, start, end: start + text.length });
	};

	while (i < input.length) {
		const ch = input[i];

		if (/\s/.test(ch)) {
			i++;
			continue;
		}

		if (ch === '(') {
			push('lparen', ch, i);
			i++;
			continue;
		}

		if (ch === ')') {
			push('rparen', ch, i);
			i++;
			continue;
		}

		if (ch === '&') {
			push('and', ch, i);
			i++;
			continue;
		}

		if (ch === '|') {
			push('or', ch, i);
			i++;
			continue;
		}

		if (grammar === 'verdict' && ch === '"') {
			const closing = input.indexOf('"', i + 1);

			if (closing === -1) {
				errors.push({
					message: 'Unterminated quoted string',
					start: i,
					end: input.length
				});
				i = input.length;
				continue;
			}

			tokens.push({
				type: 'quoted',
				text: input.slice(i + 1, closing),
				start: i,
				end: closing + 1
			});
			i = closing + 1;
			continue;
		}

		const twoChar = input.slice(i, i + 2);

		if (twoChar === '>=' || twoChar === '<=' || twoChar === '!=') {
			push('op', twoChar, i);
			i += 2;
			continue;
		}

		if (ch === '!') {
			push('not', ch, i);
			i++;
			continue;
		}

		if (ch === '>' || ch === '<' || ch === '=') {
			push('op', ch, i);
			i++;
			continue;
		}

		if (EXPR_IDENT_CHAR.test(ch)) {
			let end = i;
			while (end < input.length && EXPR_IDENT_CHAR.test(input[end])) end++;
			push('ident', input.slice(i, end), i);
			i = end;
			continue;
		}

		errors.push({ message: `Unexpected character '${ch}'`, start: i, end: i + 1 });
		i++;
	}

	tokens.push({ type: 'eof', text: '', start: input.length, end: input.length });

	return { tokens, errors };
}
