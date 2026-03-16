/* SPDX-License-Identifier: Apache-2.0 */
/* SPDX-FileCopyrightText: 2024-2026 OKTET LTD */
import { expect, Page, test as setup } from '@playwright/test';

import { E2E_PROJECT } from './constants';
import { createReferencesConfig } from './helpers/config';
import { getLogsBaseUrl } from './helpers/url';

// eslint-disable-next-line playwright/expect-expect
setup('authenticate and configure references for e2e', async ({ page }) => {
	setup.setTimeout(120_000);

	await page.goto('auth/login');
	await page.locator('input[name="email"]').fill('admin@bublik.com');
	await page.locator('input[name="password"]').fill('admin');
	await page.getByRole('button', { name: 'Sign in' }).click();
	await page.waitForURL('**/dashboard', { timeout: 15_000 });

	await ensureProjectExists(page);
	await ensureProjectReferencesConfig(page);

	await page.context().storageState({ path: 'e2e/.auth/state.json' });
});

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
	await editor.click();
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
