/* SPDX-License-Identifier: Apache-2.0 */
/* SPDX-FileCopyrightText: 2024-2026 OKTET LTD */

import { describe, expect, it } from 'vitest';

import { HistoryAPIQuery, VERDICT_TYPE } from '@/shared/types';

import { HistorySearchFormState } from './history-slice.types';
import {
	historySearchStateToQuery,
	queryToHistorySearchState,
	searchQueryToBackendQuery
} from './history-slice.utils';

/**
 * The history query survives three renames on its way to the backend:
 *
 *   URL key --searchQueryToBackendQuery--> backend key --decamelizeKeys--> wire key
 *   parameters -------------------------> testArgs ------------------------> test_args
 *
 * The second hop lives in the API layer (`prepareForSend`), so these tests own
 * the first one. Nothing validates the URL at runtime — `useHistoryQuery` does
 * `Object.fromEntries(searchParams)` and hands the result straight over — so a
 * key renamed on one side only produces no type error and no runtime error,
 * just a filter that silently stops being applied. That is what the round trip
 * at the bottom of this file exists to catch.
 */

/** A state with every field populated, so no assertion passes by being empty. */
function fullSearchState(): HistorySearchFormState {
	return {
		/* Test section */
		testName: 'net-drv-ts/rx_path/rx_fcs',
		hash: '3c447d65a665c0eee17a0a20827e9',
		parameters: ['time_limit=30', 'pkt_size=1500'],
		revisions: ['8af383125f20cc5ecdb8393bf'],
		branches: ['main', 'next'],
		labels: ['nightly'],
		/* Run section */
		// Local midnight, because both the formatter and the parser are
		// local-time (`yyyy-MM-dd` via date-fns) — a UTC date would drift.
		startDate: new Date(2026, 3, 21),
		finishDate: new Date(2026, 3, 28),
		runData: ['medford', 'x86_64'],
		runIds: ['101', '102'],
		tagExpr: 'medford & !debug',
		/* Result section */
		runProperties: ['not-compromised'],
		resultProperties: ['expected', 'unexpected'],
		results: ['PASSED', 'FAILED'],
		/* Verdict section */
		verdictLookup: VERDICT_TYPE.Regex,
		verdict: ['iperf failed', 'timeout'],
		branchExpr: 'main | next',
		verdictExpr: 'timeout',
		revisionExpr: 'rev > 100',
		testArgExpr: 'pkt_size > 1000',
		labelExpr: 'nightly'
	};
}

describe('searchQueryToBackendQuery', () => {
	it('renames the URL parameters the backend spells differently', () => {
		const query: HistoryAPIQuery = {
			parameters: 'time_limit=30;pkt_size=1500',
			runData: 'medford;x86_64',
			startDate: '2026-04-21',
			finishDate: '2026-04-28',
			resultProperties: 'expected;unexpected',
			results: 'PASSED;FAILED',
			revisionExpr: 'rev > 100'
		};

		expect(searchQueryToBackendQuery(query)).toMatchObject({
			testArgs: 'time_limit=30;pkt_size=1500',
			tags: 'medford;x86_64',
			fromDate: '2026-04-21',
			toDate: '2026-04-28',
			resultTypes: 'expected;unexpected',
			resultStatuses: 'PASSED;FAILED',
			revExpr: 'rev > 100'
		});
	});

	it('keeps the name of every parameter the backend spells the same', () => {
		const query: HistoryAPIQuery = {
			testName: 'net-drv-ts/rx_path/rx_fcs',
			hash: '3c447d65a665c0eee17a0a20827e9',
			revisions: '8af383125f20cc5ecdb8393bf',
			branches: 'main;next',
			labels: 'nightly',
			tagExpr: 'medford & !debug',
			labelExpr: 'nightly',
			branchExpr: 'main | next',
			verdictExpr: 'timeout',
			testArgExpr: 'pkt_size > 1000',
			runProperties: 'not-compromised',
			runIds: '101;102',
			verdictLookup: VERDICT_TYPE.Regex,
			verdict: 'iperf failed;timeout',
			page: '2',
			pageSize: '10'
		};

		expect(searchQueryToBackendQuery(query)).toMatchObject({
			testName: 'net-drv-ts/rx_path/rx_fcs',
			hash: '3c447d65a665c0eee17a0a20827e9',
			revisions: '8af383125f20cc5ecdb8393bf',
			branches: 'main;next',
			labels: 'nightly',
			tagExpr: 'medford & !debug',
			labelExpr: 'nightly',
			branchExpr: 'main | next',
			verdictExpr: 'timeout',
			testArgExpr: 'pkt_size > 1000',
			runProperties: 'not-compromised',
			runIds: '101;102',
			verdictLookup: VERDICT_TYPE.Regex,
			verdict: 'iperf failed;timeout',
			page: '2',
			pageSize: '10'
		});
	});

	// The sidebar writes `project` as a repeatable string; the endpoint takes an
	// array of numbers and unwraps the first one again before sending.
	it('lifts the project id into the array the endpoint expects', () => {
		expect(searchQueryToBackendQuery({ project: '3' }).projects).toEqual([3]);
	});

	it('leaves the project out entirely when the URL does not scope one', () => {
		expect(searchQueryToBackendQuery({}).projects).toBeUndefined();
	});
});

describe('historySearchStateToQuery', () => {
	it('writes every search form parameter into the query', () => {
		const query = historySearchStateToQuery(fullSearchState());

		expect(Object.keys(query).sort()).toEqual(
			[
				'branchExpr',
				'branches',
				'finishDate',
				'hash',
				'labelExpr',
				'labels',
				'parameters',
				'results',
				'resultProperties',
				'revisionExpr',
				'revisions',
				'runData',
				'runIds',
				'runProperties',
				'startDate',
				'tagExpr',
				'testArgExpr',
				'testName',
				'verdict',
				'verdictExpr',
				'verdictLookup'
			].sort()
		);
	});

	it('joins list parameters on the query delimiter and formats dates for the API', () => {
		const query = historySearchStateToQuery(fullSearchState());

		expect(query.parameters).toBe('time_limit=30;pkt_size=1500');
		expect(query.runData).toBe('medford;x86_64');
		expect(query.results).toBe('PASSED;FAILED');
		expect(query.startDate).toBe('2026-04-21');
		expect(query.finishDate).toBe('2026-04-28');
	});

	// Empty values are written as '' rather than dropped, which is why a submit
	// puts ~21 keys in the URL even when the user filled in only a test path.
	// Asserting that the keys are absent would fail against today's app.
	it('writes empty parameters as empty values instead of dropping them', () => {
		const query = historySearchStateToQuery({
			...fullSearchState(),
			hash: '',
			branches: [],
			verdict: []
		});

		expect(query.hash).toBe('');
		expect(query.branches).toBe('');
		expect(query.verdict).toBe('');
	});
});

describe('the history query round trip', () => {
	/*
	 * state -> URL -> backend -> state. Every rename has to be applied in both
	 * directions to survive this, so renaming a key in only one of
	 * `historySearchStateToQuery` / `searchQueryToBackendQuery` /
	 * `queryToHistorySearchState` fails here and names the field.
	 */
	it('returns the state it started from', () => {
		const state = fullSearchState();

		const restored = queryToHistorySearchState(
			searchQueryToBackendQuery(historySearchStateToQuery(state))
		);

		expect(restored).toEqual(state);
	});

	it('restores a state whose narrowing fields are all empty', () => {
		const state: HistorySearchFormState = {
			...fullSearchState(),
			hash: '',
			parameters: [],
			revisions: [],
			branches: [],
			labels: [],
			runData: [],
			runIds: [],
			tagExpr: '',
			runProperties: [],
			resultProperties: [],
			results: [],
			verdict: [],
			branchExpr: '',
			verdictExpr: '',
			revisionExpr: '',
			testArgExpr: '',
			labelExpr: ''
		};

		const restored = queryToHistorySearchState(
			searchQueryToBackendQuery(historySearchStateToQuery(state))
		);

		expect(restored).toEqual(state);
	});
});
