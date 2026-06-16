/* SPDX-License-Identifier: Apache-2.0 */
/* SPDX-FileCopyrightText: 2024-2026 OKTET LTD */
import { RunData, RunsData } from '@/shared/types';

type RunsProgressTrend = 'added' | 'removed' | 'improved' | 'regressed' | 'changed' | 'same';

type RunsProgressCell = {
	runId: number;
	node: RunData | null;
	previousNode: RunData | null;
	trend: RunsProgressTrend;
};

type RunsProgressRow = {
	id: string;
	name: string;
	path: string[];
	depth: number;
	cells: RunsProgressCell[];
};

type RunsProgressRun = {
	run: RunsData;
	root: RunData;
};

type RunsProgressFilterSummary = {
	label: string;
	value: string;
};

export type {
	RunsProgressCell,
	RunsProgressFilterSummary,
	RunsProgressRow,
	RunsProgressRun,
	RunsProgressTrend
};
