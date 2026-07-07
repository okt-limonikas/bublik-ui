/* SPDX-License-Identifier: Apache-2.0 */
/* SPDX-FileCopyrightText: 2024-2026 OKTET LTD */
import { useMemo } from 'react';
import { useFormContext, useWatch } from 'react-hook-form';

import {
	useGetMetasSearchOptionsQuery,
	useGetParamsSearchOptionsQuery
} from '@/services/bublik-api';
import { useProjectSearch } from '@/bublik/features/projects';
import { SuggestionGroup } from '@/shared/tailwind-ui';

import {
	FilterFieldName,
	HistoryGlobalSearchFormValues
} from '../global-search-form.types';

export type SearchSuggestions = Record<FilterFieldName, SuggestionGroup[]>;

export const useSearchSuggestions = (): SearchSuggestions => {
	const { control } = useFormContext<HistoryGlobalSearchFormValues>();
	const testName = useWatch({ control, name: 'testName' });
	const { projectIds } = useProjectSearch();
	const project = projectIds.length ? projectIds[0] : undefined;

	const { data: metas } = useGetMetasSearchOptionsQuery({ project });
	const { data: params = [] } = useGetParamsSearchOptionsQuery(
		{ testName, project },
		{ skip: !testName }
	);

	return useMemo(() => {
		const important = new Set(metas?.tags.important ?? []);
		const relevant = new Set(metas?.tags.relevant ?? []);
		const otherTags = (metas?.tags.all ?? []).filter(
			(tag) => !important.has(tag) && !relevant.has(tag)
		);

		return {
			runData: [
				{
					label: 'Important tags',
					badgeClassName: 'bg-badge-6',
					items: metas?.tags.important ?? []
				},
				{
					label: 'Relevant tags',
					badgeClassName: 'bg-badge-0',
					items: metas?.tags.relevant ?? []
				},
				{ label: 'All tags', badgeClassName: 'bg-badge-0', items: otherTags }
			].filter((group) => group.items.length),
			labels: [
				{
					label: 'Labels',
					badgeClassName: 'bg-badge-0',
					items: metas?.labels ?? []
				}
			].filter((group) => group.items.length),
			branches: [
				{
					label: 'Branches',
					badgeClassName: 'bg-badge-4',
					items: metas?.branches ?? []
				}
			].filter((group) => group.items.length),
			revisions: [
				{
					label: 'Revisions',
					badgeClassName: 'bg-badge-4',
					items: metas?.revisions ?? []
				}
			].filter((group) => group.items.length),
			parameters: [
				{ label: 'Parameters', badgeClassName: 'bg-badge-0', items: params }
			].filter((group) => group.items.length),
			verdict: []
		};
	}, [metas, params]);
};
