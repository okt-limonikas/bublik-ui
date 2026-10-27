/* SPDX-License-Identifier: Apache-2.0 */
/* SPDX-FileCopyrightText: 2026 OKTET LTD */
import { describe, expect, it } from 'vitest';

import { getSourceBrowserUrl } from './import-event-table-utils';

describe('getSourceBrowserUrl', () => {
	it('opens an S3 source through Bublik', () => {
		expect(
			getSourceBrowserUrl(
				's3://bublik-logs/uploads/ts/2026/09/23/cfg-10:00:00/'
			)
		).toBe(
			'/api/v2/logs/s3/bublik-logs/uploads/ts/2026/09/23/cfg-10%3A00%3A00/'
		);
	});

	it('keeps other URLs as they are', () => {
		const url = 'https://logs.example/run/1/';
		expect(getSourceBrowserUrl(url)).toBe(url);
	});
});
