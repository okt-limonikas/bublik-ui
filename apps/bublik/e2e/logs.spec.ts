/* SPDX-License-Identifier: Apache-2.0 */
/* SPDX-FileCopyrightText: 2024-2026 OKTET LTD */
import { expect, test } from '@playwright/test';

import { BundleEntry, ExpectedRun, readManifest } from './helpers/manifest';
import { DashboardPage } from './page-objects/dashboard-page.pom';
import { RunPage } from './page-objects/run-page.pom';

const manifest = readManifest();

if (!manifest) {
	throw new Error('BUBLIK_E2E_RUN_OVERVIEW not set or manifest is empty.');
}

function getImportedRunId(bundle: BundleEntry): number {
	if (!bundle.runId) {
		throw new Error(
			`Run "${bundle.id}" is not imported. The setup project must import all fixture runs before UI tests start.`
		);
	}

	return bundle.runId;
}

function getNokSampleNames(expectedRun: ExpectedRun): string[] {
	const samples = [
		...(expectedRun.sampleTests.unexpectedPassed ?? []),
		...(expectedRun.sampleTests.unexpectedFailed ?? []),
		...(expectedRun.sampleTests.unexpectedSkipped ?? []),
		...(expectedRun.sampleTests.unexpectedKilled ?? []),
		...(expectedRun.sampleTests.unexpectedCored ?? []),
		...(expectedRun.sampleTests.abnormal ?? [])
	];

	return samples
		.map((sample) => sample.name || sample.pathStr)
		.filter(Boolean)
		.slice(0, 2);
}

test.describe('E2E: Imported Runs UI', () => {
	for (const bundle of manifest.bundles) {
		for (const expectedRun of bundle.expectedRuns) {
			test(`[${bundle.id}] dashboard contains imported run`, async ({
				page
			}) => {
				const runId = getImportedRunId(bundle);
				const dashboardPage = new DashboardPage(page);

				expect(runId).toBeGreaterThan(0);
				await dashboardPage.goto(expectedRun.dashboardDate);
				await dashboardPage.expectRunVisible(runId);
			});

			test(`[${bundle.id}] run page loads with name`, async ({ page }) => {
				const runId = getImportedRunId(bundle);
				const runPage = new RunPage(page);

				expect(runId).toBeGreaterThan(0);
				await runPage.goto(runId);
				await runPage.expectLoaded(expectedRun.name);
			});

			test(`[${bundle.id}] run page renders NOK preview`, async ({ page }) => {
				const runId = getImportedRunId(bundle);
				const runPage = new RunPage(page);
				const sampleNames = getNokSampleNames(expectedRun);

				await runPage.goto(runId);
				await runPage.expectLoaded(expectedRun.name);
				await runPage.previewNok();

				for (const sampleName of sampleNames) {
					await expect(page.getByText(sampleName).first()).toBeVisible({
						timeout: 15_000
					});
				}
			});
		}
	}
});
