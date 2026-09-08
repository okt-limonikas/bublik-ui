/* SPDX-License-Identifier: Apache-2.0 */
/* SPDX-FileCopyrightText: 2026 OKTET LTD */
import type { VisibilityState } from '@tanstack/react-table';

export const COLUMN_ID = {
	STATUS: 'status',
	PROJECT: 'rule_project',
	ACTIONS: 'actions',
	KEY: 'key',
	ISSUE: 'issue',
	ISSUE_STATE: 'issueState',
	CATEGORY: 'category',
	DISPOSITION: 'disposition',
	SCOPE: 'scope',
	ACTIVE: 'active',
	TAGS: 'tags',
	VERDICTS: 'verdicts',
	PARAMETERS: 'parameters',
	EXPANDER: 'expander'
} as const;

const BADGE_TRACK = 'auto';

/**
 * Grid tracks, one per column.
 *
 * Issue is the one flexible track, and only the all-rules view has it: with
 * every track capped the end gutter took the whole surplus, and once Test was
 * gone and the matcher columns started hidden the table sat at roughly half the
 * container. The per-issue view keeps the gutter — it shows badges and little
 * else, so there is nothing there that wants the room.
 *
 * Match Scope is `max-content` rather than capped: its chips must not wrap, so
 * the track has to fit the widest set rather than clip it.
 *
 * Every other track is capped. One that could grow without limit would swallow
 * whatever the hidden columns left behind, which is how Test and Issue used to
 * stretch across a third of the screen each as soon as Tags, Verdicts and
 * Parameters were switched off.
 */
export const COLUMN_WIDTH: Record<string, string> = {
	[COLUMN_ID.PROJECT]: BADGE_TRACK,
	[COLUMN_ID.ACTIVE]: BADGE_TRACK,
	[COLUMN_ID.DISPOSITION]: BADGE_TRACK,
	[COLUMN_ID.KEY]: BADGE_TRACK,
	[COLUMN_ID.ISSUE]: 'minmax(12rem, 1fr)',
	[COLUMN_ID.ISSUE_STATE]: BADGE_TRACK,
	[COLUMN_ID.CATEGORY]: BADGE_TRACK,
	[COLUMN_ID.SCOPE]: 'minmax(7rem, max-content)',
	[COLUMN_ID.TAGS]: 'minmax(9rem, 20rem)',
	[COLUMN_ID.VERDICTS]: 'minmax(12rem, 28rem)',
	[COLUMN_ID.PARAMETERS]: 'minmax(12rem, 28rem)'
};

/**
 * The matcher columns start hidden.
 *
 * They are the widest thing the table can show and the least often read: what a
 * rule matches on is a detail you go looking for on one rule, not something you
 * scan a page of rules for. The Match Scope chips already say *which* criteria
 * a rule gates on, and the row detail panel spells out their values, so nothing
 * is unreachable — the column visibility control brings them back, and the
 * choice is remembered per table.
 */
export const DEFAULT_COLUMN_VISIBILITY: VisibilityState = {
	[COLUMN_ID.ACTIVE]: false,
	[COLUMN_ID.TAGS]: false,
	[COLUMN_ID.VERDICTS]: false,
	[COLUMN_ID.PARAMETERS]: false
};

/**
 * The columns that fold into the row detail panel when the table is compact,
 * in the order they appear there.
 */
export const DETAIL_COLUMN_IDS: string[] = [
	COLUMN_ID.SCOPE,
	COLUMN_ID.TAGS,
	COLUMN_ID.VERDICTS,
	COLUMN_ID.PARAMETERS
];

/** What `DEFAULT_COLUMN_VISIBILITY` becomes once the table runs out of room. */
export const COMPACT_COLUMN_VISIBILITY: VisibilityState = {
	...DEFAULT_COLUMN_VISIBILITY,
	...Object.fromEntries(DETAIL_COLUMN_IDS.map((id) => [id, false]))
};

/**
 * Roughly the sum of the column minimums for each view — below it the grid
 * overflows and the wide columns would scroll off-screen unreachably, so they
 * fold into the detail panel instead. The all-rules view needs more room
 * because it also carries Key, Issue and State.
 *
 * Measured against the *default* visible set, which no longer includes Test
 * (`9rem`) or the three matcher columns (`12rem` + `12rem` + `9rem`). Held
 * above the bare minimum so that turning a matcher column back on still folds
 * on a genuinely narrow window rather than overflowing.
 */
export const COMPACT_WIDTH_PX = {
	ALL_RULES: 1000,
	ONE_ISSUE: 700
} as const;

export const FILTER_KEYS = [
	COLUMN_ID.PROJECT,
	COLUMN_ID.ISSUE_STATE,
	COLUMN_ID.CATEGORY,
	COLUMN_ID.DISPOSITION,
	COLUMN_ID.ACTIVE,
	COLUMN_ID.TAGS,
	COLUMN_ID.VERDICTS,
	COLUMN_ID.PARAMETERS
] as const;

/**
 * The columns DRF's `OrderingFilter` can actually sort, and the field name it
 * knows each by. `IssueRuleViewSet.ordering_fields` also lists `test_name`, but
 * no column reads it — the serializer does not return the name.
 */
export const ORDERING_BY_COLUMN_ID: Record<string, string | null> = {
	[COLUMN_ID.ISSUE]: 'issue_title',
	[COLUMN_ID.CATEGORY]: 'category',
	[COLUMN_ID.ACTIVE]: 'active',
	// Not an ordering field: rules are grouped by project through a filter.
	[COLUMN_ID.PROJECT]: null
};

export const ACTIVE_ORDER = ['true', 'false'] as const;

export type ActiveKey = (typeof ACTIVE_ORDER)[number];

export const COLUMN_VISIBILITY_KEY = {
	ALL_RULES: 'issue-rules-all-v2',
	ONE_ISSUE: 'issue-rules-v2'
} as const;

export const DEFAULT_PAGE_SIZE = 100;
