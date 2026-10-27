/* SPDX-License-Identifier: Apache-2.0 */
/* SPDX-FileCopyrightText: 2021-2023 OKTET Labs Ltd. */
import { config } from '@/bublik/config';
import { Severity } from '@/shared/types';

export const getSeverityBgColor = (severity: Severity) => {
	const colorMap = new Map<Severity, string>([
		[Severity.DEBUG, 'bg-badge-6'],
		[Severity.ERROR, 'bg-badge-5 text-text-unexpected'],
		[Severity.WARNING, 'bg-bg-warning text-white']
	]);

	return colorMap.get(severity) ?? 'bg-badge-0';
};

/**
 * The URL a browser can open for a run source.
 *
 * Runs uploaded to S3 have `s3://bucket/key` sources, which Bublik serves
 * (as a directory listing for a run's folder) at `api/v2/logs/s3/bucket/key`,
 * the same mapping as the backend's `browser_url`. Other URLs are returned as
 * they are.
 */
export const getSourceBrowserUrl = (url: string): string => {
	const match = /^s3:\/\/([^/]+)\/(.*)$/.exec(url);
	if (!match) return url;

	const [, bucket, key] = match;
	const path = [bucket, ...key.split('/')].map(encodeURIComponent).join('/');

	return `${config.baseUrlApi}/logs/s3/${path}`;
};
