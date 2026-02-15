/* SPDX-License-Identifier: Apache-2.0 */
/* SPDX-FileCopyrightText: 2024-2026 OKTET LTD */
import { describe, expect, it } from 'vitest';

import {
	buildExpressionFromBadges,
	buildExpressionFromBuilder,
	getExpressionValidationError,
	parseFlatBuilderExpression
} from './utils';

describe('badge-query-input utils', () => {
	it('builds expression from selected badges', () => {
		const expression = buildExpressionFromBadges(
			[
				{ id: '1', value: 'tag_a' },
				{ id: '2', value: 'tag_b' }
			],
			'tag'
		);

		expect(expression).toEqual('tag_a & tag_b');
	});

	it('builds expression from builder state', () => {
		const expression = buildExpressionFromBuilder(
			{
				operator: '|',
				rules: [
					{ id: '1', value: 'branch=master', negated: false },
					{ id: '2', value: 'stable', negated: true }
				]
			},
			'branch'
		);

		expect(expression).toEqual('branch=master | !stable');
	});

	it('parses simple flat expression to builder format', () => {
		const parsed = parseFlatBuilderExpression('alpha & !beta', 'tag');

		expect(parsed).toBeTruthy();
		expect(parsed?.operator).toEqual('&');
		expect(parsed?.rules.map((rule) => [rule.value, rule.negated])).toEqual([
			['alpha', false],
			['beta', true]
		]);
	});

	it('returns null for mixed expression that cannot be flattened', () => {
		const parsed = parseFlatBuilderExpression('alpha & (beta | gamma)', 'tag');

		expect(parsed).toBeNull();
	});

	it('validates verdict expression examples', () => {
		expect(
			getExpressionValidationError('None | "Unexpectedly failed"', 'verdict')
		).toBeUndefined();
		expect(
			getExpressionValidationError('None | Unexpectedly failed', 'verdict')
		).toBeTruthy();
	});
});
