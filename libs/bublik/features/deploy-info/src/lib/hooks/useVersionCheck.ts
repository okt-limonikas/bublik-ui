/* SPDX-License-Identifier: Apache-2.0 */
/* SPDX-FileCopyrightText: 2021-2023 OKTET Labs Ltd. */
import { useState, useEffect, useCallback, useRef } from 'react';

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
	show: () => void;
}

const DISMISSED_VERSION_KEY = 'bublik_dismissed_version';

function getDismissedVersion(): string | null {
	try {
		return localStorage.getItem(DISMISSED_VERSION_KEY);
	} catch {
		return null;
	}
}

function setDismissedVersion(revision: string): void {
	try {
		localStorage.setItem(DISMISSED_VERSION_KEY, revision);
	} catch {
		// Ignore localStorage errors
	}
}

export function useVersionCheck(
	options: UseVersionCheckOptions
): UseVersionCheckResult {
	const { currentRevision } = options;

	const [hasUpdate, setHasUpdate] = useState(false);
	const [newVersion, setNewVersion] = useState<GitInfo | null>(null);
	const [error, setError] = useState<Error | null>(null);
	const isCheckingRef = useRef(false);

	const checkForUpdate = useCallback(async () => {
		if (isCheckingRef.current) return;

		isCheckingRef.current = true;
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

				// Check if this version was already dismissed
				const dismissedVersion = getDismissedVersion();
				if (dismissedVersion !== serverVersion.revision) {
					setHasUpdate(true);
				}
			}
		} catch (err) {
			setError(err instanceof Error ? err : new Error('Unknown error'));
		} finally {
			isCheckingRef.current = false;
		}
	}, [currentRevision]);

	useEffect(() => {
		checkForUpdate();
	}, [checkForUpdate]);

	useEffect(() => {
		const handleVisibilityChange = () => {
			if (document.visibilityState === 'visible') {
				checkForUpdate();
			}
		};

		document.addEventListener('visibilitychange', handleVisibilityChange);
		return () => {
			document.removeEventListener('visibilitychange', handleVisibilityChange);
		};
	}, [checkForUpdate]);

	const dismiss = useCallback(() => {
		if (newVersion) setDismissedVersion(newVersion.revision);
		setHasUpdate(false);
	}, [newVersion]);

	const show = useCallback(() => {
		if (newVersion && newVersion.revision !== currentRevision) {
			setHasUpdate(true);
		}
	}, [newVersion, currentRevision]);

	return {
		hasUpdate,
		newVersion,
		isChecking: isCheckingRef.current,
		error,
		checkForUpdate,
		dismiss,
		show
	};
}
