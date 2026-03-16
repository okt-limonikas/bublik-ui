/* SPDX-License-Identifier: Apache-2.0 */
/* SPDX-FileCopyrightText: 2024-2026 OKTET LTD */
import { test, expect } from '@playwright/test';

import { readManifest } from './helpers/manifest';
import { HistoryPage } from './page-objects/history-page.pom';

function getTestPath(): string {
	const manifest = readManifest();
	if (manifest) {
		for (const bundle of manifest.bundles) {
			for (const run of bundle.expectedRuns) {
				const failed =
					run.sampleTests.expectedFailed || run.sampleTests.unexpectedFailed;
				if (failed && failed.length > 0) {
					return failed[0].pathStr || failed[0].path.join('/');
				}
				const passed =
					run.sampleTests.expectedPassed || run.sampleTests.unexpectedPassed;
				if (passed && passed.length > 0) {
					return passed[0].pathStr || passed[0].path.join('/');
				}
			}
		}
	}
	return 'net-drv-ts/rx_path/rx_fcs';
}

test.describe('History Page', () => {
	test('submits global search form and sends the expected history request', async ({
		page
	}) => {
		test.setTimeout(30_000);
		const historyPage = new HistoryPage(page);
		const testPath = getTestPath();

		await historyPage.goto();
		await historyPage.expectReady();
		await historyPage.openGlobalSearchForm();
		await historyPage.globalSearchForm.fillTestPath(testPath);
		await historyPage.globalSearchForm.applySearch();

		await expect(page).toHaveURL(/\/history/, { timeout: 15_000 });
		await historyPage.globalSearchForm.expectHidden();
	});
});
