/* SPDX-License-Identifier: Apache-2.0 */
/* SPDX-FileCopyrightText: 2024-2026 OKTET LTD */
import { NodeEntity, RunData, RunsData } from '@/shared/types';

type RunsProgressTrend = 'added' | 'removed' | 'improved' | 'regressed' | 'changed' | 'same';

// Whether a higher metric value is better, worse, or carries no good/bad meaning.
// Drives both the change-aware cell tone and the per-cell trend arrow.
type RunsProgressTrendDirection =
	| 'higher-is-better'
	| 'lower-is-better'
	| 'neutral';

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
	objective?: string;
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
	RunsProgressTrend,
	RunsProgressTrendDirection
};
