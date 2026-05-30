/* SPDX-License-Identifier: Apache-2.0 */
/* SPDX-FileCopyrightText: 2024-2026 OKTET LTD */
import { expect, Page, test as setup } from '@playwright/test';

import { E2E_PROJECT } from './constants';
import { createReferencesConfig } from './helpers/config';
import { getLogsBaseUrl } from './helpers/url';
import { BundleEntry, readManifest, persistManifest } from './helpers/manifest';
import { DashboardPage } from './page-objects/dashboard-page.pom';
import {
	ImportPage,
	ScheduledImportTask
} from './page-objects/import-page.pom';
import { RunPage } from './page-objects/run-page.pom';

// eslint-disable-next-line playwright/expect-expect
setup(
	'Create project, configs and import runs for testing',
	async ({ page }) => {
		setup.setTimeout(600_000);

		await page.goto('auth/login');
		await page.locator('input[name="email"]').fill('admin@bublik.com');
		await page.locator('input[name="password"]').fill('admin');
		await page.getByRole('button', { name: 'Sign in' }).click();
		await page.waitForURL('**/dashboard', { timeout: 15_000 });

		// 1. Create configs
		await ensureProjectExists(page);
		await ensureProjectReferencesConfig(page);

		// 2. Import runs
		await importRuns(page);

		await page.context().storageState({ path: 'e2e/.auth/state.json' });
	}
);

function normalizeImportUrl(value: string): string {
	try {
		const url = new URL(value);
		return `${url.origin}${url.pathname}`.replace(/\/+$/, '');
	} catch {
		return value.replace(/\/+$/, '');
	}
}

async function isBundleAvailable(page: Page, bundle: BundleEntry) {
	const runId = bundle.runId;
	const expectedRun = bundle.expectedRuns[0];

	if (!runId || !expectedRun) return false;

	try {
		const runPage = new RunPage(page);
		const dashboardPage = new DashboardPage(page);

		await runPage.goto(runId);
		await runPage.expectLoaded(expectedRun.name);
		await dashboardPage.goto(expectedRun.dashboardDate);
		await dashboardPage.expectRunVisible(runId);

		return true;
	} catch {
		return false;
	}
}

function mapScheduledTasksToBundles(
	tasks: ScheduledImportTask[],
	bundles: BundleEntry[]
) {
	const bundlesByUrl = new Map(
		bundles.map((bundle) => [normalizeImportUrl(bundle.importUrl), bundle])
	);

	return tasks
		.map((task) => ({
			task,
			bundle: bundlesByUrl.get(normalizeImportUrl(task.runSourceUrl))
		}))
		.filter(
			(item): item is { task: ScheduledImportTask; bundle: BundleEntry } =>
				Boolean(item.bundle)
		);
}

async function importRuns(page: Page) {
	const manifest = readManifest();

	if (!manifest) {
		throw new Error('BUBLIK_E2E_RUN_OVERVIEW not set or manifest is empty.');
	}

	const missingBundles: BundleEntry[] = [];
	const importPage = new ImportPage(page);
	let hasManifestChanges = false;

	for (const bundle of manifest.bundles) {
		if (await isBundleAvailable(page, bundle)) continue;

		const existingRunId = await importPage.findSuccessfulRunIdByUrl(
			bundle.importUrl
		);

		if (existingRunId > 0) {
			bundle.runId = existingRunId;
			hasManifestChanges = true;

			if (await isBundleAvailable(page, bundle)) continue;
		}

		bundle.runId = undefined;
		missingBundles.push(bundle);
	}

	if (!missingBundles.length) {
		if (hasManifestChanges) {
			persistManifest(manifest);
		}

		return;
	}

	const scheduledTasks = await importPage.scheduleImports(
		missingBundles.map((bundle) => bundle.importUrl),
		E2E_PROJECT
	);
	const scheduledTaskBundles = mapScheduledTasksToBundles(
		scheduledTasks,
		missingBundles
	);
	const taskCountByJob = scheduledTasks.reduce((counts, task) => {
		counts.set(task.jobId, (counts.get(task.jobId) ?? 0) + 1);
		return counts;
	}, new Map<number, number>());

	for (const [jobId, expectedTaskCount] of taskCountByJob) {
		const completedTasks = await importPage.waitForSuccessfulJob(
			jobId,
			expectedTaskCount
		);

		for (const completedTask of completedTasks) {
			const scheduledTaskBundle = scheduledTaskBundles.find(
				({ task }) =>
					task.jobId === completedTask.jobId &&
					normalizeImportUrl(task.runSourceUrl) ===
						normalizeImportUrl(completedTask.runSourceUrl)
			);

			if (scheduledTaskBundle) {
				scheduledTaskBundle.bundle.runId = completedTask.runId;
				hasManifestChanges = true;
			}
		}
	}

	for (const bundle of missingBundles) {
		if (!(await isBundleAvailable(page, bundle))) {
			throw new Error(`Imported run "${bundle.id}" is not visible in UI.`);
		}
	}

	if (hasManifestChanges) {
		persistManifest(manifest);
	}
}

async function ensureProjectExists(page: Page) {
	const projectExists = await page.evaluate(async (projectName) => {
		const res = await fetch(`${window.location.origin}/api/v2/projects/`, {
			credentials: 'include'
		});
		const projects = await res.json();
		return projects.some(
			(project: { name: string }) => project.name === projectName
		);
	}, E2E_PROJECT);

	if (projectExists) return;

	await page.goto('admin/config');
	await page.getByRole('button', { name: 'New Project' }).click();
	const dialog = page.getByRole('dialog');
	await dialog.getByLabel('Name').fill(E2E_PROJECT);
	await dialog.getByRole('button', { name: 'Create' }).click();
	await expect(dialog).toBeHidden({ timeout: 10_000 });
}

async function ensureProjectReferencesConfig(page: Page) {
	const configExists = await page.evaluate(
		async ({ projectName, content }) => {
			const [configsRes, projectsRes] = await Promise.all([
				fetch(`${window.location.origin}/api/v2/config/`, {
					credentials: 'include'
				}),
				fetch(`${window.location.origin}/api/v2/projects/`, {
					credentials: 'include'
				})
			]);
			const configs = await configsRes.json();
			const projects = await projectsRes.json();
			const project = projects.find(
				(item: { name: string }) => item.name === projectName
			);

			return configs.some(
				(config: { name: string; project: number | null; content?: unknown }) =>
					config.name === 'references' &&
					config.project === project?.id &&
					JSON.stringify(config.content) === JSON.stringify(JSON.parse(content))
			);
		},
		{
			projectName: E2E_PROJECT,
			content: createReferencesConfig(getLogsBaseUrl())
		}
	);

	if (configExists) return;

	await page.evaluate(
		async ({ projectName, content }) => {
			const [configsRes, projectsRes] = await Promise.all([
				fetch(`${window.location.origin}/api/v2/config/`, {
					credentials: 'include'
				}),
				fetch(`${window.location.origin}/api/v2/projects/`, {
					credentials: 'include'
				})
			]);
			const configs = await configsRes.json();
			const projects = await projectsRes.json();
			const project = projects.find(
				(item: { name: string }) => item.name === projectName
			);
			const expectedContent = JSON.stringify(JSON.parse(content));

			await Promise.all(
				configs
					.filter(
						(config: {
							id: number;
							name: string;
							project: number | null;
							content?: unknown;
						}) =>
							config.name === 'references' &&
							config.project === project?.id &&
							JSON.stringify(config.content) !== expectedContent
					)
					.map((config: { id: number }) =>
						fetch(`${window.location.origin}/api/v2/config/${config.id}/`, {
							method: 'DELETE',
							credentials: 'include'
						})
					)
			);
		},
		{
			projectName: E2E_PROJECT,
			content: createReferencesConfig(getLogsBaseUrl())
		}
	);

	await page.goto('admin/config');

	await page.getByRole('button', { name: 'New Config' }).click();

	await page.getByRole('menuitem', { name: /references/ }).click();

	await expect(
		page.getByText('Create New Global Config', { exact: true })
	).toBeVisible();

	const editor = page.getByRole('textbox', { name: 'Editor content' });

	// Can't work properly with monaco
	// eslint-disable-next-line playwright/no-force-option
	await editor.click({ force: true });

	await page.keyboard.press('ControlOrMeta+A');

	await page.keyboard.press('Backspace');

	await page.keyboard.insertText(
		createReferencesConfig(getLogsBaseUrl()).slice(0, -1)
	);

	await expect(page.getByText('Local Logs Base')).toBeVisible();

	const createButton = page.getByRole('button', { name: 'Create' }).first();

	await createButton.click();

	const dialog = page.getByRole('dialog');

	await expect(
		dialog.getByRole('heading', { name: 'New Config' })
	).toBeVisible();

	await dialog.locator('select').selectOption({ label: E2E_PROJECT });

	await dialog.getByRole('button', { name: 'Create' }).click();

	await expect(dialog).toBeHidden({ timeout: 10_000 });

	await expect
		.poll(
			async () =>
				page.evaluate(async (projectName) => {
					const [configsRes, projectsRes] = await Promise.all([
						fetch(`${window.location.origin}/api/v2/config/`, {
							credentials: 'include'
						}),
						fetch(`${window.location.origin}/api/v2/projects/`, {
							credentials: 'include'
						})
					]);
					const configs = await configsRes.json();
					const projects = await projectsRes.json();
					const project = projects.find(
						(item: { name: string }) => item.name === projectName
					);

					return configs.some(
						(config: { name: string; project: number | null }) =>
							config.name === 'references' && config.project === project?.id
					);
				}, E2E_PROJECT),
			{ timeout: 15_000 }
		)
		.toBe(true);
}
