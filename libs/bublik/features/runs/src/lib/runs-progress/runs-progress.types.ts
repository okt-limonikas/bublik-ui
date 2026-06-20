/* SPDX-License-Identifier: Apache-2.0 */
/* SPDX-FileCopyrightText: 2024-2026 OKTET LTD */
import { NodeEntity, RunData, RunsData } from '@/shared/types';

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
	type: NodeEntity;
	path: string[];
	depth: number;
	cells: RunsProgressCell[];
	children: RunsProgressRow[];
};

type RunsProgressRun = {
	run: RunsData;
	root: RunData;
	/** Set when runs are grouped by a metadata key; equal ids share a group. */
	groupId?: string;
};

type RunsProgressGroup = {
	id: string;
	label: string;
	/** Index of the group's first run within the ordered runs array. */
	startIndex: number;
	runCount: number;
};

type RunsProgressFilterSummary = {
	label: string;
	value: string;
};

export type {
	RunsProgressCell,
	RunsProgressFilterSummary,
	RunsProgressGroup,
	RunsProgressRow,
	RunsProgressRun,
	RunsProgressTrend
};
