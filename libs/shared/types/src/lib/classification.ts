/* SPDX-License-Identifier: Apache-2.0 */
/* SPDX-FileCopyrightText: 2026 OKTET Labs Ltd. */

export type IssueCategory =
	| 'product-defect'
	| 'test-bug'
	| 'env'
	| 'known-issue'
	| 'flaky'
	| 'to-investigate';

export type IssueState = 'open' | 'closed';

/**
 * A `(category, expected)` pair. An issue carries no classification of its own —
 * category and disposition live on its rules — so both `/issues/` and
 * `/runs/{id}/issues/` describe an issue by the distinct pairs its *active*
 * rules hold.
 */
export interface IssueCategoryRef {
	category: IssueCategory;
	expected: boolean | null;
}

export type Issue = {
	id: number;
	project: number;
	title: string;
	description: string | null;
	state: IssueState;
	/**
	 * External bug reference in `ref://TRACKER/KEY` form, or null when unlinked.
	 * There is no tracker-cache row behind it: the key *is* the reference.
	 */
	bug_key: string | null;
	/** `bug_key` resolved against the project's tracker config, or null. */
	bug_url: string | null;
	categories: IssueCategoryRef[];
	rule_count: number;
	active_rule_count: number;
	created_at: string;
	updated_at: string;
	closed_at: string | null;
	/**
	 * TODO(api): distinct results stamped under this issue. `IssueSerializer`
	 * annotates the two rule counts but not this one, so the issues table shows
	 * nothing rather than guessing from the page it happens to hold.
	 */
	result_count?: number;
};

/** DRF's list envelope — `bublik/core/pagination.py`. */
export interface PaginatedResponse<T> {
	pagination: { count: number; next: string | null; previous: string | null };
	results: T[];
}

/**
 * The summary every bulk action returns — `close`/`reopen` on issues,
 * `activate`/`deactivate` on rules. `unchanged` counts rows that were already in
 * the requested state, which is why "nothing happened" is a success, not an
 * error.
 */
export interface BulkActionResult {
	requested: number;
	updated: number;
	unchanged: number;
	not_found: number;
}

/**
 * Facet counts computed over the whole filtered set rather than the current
 * page. Once paging moves server-side the page cannot answer "how many closed
 * issues are there", and a facet labelled with a page-local count is worse than
 * one with no count at all.
 *
 * TODO(api): `GET /issues/facets`.
 */
export interface IssueFacets {
	state: Record<string, number>;
	categories: Record<string, number>;
	rules: Record<string, number>;
}

export type IssueRule = {
	id: number;
	/** Read through `issue.project_id`; a rule has no project of its own. */
	project: number;
	issue: number;
	/**
	 * Read through the linked issue, so a rules list needs no join to name the
	 * issue it belongs to or to link out to the tracker.
	 */
	issue_title: string;
	bug_key: string | null;
	bug_url: string | null;
	category: IssueCategory;
	expected: boolean | null;
	active: boolean;
	test: number;
	/**
	 * The matcher. Every criterion is exact and an empty one is *ignored* —
	 * which is also what a stored rule's "match scope" is: the set of these
	 * three that carry anything. There are no `match_*` flags on the wire; those
	 * belong to the classify request, where they choose what gets captured from
	 * the result into these fields. See `chipsForRule`.
	 *
	 * TODO(api): there is no `test_name`. `IssueRuleViewSet` annotates one, but
	 * only to make `ordering=test_name` legal — `IssueRuleSerializer.Meta.fields`
	 * omits it, so a rule cannot name its own test. Adding it there is what lets
	 * the Test column and standalone rule authoring come back.
	 */
	parameters: Record<string, string>;
	verdicts: string[];
	tags: string[];
};

export type RuleResultOrigin = 'import' | 'manual_persistent' | 'manual_oneoff';

/** Per-result classification badge data (embedded in run result rows). */
export type ResultIssueRef = {
	issue_id: number;
	issue_title: string;
	issue_state: IssueState;
	/** External bug key (e.g. ISSUE-240); populated in history rows. */
	bug_key?: string | null;
	category: IssueCategory;
	expected: boolean | null;
	rule_id: number;
	origin: RuleResultOrigin;
};

export interface RunIssueRow {
	issue_id: number;
	title: string;
	description: string | null;
	state: IssueState;
	/** External tracker key, e.g. `ref://JIRA/FOO-123`. */
	bug_key: string | null;
	/** Resolved tracker URL for `bug_key`, when the project can resolve it. */
	bug_url: string | null;
	/** Distinct results in this run stamped under this issue. */
	result_count: number;
	categories: IssueCategoryRef[];
}

export interface RunIssueResultRow {
	result_id: number;
	/** Test name. The run tree folds this into `path`; here it stays separate. */
	name: string | null;
	/** Package chain only, top-down — the test's own name is **not** included. */
	path: string[];
	obtained_result: string | null;
	verdicts: string[];
}

/**
 * The same row seen from the issue rather than from one run, so it has to say
 * which run each result came from. Served by `GET /results/?issue={id}`.
 */
export interface IssueResultRow extends RunIssueResultRow {
	run_id: number;
}

export interface IssuePickerOption {
	id: number;
	title: string;
	key: string | null;
	category: IssueCategory | null;
}

export type ClassifyScope = 'future' | 'oneoff';

/**
 * Matcher **overrides** for a classify request, in the server's own spelling.
 *
 * `ResultViewSet.classify` reads each key with a default drawn from the result
 * itself, so the three states are: key absent → capture that criterion from the
 * result; key present and empty → ignore that criterion; key present with a
 * value → use exactly that. There are no `match_*` booleans; sending them is
 * how the UI used to *silently* get the default capture every time.
 */
export interface ClassifyMatcherOverride {
	parameters?: Record<string, string>;
	verdicts?: string[];
	tags?: string[];
}

export type ClassifyRequest = {
	resultId: number;
	projectId: number;
	/**
	 * An existing issue ID, or the data to create one. `project` is **not** part
	 * of the create payload — the server takes it from the result being
	 * classified, and an existing issue from another project is rejected.
	 */
	issue: number | { title: string; description?: string; bug_key?: string };
	category: IssueCategory;
	expected?: boolean | null;
	scope: ClassifyScope;
	matcher?: ClassifyMatcherOverride;
};

/**
 * Authoring payloads for `/issues/` and `/issue_rules/`.
 *
 * Snake_case, like `ClassifyRequest` — these go on the wire as written, and
 * keeping them in the server's spelling is what stops a field quietly missing
 * its target. `projectId` is the exception: it is a *query* param, not a body
 * field, because `@check_action_permission('manage_issues')` reads `?project=`.
 */
export interface CreateIssueRequest {
	projectId?: number;
	title: string;
	description?: string | null;
	/** `ref://TRACKER/KEY`, or null for none. */
	bug_key?: string | null;
}

export interface UpdateIssueRequest {
	issueId: number;
	projectId?: number;
	title?: string;
	description?: string | null;
	/**
	 * Omit entirely unless the key actually changed. The serializer's guard
	 * fires on the key being *present*, not on its value differing, so sending
	 * the current key back on an issue that has classified results is a 400.
	 */
	bug_key?: string | null;
}

/**
 * `project` is not accepted: it is read-only on the serializer
 * (`source='issue.project_id'`), so a rule's project is always its issue's.
 */
export interface CreateRuleRequest {
	projectId?: number;
	issue: number;
	test: number;
	category: IssueCategory;
	expected?: boolean | null;
	parameters?: Record<string, string>;
	verdicts?: string[];
	tags?: string[];
}

/**
 * Category and disposition only. The matcher fields — `issue`, `test`,
 * `parameters`, `verdicts`, `tags` — are rejected *once the rule has stamps*,
 * with "Create a new rule instead"; keeping them off the body is what stops the
 * guard firing on a rule that has them. `active` is read-only and moves through
 * activate/deactivate.
 */
export interface UpdateRuleRequest {
	ruleId: number;
	projectId?: number;
	category?: IssueCategory;
	expected?: boolean | null;
}

/** An issue that classifies at least one result of a given test. */
export interface IssueSearchOption {
	id: number;
	title: string;
	bug_key: string | null;
}
