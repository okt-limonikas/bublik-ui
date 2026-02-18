/* SPDX-License-Identifier: Apache-2.0 */
/* SPDX-FileCopyrightText: 2024-2026 OKTET LTD */

import { describe, expect, it } from 'vitest';

import { RESULT_PROPERTIES, RESULT_TYPE } from '@/shared/types';

import {
	DEFAULT_GLOBAL_FILTER,
	DEFAULT_SEARCH_FORM_STATE,
	HISTORY_SLICE_NAME
} from './history-slice';
import { selectHistoryForm } from './history-slice.selectors';
import {
	AppStateWithHistorySlice,
	HistorySliceState
} from './history-slice.types';

const createState = (
	overrides: Partial<HistorySliceState> = {}
): AppStateWithHistorySlice => ({
	[HISTORY_SLICE_NAME]: {
		isGlobalSearchFormOpen: false,
		hasSearchFormDraft: false,
		globalFilter: { ...DEFAULT_GLOBAL_FILTER },
		searchForm: { ...DEFAULT_SEARCH_FORM_STATE },
		...overrides
	}
});

describe('selectHistoryForm', () => {
	it('returns draft values when search form has unsaved edits', () => {
		const state = createState({
			hasSearchFormDraft: true,
			searchForm: {
				...DEFAULT_SEARCH_FORM_STATE,
				parameters: ['draft-parameter'],
				runData: ['draft-tag'],
				verdict: ['draft-verdict'],
				results: [RESULT_TYPE.Passed],
				resultProperties: [RESULT_PROPERTIES.Expected]
			},
			globalFilter: {
				...DEFAULT_GLOBAL_FILTER,
				parameters: ['global-parameter'],
				tags: ['global-tag'],
				verdicts: ['global-verdict'],
				resultType: RESULT_TYPE.Failed,
				isNotExpected: true
			}
		});

		const form = selectHistoryForm(state);

		expect(form.parameters.map(({ value }) => value)).toEqual([
			'draft-parameter'
		]);
		expect(form.runData.map(({ value }) => value)).toEqual(['draft-tag']);
		expect(form.verdict.map(({ value }) => value)).toEqual(['draft-verdict']);
		expect(form.results).toEqual([RESULT_TYPE.Passed]);
		expect(form.resultProperties).toEqual([RESULT_PROPERTIES.Expected]);
	});

	it('merges global filter values when there is no unsaved draft', () => {
		const state = createState({
			hasSearchFormDraft: false,
			searchForm: {
				...DEFAULT_SEARCH_FORM_STATE,
				parameters: ['draft-parameter'],
				runData: ['draft-tag'],
				verdict: ['draft-verdict'],
				results: [RESULT_TYPE.Passed],
				resultProperties: [RESULT_PROPERTIES.Expected]
			},
			globalFilter: {
				...DEFAULT_GLOBAL_FILTER,
				parameters: ['global-parameter'],
				tags: ['global-tag'],
				verdicts: ['global-verdict'],
				resultType: RESULT_TYPE.Failed,
				isNotExpected: true
			}
		});

		const form = selectHistoryForm(state);

		expect(form.parameters.map(({ value }) => value)).toEqual([
			'draft-parameter',
			'global-parameter'
		]);
		expect(form.runData.map(({ value }) => value)).toEqual([
			'draft-tag',
			'global-tag'
		]);
		expect(form.verdict.map(({ value }) => value)).toEqual([
			'draft-verdict',
			'global-verdict'
		]);
		expect(form.results).toEqual([RESULT_TYPE.Failed]);
		expect(form.resultProperties).toEqual([RESULT_PROPERTIES.Unexpected]);
	});
});
