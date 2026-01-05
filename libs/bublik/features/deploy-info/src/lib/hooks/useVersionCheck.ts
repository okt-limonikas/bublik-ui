/* SPDX-License-Identifier: Apache-2.0 */
/* SPDX-FileCopyrightText: 2021-2023 OKTET Labs Ltd. */
import { useState, useEffect, useCallback } from 'react';

import { config } from '@/bublik/config';

interface GitInfo {
	date: string;
	summary: string;
	revision: string;
	branch: string;
	latestTag: string;
}

interface UseVersionCheckOptions {
	currentRevision: string;
}

interface UseVersionCheckResult {
	hasUpdate: boolean;
	newVersion: GitInfo | null;
	isChecking: boolean;
	error: Error | null;
	checkForUpdate: () => Promise<void>;
	dismiss: () => void;
}

export function useVersionCheck(
	options: UseVersionCheckOptions
): UseVersionCheckResult {
	const { currentRevision } = options;

	const [hasUpdate, setHasUpdate] = useState(false);
	const [newVersion, setNewVersion] = useState<GitInfo | null>(null);
	const [isChecking, setIsChecking] = useState(false);
	const [error, setError] = useState<Error | null>(null);
	const [isDismissed, setIsDismissed] = useState(false);

	const checkForUpdate = useCallback(async () => {
		if (isChecking) return;

		setIsChecking(true);
		setError(null);

		try {
			const timestamp = Date.now();
			const url = `${config.baseUrl}/public/git-info.json?t=${timestamp}`;

			const response = await fetch(url, {
				cache: 'no-store',
				headers: { 'Cache-Control': 'no-cache' }
			});

			if (!response.ok) {
				throw new Error(`Failed to fetch version: ${response.status}`);
			}

			const serverVersion: GitInfo = await response.json();

			if (serverVersion.revision !== currentRevision) {
				setNewVersion(serverVersion);
				setHasUpdate(true);
			}
		} catch (err) {
			setError(err instanceof Error ? err : new Error('Unknown error'));
		} finally {
			setIsChecking(false);
		}
	}, [currentRevision, isChecking]);

	useEffect(() => {
		checkForUpdate();
	}, []);

	useEffect(() => {
		const handleVisibilityChange = () => {
			if (document.visibilityState === 'visible' && !isDismissed) {
				checkForUpdate();
			}
		};

		document.addEventListener('visibilitychange', handleVisibilityChange);
		return () => {
			document.removeEventListener('visibilitychange', handleVisibilityChange);
		};
	}, [checkForUpdate, isDismissed]);

	const dismiss = useCallback(() => {
		setIsDismissed(true);
		setHasUpdate(false);
	}, []);

	return {
		hasUpdate: hasUpdate && !isDismissed,
		newVersion,
		isChecking,
		error,
		checkForUpdate,
		dismiss
	};
}
