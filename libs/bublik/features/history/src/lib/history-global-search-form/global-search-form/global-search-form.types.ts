/* SPDX-License-Identifier: Apache-2.0 */
/* SPDX-FileCopyrightText: 2024-2026 OKTET LTD */
import { z } from 'zod';

import { BadgeItem, FilterMode } from '@/shared/tailwind-ui';
import { VERDICT_TYPE } from '@/shared/types';
import {
	DEFAULT_RESULT_PROPERTIES,
	DEFAULT_RESULT_TYPES,
	DEFAULT_RUN_PROPERTIES
} from '@/bublik/config';

export const ValidationSchema = z
	.object({
		testName: z.string().min(1, { message: 'Test name is required' }),
		runProperties: z
			.array(z.string())
			.min(1, { message: 'Select at least one run property option' }),
		resultProperties: z
			.array(z.string())
			.min(1, { message: 'Select at least one result type classification' }),
		results: z
			.array(z.string())
			.min(1, { message: 'Select at least one obtained result type' })
	})
	.catchall(z.any());

export type FilterFieldName =
	| 'parameters'
	| 'labels'
	| 'branches'
	| 'revisions'
	| 'runData'
	| 'verdict';

export type FilterFieldModes = Record<FilterFieldName, FilterMode>;

export const defaultFieldModes = (
	overrides: Partial<FilterFieldModes> = {}
): FilterFieldModes => ({
	parameters: 'tokens',
	labels: 'tokens',
	branches: 'tokens',
	revisions: 'tokens',
	runData: 'tokens',
	verdict: 'tokens',
	...overrides
});

export interface HistoryGlobalSearchFormValues {
	fieldModes: FilterFieldModes;
	testName: string;
	hash: string;
	parameters: BadgeItem[];
	dates?: { startDate: Date; endDate: Date };
	runData: BadgeItem[];
	runIds: string;
	tagExpr: string;
	branches: BadgeItem[];
	revisions: BadgeItem[];
	runProperties: string[];
	resultProperties: string[];
	results: string[];
	verdict: BadgeItem[];
	branchExpr: string;
	verdictExpr: string;
	revisionExpr: string;
	testArgExpr: string;
	labels: BadgeItem[];
	labelExpr: string;
	verdictLookup: VERDICT_TYPE;
}

export const defaultValues: HistoryGlobalSearchFormValues = {
	fieldModes: defaultFieldModes(),
	testName: '',
	results: DEFAULT_RESULT_TYPES,
	runData: [],
	parameters: [],
	runIds: '',
	labels: [],
	hash: '',
	dates: { startDate: new Date(), endDate: new Date() },
	revisions: [],
	tagExpr: '',
	branches: [],
	runProperties: DEFAULT_RUN_PROPERTIES,
	verdictLookup: VERDICT_TYPE.String,
	verdict: [],
	resultProperties: DEFAULT_RESULT_PROPERTIES,
	branchExpr: '',
	verdictExpr: '',
	revisionExpr: '',
	testArgExpr: '',
	labelExpr: ''
};
