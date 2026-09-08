/* SPDX-License-Identifier: Apache-2.0 */
/* SPDX-FileCopyrightText: 2026 OKTET LTD */
import { useMemo } from 'react';

import { useGetIssueRulesQuery } from '@/services/bublik-api';

export interface TestOption {
	id: number;
	name: string;
}

const ALL = 10000;

/**
 * The tests the project's rules already target, by id.
 *
 * Two limitations, both the server's, both documented in
 * `docs/classification-api-gaps.md`:
 *
 * - the options are labelled `Test #42`, because `/issue_rules/` returns no
 *   `test_name` — `IssueRuleViewSet` annotates one for ordering but
 *   `IssueRuleSerializer.Meta.fields` omits it, and nothing else maps a test id
 *   to a name;
 * - a test with no rule yet cannot be picked at all, because a rules listing is
 *   the only place the UI ever sees a test id.
 *
 * Both disappear the moment `test_name` is serialized. Until then, the way to
 * write a rule for a test the project has never classified is to capture one
 * from a result through the classify drawer, which resolves the test itself.
 */
export function useKnownTests(projectId?: number): {
	options: TestOption[];
	isLoading: boolean;
} {
	const { data, isFetching } = useGetIssueRulesQuery({
		projectId,
		page: 1,
		pageSize: ALL
	});

	const options = useMemo(() => {
		const ids = new Set<number>();

		data?.results.forEach((rule) => {
			if (rule.test == null) return;

			ids.add(rule.test);
		});

		return [...ids]
			.sort((a, b) => a - b)
			.map((id) => ({ id, name: `Test #${id}` }));
	}, [data]);

	return { options, isLoading: isFetching };
}
