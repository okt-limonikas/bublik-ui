/* SPDX-License-Identifier: Apache-2.0 */
/* SPDX-FileCopyrightText: 2026 OKTET LTD */
import type { Issue } from '@/shared/types';

import { CATEGORY_ORDER } from '../classification/classification.constants';
import { issueRulesState } from '../classification/classification.utils';
import { makeSearchFilter } from '../classification-table/classification-table.utils';
import type { IssueTableRow } from './issues-table.types';

/**
 * `/issues/` carries the categories, the rule counts and the resolved tracker
 * URL itself, so a row is the issue plus the few things only the table cares
 * about: the display order of the badges, the derived rules state, and the
 * project's name.
 *
 * An issue belongs to exactly one project, so `projectNames` is a list of one —
 * it stays a list because the column renders a chip per entry.
 */
export function buildRows(
	issues: Issue[],
	projectNames: Map<number, string>
): IssueTableRow[] {
	return issues.map((issue) => {
		const categories = [...issue.categories].sort(
			(a, b) =>
				CATEGORY_ORDER.indexOf(a.category) - CATEGORY_ORDER.indexOf(b.category)
		);

		return {
			...issue,
			categories,
			ruleCount: issue.rule_count,
			activeRuleCount: issue.active_rule_count,
			rulesState: issueRulesState({
				state: issue.state,
				total: issue.rule_count,
				active: issue.active_rule_count
			}).value,
			bugKey: issue.bug_key,
			bugUrl: issue.bug_url,
			projectNames: [
				projectNames.get(issue.project) ?? `Project #${issue.project}`
			]
		};
	});
}

export const searchFilter = makeSearchFilter<IssueTableRow>((issue) => [
	issue.title,
	issue.description,
	issue.bugKey,
	`#${issue.id}`
]);
