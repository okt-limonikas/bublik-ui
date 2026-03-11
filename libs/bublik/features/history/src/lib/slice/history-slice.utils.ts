/* SPDX-License-Identifier: Apache-2.0 */
/* SPDX-FileCopyrightText: 2021-2023 OKTET Labs Ltd. */
import { parse } from 'date-fns';

import {
	API_DATE_FORMAT,
	config,
	DEFAULT_HISTORY_END_DATE,
	DEFAULT_HISTORY_START_DATE,
	DEFAULT_RESULT_PROPERTIES,
	DEFAULT_RESULT_TYPES,
	DEFAULT_RUN_PROPERTIES
} from '@/bublik/config';
import {
	HistoryAPIBackendQuery,
	HistoryAPIQuery,
	RESULT_PROPERTIES,
	VERDICT_TYPE
} from '@/shared/types';
import { BadgeItem } from '@/shared/tailwind-ui';
import { formatTimeToAPI } from '@/shared/utils';

import { HistoryGlobalSearchFormValues } from '../history-global-search-form';
import {
	HistoryGlobalFilter,
	HistorySearchFormState
} from './history-slice.types';

export const parseArray = (str?: string) => {
	if (!str) return [];

	return str.split(config.queryDelimiter);
};

export const arrayToBadgeItem = (array: string[]): BadgeItem[] => {
	return array.map((value) => ({ id: value, value }));
};

export const badgeItemToArray = (items: BadgeItem[]): string[] => {
	return items.map((item) => item.value);
};

export const arrayToString = (array: string[]): string | undefined => {
	if (!array.length) return undefined;

	return array.join(config.queryDelimiter);
};

const withDefault = <T>(
	value: T,
	defaultVal: NonNullable<T>
): NonNullable<T> => {
	if (!value) return defaultVal;

	return value;
};

export const queryToHistorySearchState = (
	query: HistoryAPIBackendQuery
): HistorySearchFormState => {
	const startDate = query.fromDate
		? parse(query.fromDate, API_DATE_FORMAT, new Date())
		: DEFAULT_HISTORY_START_DATE;

	const finishDate = query.toDate
		? parse(query.toDate, API_DATE_FORMAT, new Date())
		: DEFAULT_HISTORY_END_DATE;

	return {
		labels: withDefault(parseArray(query.labels), []),
		testArgExpr: withDefault(query.testArgExpr, ''),
		/* Test section */
		testName: withDefault(query.testName, ''),
		hash: withDefault(query.hash, ''),
		parameters: withDefault(parseArray(query.testArgs), []),
		revisions: withDefault(parseArray(query.revisions), []),
		branches: withDefault(parseArray(query.branches), []),
		/* Run section */
		startDate,
		finishDate,
		runData: withDefault(parseArray(query.tags), []),
		tagExpr: withDefault(query.tagExpr, ''),
		runIds: withDefault(parseArray(query.runIds), []),
		branchExpr: withDefault(query.branchExpr, ''),
		verdictExpr: withDefault(query.verdictExpr, ''),
		revisionExpr: withDefault(query.revExpr, ''),
		labelExpr: withDefault(query.labelExpr, ''),
		/* Result section */
		runProperties: withDefault(parseArray(query.runProperties), []),
		resultProperties: withDefault(parseArray(query.resultTypes), []),
		results: withDefault(parseArray(query.resultStatuses), []),
		/* Verdict section */
		verdictLookup: withDefault(query.verdictLookup, VERDICT_TYPE.String),
		verdict: withDefault(parseArray(query.verdict), [])
	};
};

export const historySearchStateToForm = (
	state: HistorySearchFormState
): HistoryGlobalSearchFormValues => {
	return {
		labelExpr: state.labelExpr,
		branchExpr: state.branchExpr,
		verdictExpr: state.verdictExpr,
		testArgExpr: state.testArgExpr,
		revisionExpr: state.revisionExpr,
		/* Test section */
		testName: state.testName,
		hash: state.hash,
		parameters: arrayToBadgeItem(state.parameters),
		revisions: arrayToBadgeItem(state.revisions),
		branches: arrayToBadgeItem(state.branches),
		labels: arrayToBadgeItem(state.labels),
		/* Run section */
		runData: arrayToBadgeItem(state.runData),
		runIds: state.runIds?.join(config.queryDelimiter) ?? '',
		tagExpr: state.tagExpr,
		dates: { startDate: state.startDate, endDate: state.finishDate },
		/* Result section */
		resultProperties: state.resultProperties,
		runProperties: state.runProperties,
		results: state.results,
		/* Verdict section */
		verdictLookup: state.verdictLookup,
		verdict: arrayToBadgeItem(state.verdict)
	};
};

export function searchQueryToBackendQuery(
	query: HistoryAPIQuery
): HistoryAPIBackendQuery {
	return {
		testName: query.testName,
		hash: query.hash,
		testArgs: query.parameters,
		revisions: query.revisions,
		branches: query.branches,
		labels: query.labels,
		/* Run section */
		tags: query.runData,
		tagExpr: query.tagExpr,
		branchExpr: query.branchExpr,
		labelExpr: query.labelExpr,
		testArgExpr: query.testArgExpr,
		revExpr: query.revisionExpr,
		verdictExpr: query.verdictExpr,
		fromDate: query.startDate,
		toDate: query.finishDate,
		runIds: query.runIds,
		/* Result section */
		resultTypes: query.resultProperties,
		runProperties: query.runProperties,
		resultStatuses: query.results,
		/* Verdict section */
		verdictLookup: query.verdictLookup,
		verdict: query.verdict,
		page: query.page,
		pageSize: query.pageSize,
		projects: query.project ? [Number(query.project)] : undefined
	};
}

export const historySearchStateToQuery = (
	state: HistorySearchFormState
): HistoryAPIQuery => {
	return {
		/* Test section */
		testName: state.testName,
		hash: state.hash,
		labels: withDefault(arrayToString(state.labels), ''),
		parameters: withDefault(arrayToString(state.parameters), ''),
		revisions: withDefault(arrayToString(state.revisions), ''),
		branches: withDefault(arrayToString(state.branches), ''),
		/* Run section */
		runData: withDefault(arrayToString(state.runData), ''),
		tagExpr: withDefault(state.tagExpr, ''),
		branchExpr: withDefault(state.branchExpr, ''),
		labelExpr: withDefault(state.labelExpr, ''),
		testArgExpr: withDefault(state.testArgExpr, ''),
		revisionExpr: withDefault(state.revisionExpr, ''),
		verdictExpr: withDefault(state.verdictExpr, ''),
		startDate: formatTimeToAPI(state.startDate),
		finishDate: formatTimeToAPI(state.finishDate),
		runIds: withDefault(arrayToString(state.runIds), ''),
		/* Result section */
		resultProperties: withDefault(arrayToString(state.resultProperties), ''),
		runProperties: withDefault(arrayToString(state.runProperties), ''),
		results: withDefault(arrayToString(state.results), ''),
		/* Verdict section */
		verdictLookup: state.verdictLookup,
		verdict: withDefault(arrayToString(state.verdict), '')
	};
};

export const formToSearchState = (
	form: HistoryGlobalSearchFormValues
): Omit<HistorySearchFormState, 'page' | 'pageSize'> => {
	const dates = form.dates ?? {
		startDate: DEFAULT_HISTORY_START_DATE,
		endDate: DEFAULT_HISTORY_END_DATE
	};

	return {
		labels: badgeItemToArray(form.labels),
		labelExpr: form.labelExpr,
		/* Test section */
		testName: form.testName,
		hash: form.hash,
		parameters: badgeItemToArray(form.parameters),
		revisions: badgeItemToArray(form.revisions),
		branches: badgeItemToArray(form.branches),
		/* Run section */
		startDate: dates.startDate,
		finishDate: dates.endDate,
		runData: badgeItemToArray(form.runData),
		runIds: form.runIds.split(config.queryDelimiter),
		tagExpr: form.tagExpr,
		revisionExpr: form.revisionExpr,
		testArgExpr: form.testArgExpr,
		verdictExpr: form.verdictExpr,
		branchExpr: form.branchExpr,
		/* Result section */
		runProperties: form.runProperties,
		resultProperties: form.resultProperties,
		results: form.results,
		/* Verdict section */
		verdictLookup: form.verdictLookup,
		verdict: badgeItemToArray(form.verdict)
	};
};

export const getEffectiveHistorySearchForm = (
	searchState: HistorySearchFormState,
	globalFilter: HistoryGlobalFilter
): HistoryGlobalSearchFormValues => {
	const formFromSearchState = historySearchStateToForm(searchState);

	const parameters = arrayToBadgeItem(
		Array.from(
			new Set([
				...badgeItemToArray(formFromSearchState.parameters),
				...globalFilter.parameters
			])
		)
	);

	const verdict = arrayToBadgeItem(
		Array.from(
			new Set([
				...badgeItemToArray(formFromSearchState.verdict),
				...globalFilter.verdicts
			])
		)
	);

	const runData = arrayToBadgeItem(
		Array.from(
			new Set([
				...badgeItemToArray(formFromSearchState.runData),
				...globalFilter.tags
			])
		)
	);

	const results = globalFilter.resultType
		? [globalFilter.resultType]
		: formFromSearchState.results.length
			? formFromSearchState.results
			: DEFAULT_RESULT_TYPES;

	const resultProperties =
		globalFilter.isNotExpected !== null
			? globalFilter.isNotExpected
				? [RESULT_PROPERTIES.Unexpected]
				: [RESULT_PROPERTIES.Expected]
			: formFromSearchState.resultProperties.length
				? formFromSearchState.resultProperties
				: DEFAULT_RESULT_PROPERTIES;

	const runProperties = formFromSearchState.runProperties.length
		? formFromSearchState.runProperties
		: DEFAULT_RUN_PROPERTIES;

	return {
		...formFromSearchState,
		parameters,
		verdict,
		runData,
		results,
		resultProperties,
		runProperties
	};
};

export const applyGlobalFilterToSearchState = (
	searchState: HistorySearchFormState,
	globalFilter: HistoryGlobalFilter
): HistorySearchFormState => {
	const nextResults =
		globalFilter.resultType !== null
			? [globalFilter.resultType]
			: searchState.results.length
				? searchState.results
				: DEFAULT_RESULT_TYPES;

	const nextResultProperties =
		globalFilter.isNotExpected !== null
			? globalFilter.isNotExpected
				? [RESULT_PROPERTIES.Unexpected]
				: [RESULT_PROPERTIES.Expected]
			: searchState.resultProperties.length
				? searchState.resultProperties
				: DEFAULT_RESULT_PROPERTIES;

	return {
		...searchState,
		parameters: globalFilter.parameters,
		runData: globalFilter.tags,
		verdict: globalFilter.verdicts,
		results: nextResults,
		resultProperties: nextResultProperties
	};
};

type ComparableHistorySearchForm = {
	testName: string;
	hash: string;
	parameters: string[];
	startDate: string;
	finishDate: string;
	runData: string[];
	runIds: string[];
	tagExpr: string;
	branches: string[];
	revisions: string[];
	runProperties: string[];
	resultProperties: string[];
	results: string[];
	verdict: string[];
	branchExpr: string;
	verdictExpr: string;
	revisionExpr: string;
	testArgExpr: string;
	labels: string[];
	labelExpr: string;
	verdictLookup: VERDICT_TYPE;
};

const normalizeStringArray = (values: string[]): string[] => {
	return values
		.map((value) => value.trim())
		.filter(Boolean)
		.sort((left, right) => left.localeCompare(right));
};

const normalizeBadgeItemArray = (items: BadgeItem[]): string[] => {
	return normalizeStringArray(badgeItemToArray(items));
};

const normalizeDelimitedString = (value: string): string[] => {
	return normalizeStringArray(value.split(config.queryDelimiter));
};

export const getComparableHistorySearchForm = (
	searchState: HistorySearchFormState,
	globalFilter: HistoryGlobalFilter
): ComparableHistorySearchForm => {
	const form = getEffectiveHistorySearchForm(searchState, globalFilter);
	const dates = form.dates ?? {
		startDate: DEFAULT_HISTORY_START_DATE,
		endDate: DEFAULT_HISTORY_END_DATE
	};

	return {
		testName: form.testName.trim(),
		hash: form.hash.trim(),
		parameters: normalizeBadgeItemArray(form.parameters),
		startDate: formatTimeToAPI(dates.startDate),
		finishDate: formatTimeToAPI(dates.endDate),
		runData: normalizeBadgeItemArray(form.runData),
		runIds: normalizeDelimitedString(form.runIds),
		tagExpr: form.tagExpr.trim(),
		branches: normalizeBadgeItemArray(form.branches),
		revisions: normalizeBadgeItemArray(form.revisions),
		runProperties: normalizeStringArray(form.runProperties),
		resultProperties: normalizeStringArray(form.resultProperties),
		results: normalizeStringArray(form.results),
		verdict: normalizeBadgeItemArray(form.verdict),
		branchExpr: form.branchExpr.trim(),
		verdictExpr: form.verdictExpr.trim(),
		revisionExpr: form.revisionExpr.trim(),
		testArgExpr: form.testArgExpr.trim(),
		labels: normalizeBadgeItemArray(form.labels),
		labelExpr: form.labelExpr.trim(),
		verdictLookup: form.verdictLookup
	};
};
