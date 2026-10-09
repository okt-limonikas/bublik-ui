/* SPDX-License-Identifier: Apache-2.0 */
/* SPDX-FileCopyrightText: 2026 OKTET LTD */
import { describe, expect, it } from 'vitest';

import { LogPageMode } from '@/shared/types';

import { getUrl } from './index';

describe('getUrl', () => {
	it('opens a tree cell in the given log layout', () => {
		expect(getUrl('tree', 42, LogPageMode.InfoAndLog)).toEqual({
			pathname: '/log/42',
			search: '?mode=infoAndlog',
			hash: ''
		});
	});

	it('names the log-only layout rather than relying on a bare URL', () => {
		expect(getUrl('tree', 42, LogPageMode.Log)).toEqual({
			pathname: '/log/42',
			search: '?mode=log',
			hash: ''
		});
	});

	it('links other cells by their path and run id', () => {
		expect(getUrl('runs', 42, LogPageMode.Log)).toEqual({
			pathname: '/runs/42',
			search: '',
			hash: ''
		});
	});
});
