/* SPDX-License-Identifier: Apache-2.0 */
/* SPDX-FileCopyrightText: 2024-2026 OKTET LTD */
import { createFileRoute, redirect } from '@tanstack/react-router';

import { parseId } from '@/router';
import { isLogPageMode, LogPageMode } from '@/shared/types';

import { NoMatchFeature } from '../../../pages/not-found-page';
import { logSearch } from '../../-search/log.search';

// `/log/:runId/:old` predates the `mode` param; the backend still sends
// `/log/:id/treeAndinfoAndlog` and `/log/:id/infoAndlog` here. A layout in
// `:old` becomes the one `mode`; anything else keeps the search's own mode or
// falls back to the tree, info and log, as these links always opened. The
// hash is kept and the entry is replaced.
export const Route = createFileRoute('/_app/log/$runId/$old')({
	params: {
		parse: ({ runId, old }) => ({ runId: parseId(runId), old }),
		stringify: ({ runId, old }) => ({ runId: String(runId), old })
	},
	validateSearch: logSearch.validateSearch,
	search: { middlewares: logSearch.middlewares },
	beforeLoad: ({ params, search, location }) => {
		const mode = isLogPageMode(params.old)
			? params.old
			: search.mode ?? LogPageMode.TreeAndInfoAndLog;

		throw redirect({
			to: '/log/$runId',
			params: { runId: params.runId },
			search: { ...search, mode },
			hash: location.hash,
			replace: true
		});
	},
	notFoundComponent: NoMatchFeature
});
