/* SPDX-License-Identifier: Apache-2.0 */
/* SPDX-FileCopyrightText: 2026 OKTET LTD */
import { describe, expect, it } from 'vitest';

import { issueRulesParams, issuesParams } from './classification-endpoints';

const BASE = { page: 1, pageSize: 100 };

describe('issuesParams', () => {
	it('sends a single category — the server compares it with `=`', () => {
		expect(issuesParams({ ...BASE, category: ['env'] })).toMatchObject({
			category: 'env'
		});
	});

	// A `;`-joined value matches no row, so asking would return an empty page
	// for a selection that has plenty. The table filters the loaded page instead.
	it('withholds a multi-select category rather than asking for nothing', () => {
		expect(
			issuesParams({ ...BASE, category: ['env', 'flaky'] }).category
		).toBeUndefined();
	});

	it('withholds an empty selection', () => {
		expect(issuesParams({ ...BASE, category: [] }).category).toBeUndefined();
		expect(issuesParams(BASE).category).toBeUndefined();
	});

	it('sends state as a list — that one the server does split', () => {
		expect(issuesParams({ ...BASE, state: ['open', 'closed'] })).toMatchObject({
			state: 'open;closed'
		});
	});

	it('sends search and ordering through untouched', () => {
		expect(
			issuesParams({ ...BASE, search: '#42', ordering: '-created_at' })
		).toMatchObject({ search: '#42', ordering: '-created_at' });
	});

	it('drops an empty search rather than filtering on ""', () => {
		expect(issuesParams({ ...BASE, search: '' }).search).toBeUndefined();
	});
});

describe('issueRulesParams', () => {
	it('sends active as a list and category/expected singly', () => {
		expect(
			issueRulesParams({
				...BASE,
				active: ['true', 'false'],
				category: ['flaky'],
				expected: ['expected']
			})
		).toMatchObject({
			active: 'true;false',
			category: 'flaky',
			expected: 'expected'
		});
	});

	it('withholds a multi-select expected — it is a three-way choice', () => {
		expect(
			issueRulesParams({ ...BASE, expected: ['expected', 'none'] }).expected
		).toBeUndefined();
	});

	it('scopes to one issue when asked', () => {
		expect(issueRulesParams({ ...BASE, issue: 12 })).toMatchObject({
			issue: 12
		});
	});
});
