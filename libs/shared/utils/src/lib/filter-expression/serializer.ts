/* SPDX-License-Identifier: Apache-2.0 */
/* SPDX-FileCopyrightText: 2024-2026 OKTET LTD */
import { ExprNode } from './types';

/**
 * Serializes an AST back to an expression string with minimal parentheses,
 * so that parseExpression(serializeExpression(ast)) round-trips.
 */
export function serializeExpression(ast: ExprNode): string {
	switch (ast.kind) {
		case 'condition': {
			if (ast.key === null) {
				return ast.quoted ? `"${ast.value ?? ''}"` : ast.value ?? '';
			}

			if (!ast.op || ast.value === null) return ast.key;

			return `${ast.key}${ast.op}${ast.value}`;
		}
		case 'not': {
			const child = serializeExpression(ast.child);

			return ast.child.kind === 'and' || ast.child.kind === 'or'
				? `!(${child})`
				: `!${child}`;
		}
		case 'and':
			return ast.children
				.map((child) => {
					const serialized = serializeExpression(child);
					return child.kind === 'or' ? `(${serialized})` : serialized;
				})
				.join(' & ');
		case 'or':
			return ast.children.map(serializeExpression).join(' | ');
	}
}
