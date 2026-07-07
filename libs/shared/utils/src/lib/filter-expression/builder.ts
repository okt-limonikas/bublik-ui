/* SPDX-License-Identifier: Apache-2.0 */
/* SPDX-FileCopyrightText: 2024-2026 OKTET LTD */
import {
	AndNode,
	BuilderCondition,
	BuilderGroup,
	BuilderModel,
	ConditionNode,
	ExprNode,
	NotNode,
	OrNode
} from './types';

let builderIdSeq = 0;

export const nextBuilderId = (prefix = 'b') => `${prefix}-${++builderIdSeq}`;

type AstToBuilderResult =
	| { ok: true; model: BuilderModel }
	| { ok: false; reason: string };

const NOT_FLAT_REASON =
	'Expression is not a flat OR of AND groups and cannot be shown in the builder';

function conditionToBuilder(node: ExprNode): BuilderCondition | null {
	let negated = false;
	let current = node;

	while (current.kind === 'not') {
		negated = !negated;
		current = current.child;
	}

	if (current.kind !== 'condition') return null;
	// value-only conditions (verdict grammar) have no key/value cells to map
	if (current.key === null) return null;

	return {
		id: nextBuilderId('bc'),
		negated,
		key: current.key,
		op: current.op ?? '=',
		value: current.value ?? ''
	};
}

/**
 * Converts an AST to the builder model. Succeeds only for expressions shaped
 * as OR of ANDs of (possibly negated) key/value conditions; callers may retry
 * with tryDnf() before giving up.
 */
export function astToBuilder(ast: ExprNode): AstToBuilderResult {
	const groupNodes = ast.kind === 'or' ? ast.children : [ast];
	const groups: BuilderGroup[] = [];

	for (const groupNode of groupNodes) {
		const conditionNodes =
			groupNode.kind === 'and' ? groupNode.children : [groupNode];
		const conditions: BuilderCondition[] = [];

		for (const conditionNode of conditionNodes) {
			const condition = conditionToBuilder(conditionNode);

			if (!condition) return { ok: false, reason: NOT_FLAT_REASON };

			conditions.push(condition);
		}

		groups.push({ id: nextBuilderId('bg'), conditions });
	}

	return { ok: true, model: { groups } };
}

/**
 * Converts the builder model back to an AST, skipping rows without a key.
 * Returns null when nothing is filled in.
 */
export function builderToAst(model: BuilderModel): ExprNode | null {
	const groupNodes: ExprNode[] = [];

	for (const group of model.groups) {
		const conditionNodes: ExprNode[] = [];

		for (const row of group.conditions) {
			const key = row.key.trim();

			if (!key) continue;

			const value = row.value.trim();
			const condition: ConditionNode = value
				? { kind: 'condition', key, op: row.op, value }
				: { kind: 'condition', key, op: null, value: null };

			conditionNodes.push(
				row.negated ? { kind: 'not', child: condition } : condition
			);
		}

		if (!conditionNodes.length) continue;

		groupNodes.push(
			conditionNodes.length === 1
				? conditionNodes[0]
				: { kind: 'and', children: conditionNodes }
		);
	}

	if (!groupNodes.length) return null;

	return groupNodes.length === 1
		? groupNodes[0]
		: { kind: 'or', children: groupNodes };
}

type Literal = ConditionNode | NotNode;

function toNnf(node: ExprNode, negated: boolean): ExprNode {
	switch (node.kind) {
		case 'condition':
			return negated ? { kind: 'not', child: node } : node;
		case 'not':
			return toNnf(node.child, !negated);
		case 'and':
		case 'or': {
			const children = node.children.map((child) => toNnf(child, negated));
			const kind =
				(node.kind === 'and') !== negated ? ('and' as const) : ('or' as const);
			return { kind, children };
		}
	}
}

/**
 * Normalizes an AST to disjunctive normal form (OR of ANDs of literals) so it
 * fits the builder. Returns null when the result would exceed maxConditions
 * literals in total (exponential blow-up guard).
 */
export function tryDnf(ast: ExprNode, maxConditions = 32): ExprNode | null {
	const nnf = toNnf(ast, false);

	const distribute = (node: ExprNode): Literal[][] | null => {
		if (node.kind === 'condition' || node.kind === 'not') return [[node]];

		if (node.kind === 'or') {
			const clauses: Literal[][] = [];

			for (const child of node.children) {
				const childClauses = distribute(child);
				if (!childClauses) return null;
				clauses.push(...childClauses);
			}

			return clauses;
		}

		let clauses: Literal[][] = [[]];

		for (const child of node.children) {
			const childClauses = distribute(child);
			if (!childClauses) return null;

			const next: Literal[][] = [];
			let total = 0;

			for (const left of clauses) {
				for (const right of childClauses) {
					const merged = [...left, ...right];
					total += merged.length;
					if (total > maxConditions) return null;
					next.push(merged);
				}
			}

			clauses = next;
		}

		return clauses;
	};

	const clauses = distribute(nnf);

	if (!clauses) return null;

	const groups: ExprNode[] = clauses.map((literals) =>
		literals.length === 1 ? literals[0] : { kind: 'and', children: literals }
	);

	return groups.length === 1 ? groups[0] : { kind: 'or', children: groups };
}
