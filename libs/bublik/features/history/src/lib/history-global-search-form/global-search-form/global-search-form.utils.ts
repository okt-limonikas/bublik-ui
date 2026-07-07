/* SPDX-License-Identifier: Apache-2.0 */
/* SPDX-FileCopyrightText: 2021-2023 OKTET Labs Ltd. */
import { nanoid } from '@reduxjs/toolkit';
import { format, parse } from 'date-fns';
import { decamelizeKeys } from 'humps';

import { API_DATE_FORMAT } from '@/bublik/config';
import { BadgeItem } from '@/shared/tailwind-ui';
import { HistoryAPIQuery } from '@/shared/types';

import { HISTORY_CONSTANTS } from './global-search-form.constants';
import {
	FilterFieldModes,
	HistoryGlobalSearchFormValues,
	defaultFieldModes
} from './global-search-form.types';

export const join = (arr: string[]) => arr.join(';');
export const split = (str: string | undefined, fallback: string[] = []) => {
	if (!str) return fallback;

	return str.split(';');
};

const badgesToValues = (badges: BadgeItem[]) => {
	const expressions = badges.map((badge) => badge.value);
	const values = badges.map((badge) => badge.value);

	return [values, expressions] as const;
};

export const valuesToBadges = (
	arr: string | undefined,
	fallback: BadgeItem[] = []
): BadgeItem[] => {
	if (!arr) return fallback;

	return arr.split(';').map((value) => ({ id: nanoid(4), value }));
};

/**
 * Only the side matching the field mode is submitted: tokens mode sends the
 * list param, builder/expression modes send the expression param.
 */
export const gateByFieldMode = (
	mode: FilterFieldModes[keyof FilterFieldModes],
	list: string,
	expr: string
): { list: string; expr: string } =>
	mode === 'tokens' ? { list, expr: '' } : { list: '', expr };

export const fieldModesFromExpressions = (expressions: {
	[K in keyof FilterFieldModes]: string;
}): FilterFieldModes =>
	defaultFieldModes(
		Object.fromEntries(
			Object.entries(expressions)
				.filter(([, expr]) => Boolean(expr))
				.map(([field]) => [field, 'expression'])
		)
	);

export const convertHistoryFormToQuery = (
	values: HistoryGlobalSearchFormValues
): HistoryAPIQuery => {
	const {
		testName,
		hash,
		parameters,
		runData,
		dates,
		runProperties,
		resultProperties,
		results,
		verdictLookup,
		verdict,
		branches,
		revisions,
		branchExpr,
		labelExpr,
		labels,
		revisionExpr,
		tagExpr,
		testArgExpr,
		verdictExpr,
		fieldModes = defaultFieldModes()
	} = values;

	const [simpleParams] = badgesToValues(parameters);
	const [simpleRunData] = badgesToValues(runData);
	const [simpleBranches] = badgesToValues(branches);
	const [simpleRevisions] = badgesToValues(revisions);
	const [simpleVerdicts] = badgesToValues(verdict);
	const [simpleLabels] = badgesToValues(labels);

	const gatedParams = gateByFieldMode(
		fieldModes.parameters,
		join(simpleParams),
		testArgExpr
	);
	const gatedRunData = gateByFieldMode(
		fieldModes.runData,
		join(simpleRunData),
		tagExpr
	);
	const gatedBranches = gateByFieldMode(
		fieldModes.branches,
		join(simpleBranches),
		branchExpr
	);
	const gatedRevisions = gateByFieldMode(
		fieldModes.revisions,
		join(simpleRevisions),
		revisionExpr
	);
	const gatedLabels = gateByFieldMode(
		fieldModes.labels,
		join(simpleLabels),
		labelExpr
	);
	const gatedVerdicts = gateByFieldMode(
		fieldModes.verdict,
		join(simpleVerdicts),
		verdictExpr
	);

	const startDate = dates?.startDate
		? format(dates.startDate, API_DATE_FORMAT)
		: '';
	const finishDate = dates?.endDate
		? format(dates.endDate, API_DATE_FORMAT)
		: '';

	const query: HistoryAPIQuery = {
		testName,
		hash,
		startDate,
		finishDate,
		parameters: gatedParams.list,
		runData: gatedRunData.list,
		branches: gatedBranches.list,
		revisions: gatedRevisions.list,
		runProperties: join(runProperties),
		resultProperties: join(resultProperties),
		results: join(results),
		verdict: gatedVerdicts.list,
		labels: gatedLabels.list,
		verdictLookup,
		branchExpr: gatedBranches.expr,
		labelExpr: gatedLabels.expr,
		revisionExpr: gatedRevisions.expr,
		tagExpr: gatedRunData.expr,
		testArgExpr: gatedParams.expr,
		verdictExpr: gatedVerdicts.expr
	};

	return decamelizeKeys(query, { separator: '_' }) as HistoryAPIQuery;
};

export const getInitialGlobalSearch = (
	historyQuery: HistoryAPIQuery
): HistoryGlobalSearchFormValues => {
	const {
		testName: queryTestName,
		hash: queryHash,
		parameters: queryParameters,
		runData: queryRunData,
		startDate: queryStartDate,
		finishDate: queryFinishDate,
		runIds: queryRunIds,
		runProperties: queryRunProperties,
		resultProperties: queryResultProperties,
		results: queryResults,
		verdictLookup: queryVerdictLookup,
		verdict: queryVerdict,
		branches: queryBranches,
		revisions: queryRevisons,
		tagExpr: queryRunDataExpr,
		labels: queryLabels,
		branchExpr = '',
		labelExpr = '',
		revisionExpr = '',
		testArgExpr = '',
		verdictExpr = ''
	} = historyQuery;

	const runData: BadgeItem[] = split(queryRunData).map((value) => ({
		id: nanoid(4),
		value
	}));

	const startDate = queryStartDate
		? parse(queryStartDate, API_DATE_FORMAT, new Date())
		: HISTORY_CONSTANTS.startDate;

	const endDate = queryFinishDate
		? parse(queryFinishDate, API_DATE_FORMAT, new Date())
		: new Date();

	return {
		fieldModes: fieldModesFromExpressions({
			parameters: testArgExpr,
			labels: labelExpr,
			branches: branchExpr,
			revisions: revisionExpr,
			runData: queryRunDataExpr ?? '',
			verdict: verdictExpr
		}),
		testName: queryTestName ?? '',
		hash: queryHash ?? '',
		parameters: valuesToBadges(queryParameters, []),
		revisions: valuesToBadges(queryRevisons, []),
		branches: valuesToBadges(queryBranches, []),
		labels: valuesToBadges(queryLabels, []),
		branchExpr,
		labelExpr,
		revisionExpr,
		testArgExpr,
		verdictExpr,
		runData,
		runIds: queryRunIds ?? '',
		dates: { startDate, endDate },
		tagExpr: queryRunDataExpr ?? '',
		runProperties: split(queryRunProperties, HISTORY_CONSTANTS.runProperties),
		resultProperties: split(
			queryResultProperties,
			HISTORY_CONSTANTS.resultProperties
		),
		results: split(queryResults, HISTORY_CONSTANTS.results),
		verdictLookup: queryVerdictLookup || HISTORY_CONSTANTS.verdict,
		verdict: valuesToBadges(queryVerdict, [])
	};
};
