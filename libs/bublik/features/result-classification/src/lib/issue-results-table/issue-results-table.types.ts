/* SPDX-License-Identifier: Apache-2.0 */
/* SPDX-FileCopyrightText: 2026 OKTET LTD */
import type { RunDataResults } from '@/shared/types';

export type ResultRow = RunDataResults;

export interface IssueResultsProps {
	issueId: number;
	projectId?: number;
	runId?: number | string;
}
