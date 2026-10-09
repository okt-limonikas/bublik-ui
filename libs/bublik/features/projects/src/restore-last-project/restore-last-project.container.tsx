/* SPDX-License-Identifier: Apache-2.0 */
/* SPDX-FileCopyrightText: 2024-2026 OKTET LTD */
import { PropsWithChildren, useEffect, useState } from 'react';
import { useRouter, type AnyRouter } from '@tanstack/react-router';

import { currentLocation, parseSearch, useRenderedLocation } from '@/router';

import {
	readLastProjectIds,
	withLastProjectIds
} from '../lib/last-project.utils';

/**
 * Opens a fresh tab on the project last picked in the sidebar when its URL
 * names none. It runs once on mount, so choosing All later is not undone, and
 * holds the page back until then so nothing loads unscoped first.
 */
function RestoreLastProjectContainer({ children }: PropsWithChildren) {
	const router = useRouter<AnyRouter>();
	const { searchStr } = useRenderedLocation();
	const [restored] = useState(() =>
		withLastProjectIds(new URLSearchParams(searchStr), readLastProjectIds())
	);
	const [isPending, setIsPending] = useState(restored !== null);

	useEffect(() => {
		if (!restored) return;

		void router.navigate({
			to: currentLocation(router).pathname,
			search: parseSearch(restored.toString()),
			replace: true,
			resetScroll: false
		});
		setIsPending(false);
		// eslint-disable-next-line react-hooks/exhaustive-deps -- once per mount
	}, []);

	if (isPending) return null;

	return children;
}

export { RestoreLastProjectContainer };
