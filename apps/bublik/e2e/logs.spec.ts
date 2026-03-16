/* SPDX-License-Identifier: Apache-2.0 */
/* SPDX-FileCopyrightText: 2024-2026 OKTET LTD */
import { writeFileSync, existsSync, mkdirSync } from 'fs';
import { expect, Page, test } from '@playwright/test';

import { readManifest, BundleEntry } from './helpers/manifest';
import { ImportPage } from './page-objects/import-page.pom';
import { API_PREFIX } from './constants';

const manifest = readManifest();

if (!manifest) {
	throw new Error('BUBLIK_E2E_RUN_OVERVIEW not set or manifest is empty.');
}

const E2E_PROJECT = 'bublik-e2e';

type RunsResponse =
	| { results?: Array<{ id?: number }> }
	| Array<{ id?: number }>;

type DashboardResponse = {
	rows?: Array<{ context?: { run_id?: number } }>;
};

function persistManifest(): void {
	const manifestPath = process.env['BUBLIK_E2E_RUN_OVERVIEW'];

	if (!manifestPath) return;

	const parts = manifestPath.split('/');

	const dir = parts.slice(0, -1).join('/') || '.';

	if (!existsSync(dir)) {
		mkdirSync(dir, { recursive: true });
	}

	writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
}

async function findImportedRunId(
	page: Page,
	bundle: BundleEntry
): Promise<number> {
	return page.evaluate(
		async ({ expectedRunName }) => {
			const origin = window.location.origin;
			const runsRes = await fetch(`${origin}/api/v2/runs/`, {
				credentials: 'include'
			});
			const runs = (await runsRes.json()) as RunsResponse;
			const runList = Array.isArray(runs) ? runs : runs.results ?? [];
			const runIds = runList
				.map((run) => run.id ?? 0)
				.filter((runId) => runId > 0);

			const details = await Promise.all(
				runIds.map(async (runId) => {
					const detailRes = await fetch(
						`${origin}/api/v2/runs/${runId}/details/`,
						{
							credentials: 'include'
						}
					);
					return { runId, detail: await detailRes.json() };
				})
			);

			return (
				details.find(({ detail }) => detail?.main_package === expectedRunName)
					?.runId ?? 0
			);
		},
		{ expectedRunName: bundle.expectedRuns[0].name }
	);
}

async function importBundleViaUi(
	page: Page,
	bundle: BundleEntry,
	force = false
): Promise<void> {
	const importPage = new ImportPage(page);

	await importPage.goto();
	await importPage.openImportForm();
	await importPage.selectProject(E2E_PROJECT);
	await importPage.fillUrl(0, bundle.importUrl);
	if (force) {
		await importPage.enableForceImport();
	}
	await importPage.submit();
	await importPage.closeResultModal();
}

async function isRunVisibleOnDashboard(
	page: Page,
	runId: number,
	dashboardDate: string
): Promise<boolean> {
	return page.evaluate(
		async ({ dashboardDate, runId }) => {
			const origin = window.location.origin;
			const params = new URLSearchParams({ date: dashboardDate });
			const response = await fetch(`${origin}/api/v2/dashboard/?${params}`, {
				credentials: 'include'
			});

			if (!response.ok) return false;

			const dashboard = (await response.json()) as DashboardResponse | null;

			return Boolean(
				dashboard?.rows?.some((row) => row.context?.run_id === runId)
			);
		},
		{ dashboardDate, runId }
	);
}

async function ensureImportedRun(
	page: Page,
	bundle: BundleEntry
): Promise<number> {
	await page.goto('dashboard');
	const dashboardDate = bundle.expectedRuns[0].dashboardDate;
	let runId = await findImportedRunId(page, bundle);

	if (runId === 0) {
		await importBundleViaUi(page, bundle);
	} else if (!(await isRunVisibleOnDashboard(page, runId, dashboardDate))) {
		await importBundleViaUi(page, bundle, true);
	}

	await expect
		.poll(() => findImportedRunId(page, bundle), {
			timeout: 300_000,
			intervals: [1000, 2000, 5000]
		})
		.toBeGreaterThan(0);

	runId = await findImportedRunId(page, bundle);
	await expect
		.poll(() => isRunVisibleOnDashboard(page, runId, dashboardDate), {
			timeout: 300_000,
			intervals: [1000, 2000, 5000]
		})
		.toBe(true);
	bundle.runId = runId;
	persistManifest();
	return runId;
}

function sampleCases(bundle: BundleEntry) {
	return bundle.expectedRuns.flatMap((expectedRun, runIndex) =>
		Object.entries({
			expectedPassed: 'Expected PASSED',
			unexpectedPassed: 'Unexpected PASSED',
			expectedFailed: 'Expected FAILED',
			unexpectedFailed: 'Unexpected FAILED',
			expectedSkipped: 'Expected SKIPPED',
			unexpectedSkipped: 'Unexpected SKIPPED',
			expectedKilled: 'Expected KILLED',
			expectedCored: 'Expected CORED',
			abnormal: 'ABNORMAL'
		}).flatMap(([category, label]) =>
			(expectedRun.sampleTests[category] ?? []).slice(0, 1).map((sample) => ({
				label,
				runIndex,
				testName: sample.name || sample.pathStr,
				sample
			}))
		)
	);
}

test.describe('E2E: Import Fixtures & Verify Runs', () => {
	for (let i = 0; i < manifest.bundles.length; i++) {
		const bundleIndex = i;
		const bundle = manifest.bundles[bundleIndex];

		test(`import bundle "${bundle.id}" via UI`, async ({ page }) => {
			test.setTimeout(300_000);
			const runId = await ensureImportedRun(page, bundle);
			expect(runId).toBeGreaterThan(0);
		});

		for (let j = 0; j < bundle.expectedRuns.length; j++) {
			const runIndex = j;
			const expectedRun = bundle.expectedRuns[runIndex];

			test(`[${bundle.id}] dashboard contains imported run`, async ({
				page,
				request
			}) => {
				const runId = await ensureImportedRun(page, bundle);
				const response = await request.get(
					`${API_PREFIX}/dashboard/?date=${expectedRun.dashboardDate}`
				);
				expect(response.ok()).toBeTruthy();
				const dashboard = (await response.json()) as DashboardResponse;
				expect(
					dashboard.rows?.some((row) => row.context?.run_id === runId)
				).toBe(true);
			});

			test(`[${bundle.id}] run details endpoint returns name`, async ({
				page,
				request
			}) => {
				const runId = await ensureImportedRun(page, bundle);
				const response = await request.get(
					`${API_PREFIX}/runs/${runId}/details/`
				);
				expect(response.ok()).toBeTruthy();
				const details = await response.json();
				expect(details.main_package || details.name).toBe(expectedRun.name);
			});

			test(`[${bundle.id}] run stats endpoint returns data`, async ({
				page,
				request
			}) => {
				const runId = await ensureImportedRun(page, bundle);
				const response = await request.get(
					`${API_PREFIX}/runs/${runId}/stats/`
				);
				expect(response.ok()).toBeTruthy();
			});

			test(`[${bundle.id}] run page loads with name`, async ({ page }) => {
				const runId = await ensureImportedRun(page, bundle);
				await page.goto(`runs/${runId}`);
				await expect(
					page.getByText(expectedRun.name, { exact: false }).first()
				).toBeVisible({ timeout: 15_000 });
			});

			test(`[${bundle.id}] run page renders expanded tree`, async ({
				page
			}) => {
				const runId = await ensureImportedRun(page, bundle);
				await page.goto(`runs/${runId}`);
				await page.getByRole('button', { name: 'Preview NOK' }).click();
				await expect(page.getByText('throughput_rw').first()).toBeVisible({
					timeout: 15_000
				});
				await expect(
					page.getByText('power_cycle_recovery').first()
				).toBeVisible();
			});

			for (const { label, testName } of sampleCases(bundle).filter(
				(sampleCase) => sampleCase.runIndex === runIndex
			)) {
				test(`[${bundle.id}] result "${testName}" -> ${label}`, async ({
					page,
					request
				}) => {
					const runId = await ensureImportedRun(page, bundle);
					const response = await request.get(
						`${API_PREFIX}/results/?run_id=${runId}&test_name=${encodeURIComponent(
							testName
						)}`
					);
					expect(response.ok()).toBeTruthy();
					const data = await response.json();
					expect(data.results).toEqual(expect.any(Array));
					expect(data.results.length).toBeGreaterThan(0);
				});
			}
		}
	}
});
