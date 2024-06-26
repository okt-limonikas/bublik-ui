/* SPDX-License-Identifier: Apache-2.0 */
/* SPDX-FileCopyrightText: 2021-2023 OKTET Labs Ltd. */
import { z } from 'zod';

import { BadgeItem } from '@/shared/tailwind-ui';
import { VERDICT_TYPE } from '@/shared/types';
import {
	DEFAULT_RESULT_PROPERTIES,
	DEFAULT_RESULT_TYPES,
	DEFAULT_RUN_PROPERTIES
} from '@/bublik/config';

export const ValidationSchema = z
	.object({
		testName: z.string().min(1, { message: 'Test name is required!' }),
		runProperties: z
			.array(z.string())
			.min(1, { message: 'Please specify is run compromised or not' }),
		resultProperties: z
			.array(z.string())
			.min(1, { message: 'Please specify result type' }),
		results: z
			.array(z.string())
			.min(1, { message: 'Please specify obtained results' })
	})
	.catchall(z.any());

export interface HistoryGlobalSearchFormValues {
	testName: string;
	hash: string;
	parameters: BadgeItem[];
	dates: { startDate: Date; endDate: Date };
	runData: BadgeItem[];
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
	testName: '',
	results: DEFAULT_RESULT_TYPES,
	runData: [],
	parameters: [],
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
