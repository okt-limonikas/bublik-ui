/* SPDX-License-Identifier: Apache-2.0 */
/* SPDX-FileCopyrightText: 2026 OKTET LTD */
import type { VisibilityState } from '@tanstack/react-table';

export const COLUMN_ID = {
	STATUS: 'status',
	ACTIONS: 'actions',
	KEY: 'key',
	ISSUE: 'issue',
	DESCRIPTION: 'description',
	CREATED: 'created',
	STATE: 'state',
	PROJECT: 'issue_project',
	CATEGORIES: 'categories',
	RULES: 'rules'
} as const;

/**
 * The columns DRF's `OrderingFilter` can actually sort, and the field name it
 * knows each by. Anything absent orders by its own id; `IssueViewSet` takes
 * `created_at`, `updated_at`, `title` and `state`.
 */
export const ORDERING_BY_COLUMN_ID: Record<string, string | null> = {
	[COLUMN_ID.ISSUE]: 'title',
	[COLUMN_ID.CREATED]: 'created_at',
	[COLUMN_ID.STATE]: 'state'
};

export const DEFAULT_COLUMN_VISIBILITY: VisibilityState = {
	[COLUMN_ID.CREATED]: false
};

export const COLUMN_VISIBILITY_KEY = 'issues';

export const FILTER_KEYS = [
	COLUMN_ID.STATE,
	COLUMN_ID.PROJECT,
	COLUMN_ID.CATEGORIES,
	COLUMN_ID.RULES
] as const;

export const DEFAULT_PAGE_SIZE = 100;
