/* SPDX-License-Identifier: Apache-2.0 */
/* SPDX-FileCopyrightText: 2026 OKTET LTD */
import { describe, expect, it } from 'vitest';

import {
	ColumnsParam,
	ExpandedParam
} from './classification-table.params';

describe('ColumnsParam', () => {
	it('stays out of the URL when nothing has been chosen', () => {
		expect(ColumnsParam.encode({})).toBeUndefined();
	});

	it('writes a sign per column, sorted so one choice is one URL', () => {
		expect(ColumnsParam.encode({ verdicts: true, active: false })).toBe(
			'-active;+verdicts'
		);
		expect(ColumnsParam.encode({ active: false, verdicts: true })).toBe(
			'-active;+verdicts'
		);
	});

	it('round-trips', () => {
		const overrides = { tags: false, verdicts: true };

		expect(ColumnsParam.decode(ColumnsParam.encode(overrides))).toEqual(
			overrides
		);
	});

	it('reads an absent or empty param as no choices at all', () => {
		expect(ColumnsParam.decode(undefined)).toEqual({});
		expect(ColumnsParam.decode('')).toEqual({});
	});

	it('ignores entries without a sign rather than guessing', () => {
		expect(ColumnsParam.decode('tags;+verdicts;-')).toEqual({ verdicts: true });
	});

	it('takes the first value when the param is repeated', () => {
		expect(ColumnsParam.decode(['-tags', '+verdicts'])).toEqual({ tags: false });
	});
});

describe('ExpandedParam', () => {
	// A link to "this issue's results" has to be a link, and a reload must not
	// collapse what was open — so the open rows live in the URL like every other
	// piece of table state.
	it('encodes the open rows as a `;`-joined list', () => {
		expect(ExpandedParam.encode({ '56': true, '72': true })).toBe('56;72');
	});

	it('leaves closed rows out rather than writing them as false', () => {
		expect(ExpandedParam.encode({ '56': true, '72': false })).toBe('56');
	});

	it('writes nothing when everything is closed', () => {
		expect(ExpandedParam.encode({})).toBeUndefined();
		expect(ExpandedParam.encode({ '56': false })).toBeUndefined();
	});

	// `true` means "every row", which cannot survive a page or filter change —
	// the rows it named may not be there on the way back.
	it('writes nothing for the expand-everything state', () => {
		expect(ExpandedParam.encode(true)).toBeUndefined();
	});

	it('decodes back to the record TanStack expects', () => {
		expect(ExpandedParam.decode('56;72')).toEqual({ '56': true, '72': true });
	});

	it('decodes an absent or empty param to nothing open', () => {
		expect(ExpandedParam.decode(undefined)).toEqual({});
		expect(ExpandedParam.decode('')).toEqual({});
		expect(ExpandedParam.decode(';;')).toEqual({});
	});
});
