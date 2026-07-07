/* SPDX-License-Identifier: Apache-2.0 */
/* SPDX-FileCopyrightText: 2024-2026 OKTET LTD */
import { tokenize } from './tokenizer';
import {
	ConditionNode,
	ExprError,
	ExprGrammar,
	ExprNode,
	ExprOperator,
	ExprToken
} from './types';

/** Matches the number grammar in bublik/core/run/filter_expression.py */
const NUMBER_RE = /^[+-]?\d+(\.\d*)?([eE][+-]?\d+)?$/;

const NUMERIC_OPS: ReadonlySet<ExprOperator> = new Set(['<', '<=', '>', '>=']);

class ParseFailure extends Error {
	constructor(public readonly expr: ExprError) {
		super(expr.message);
	}
}

class Parser {
	private pos = 0;
	public readonly errors: ExprError[] = [];

	constructor(
		private readonly tokens: ExprToken[],
		private readonly grammar: ExprGrammar
	) {}

	private peek(offset = 0): ExprToken {
		return this.tokens[Math.min(this.pos + offset, this.tokens.length - 1)];
	}

	private consume(): ExprToken {
		const token = this.peek();
		if (token.type !== 'eof') this.pos++;
		return token;
	}

	private fail(message: string, token: ExprToken = this.peek()): never {
		throw new ParseFailure({ message, start: token.start, end: token.end });
	}

	parse(): ExprNode {
		const node = this.parseOr();
		const trailing = this.peek();

		if (trailing.type !== 'eof') {
			this.fail(
				trailing.type === 'rparen'
					? "Unmatched ')'"
					: `Unexpected '${trailing.text}'`,
				trailing
			);
		}

		return node;
	}

	private parseOr(): ExprNode {
		const children = [this.parseAnd()];

		while (this.peek().type === 'or') {
			this.consume();
			children.push(this.parseAnd());
		}

		return children.length === 1 ? children[0] : { kind: 'or', children };
	}

	private parseAnd(): ExprNode {
		const children = [this.parseUnary()];

		while (this.peek().type === 'and') {
			this.consume();
			children.push(this.parseUnary());
		}

		return children.length === 1 ? children[0] : { kind: 'and', children };
	}

	private parseUnary(): ExprNode {
		const token = this.peek();

		if (token.type === 'not') {
			this.consume();
			return { kind: 'not', child: this.parseUnary() };
		}

		if (token.type === 'lparen') {
			this.consume();
			const node = this.parseOr();
			const closing = this.peek();

			if (closing.type !== 'rparen') this.fail("Expected ')'", closing);
			this.consume();

			return node;
		}

		return this.grammar === 'verdict'
			? this.parseVerdictCondition()
			: this.parseCondition();
	}

	private parseVerdictCondition(): ConditionNode {
		const token = this.peek();

		if (token.type === 'quoted') {
			this.consume();
			return {
				kind: 'condition',
				key: null,
				op: '=',
				value: token.text,
				quoted: true,
				span: { start: token.start, end: token.end }
			};
		}

		if (token.type === 'ident' && token.text === 'None') {
			this.consume();
			return {
				kind: 'condition',
				key: null,
				op: '=',
				value: 'None',
				quoted: false,
				span: { start: token.start, end: token.end }
			};
		}

		this.fail('Expected None or a quoted verdict, e.g. "Verdict text"', token);
	}

	private parseCondition(): ConditionNode {
		const keyToken = this.peek();

		if (keyToken.type !== 'ident') {
			this.fail(
				keyToken.type === 'eof'
					? 'Expected a condition'
					: `Expected a name, got '${keyToken.text}'`,
				keyToken
			);
		}
		this.consume();

		if (this.peek().type !== 'op') {
			return {
				kind: 'condition',
				key: keyToken.text,
				op: null,
				value: null,
				span: { start: keyToken.start, end: keyToken.end }
			};
		}

		const opToken = this.consume();
		const op = opToken.text as ExprOperator;

		// backend string_with_sign: '!' folded into the value, no space allowed
		let sign = '';

		if (
			(op === '=' || op === '!=') &&
			this.peek().type === 'not' &&
			this.peek(1).type === 'ident' &&
			this.peek().end === this.peek(1).start
		) {
			this.consume();
			sign = '!';
		}

		const valueToken = this.peek();

		if (valueToken.type !== 'ident') {
			this.fail(`Expected a value after '${op}'`, valueToken);
		}
		this.consume();

		if (NUMERIC_OPS.has(op) && !NUMBER_RE.test(valueToken.text)) {
			this.errors.push({
				message: `Operator '${op}' requires a numeric value`,
				start: valueToken.start,
				end: valueToken.end
			});
		}

		return {
			kind: 'condition',
			key: keyToken.text,
			op,
			value: sign + valueToken.text,
			span: { start: keyToken.start, end: valueToken.end }
		};
	}
}

export function parseExpression(
	input: string,
	grammar: ExprGrammar = 'default'
): { ast: ExprNode | null; errors: ExprError[] } {
	if (!input.trim()) return { ast: null, errors: [] };

	const { tokens, errors: tokenErrors } = tokenize(input, grammar);

	if (tokenErrors.length) return { ast: null, errors: tokenErrors };

	const parser = new Parser(tokens, grammar);

	try {
		const ast = parser.parse();
		return { ast, errors: parser.errors };
	} catch (error) {
		if (error instanceof ParseFailure) {
			return { ast: null, errors: [...parser.errors, error.expr] };
		}
		throw error;
	}
}
