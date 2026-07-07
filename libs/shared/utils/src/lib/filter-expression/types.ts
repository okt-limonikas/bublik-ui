/* SPDX-License-Identifier: Apache-2.0 */
/* SPDX-FileCopyrightText: 2024-2026 OKTET LTD */

export type ExprOperator = '=' | '!=' | '<' | '<=' | '>' | '>=';

export type ExprGrammar = 'default' | 'verdict';

export interface ExprSpan {
	start: number;
	end: number;
}

export interface ExprError {
	message: string;
	start: number;
	end: number;
}

export type ExprTokenType =
	| 'ident'
	| 'op'
	| 'not'
	| 'and'
	| 'or'
	| 'lparen'
	| 'rparen'
	| 'quoted'
	| 'eof';

export interface ExprToken {
	type: ExprTokenType;
	text: string;
	start: number;
	end: number;
}

export interface ConditionNode {
	kind: 'condition';
	/** null for value-only conditions (verdict grammar) */
	key: string | null;
	/** null for bare meta name conditions, e.g. `meta_name1` */
	op: ExprOperator | null;
	value: string | null;
	/** verdict grammar: value was written as a quoted string */
	quoted?: boolean;
	span?: ExprSpan;
}

export interface NotNode {
	kind: 'not';
	child: ExprNode;
}

export interface AndNode {
	kind: 'and';
	children: ExprNode[];
}

export interface OrNode {
	kind: 'or';
	children: ExprNode[];
}

export type ExprNode = ConditionNode | NotNode | AndNode | OrNode;

export interface BuilderCondition {
	id: string;
	negated: boolean;
	key: string;
	op: ExprOperator;
	/** empty string means a bare meta name check (no operator/value on serialize) */
	value: string;
}

export interface BuilderGroup {
	id: string;
	conditions: BuilderCondition[];
}

export interface BuilderModel {
	groups: BuilderGroup[];
}
