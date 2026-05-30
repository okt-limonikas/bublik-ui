/* SPDX-License-Identifier: Apache-2.0 */
/* SPDX-FileCopyrightText: 2024-2026 OKTET LTD */
import { expect, Locator, Page } from '@playwright/test';

interface ScheduledImportTask {
	jobId: number;
	runSourceUrl: string;
}

interface CompletedImportTask extends ScheduledImportTask {
	runId: number;
}

function normalizeUrl(value: string): string {
	try {
		const url = new URL(value);
		return `${url.origin}${url.pathname}`.replace(/\/+$/, '');
	} catch {
		return value.replace(/\/+$/, '');
	}
}

class ImportPage {
	readonly page: Page;
	readonly importButton: Locator;

	constructor(page: Page) {
		this.page = page;
		this.importButton = page.getByRole('button', { name: 'Import' });
	}

	get importModal(): Locator {
		return this.page.locator('[role="dialog"]');
	}

	get submitButton(): Locator {
		return this.importModal.getByRole('button', {
			name: /^(Import|Creating import jobs)/
		});
	}

	get urlInputs(): Locator {
		return this.importModal.locator('input[placeholder*="ts-factory.io"]');
	}

	get forceImportCheckbox(): Locator {
		return this.importModal.getByRole('checkbox', {
			name: 'Force import for all runs'
		});
	}

	get addRunButton(): Locator {
		return this.importModal.getByRole('button', { name: 'Add' });
	}

	get importResultTasks(): Locator {
		return this.importModal.getByTestId('import-result-task');
	}

	async goto(): Promise<void> {
		await this.page.goto('admin/import');
		await expect(this.importButton).toBeVisible();
	}

	async openImportForm(): Promise<void> {
		await this.importButton.click();
		await expect(this.importModal).toBeVisible();
	}

	async fillUrl(index: number, url: string): Promise<void> {
		await this.urlInputs.nth(index).fill(url);
	}

	async addRunInput(): Promise<void> {
		await this.addRunButton.click();
	}

	async enableForceImport(): Promise<void> {
		await this.forceImportCheckbox.check();
	}

	async selectProject(projectName: string): Promise<void> {
		await this.importModal.getByRole('combobox').click();
		await this.page.getByRole('option', { name: projectName }).click();
	}

	async submit(): Promise<void> {
		await this.submitButton.click();

		await expect(
			this.importModal.getByText(/Scheduled runs|Creating import jobs/)
		).toBeVisible({ timeout: 20_000 });

		await expect(
			this.importModal.getByRole('heading', { name: 'Imports' })
		).toBeVisible();
	}

	async scheduleImports(
		importUrls: string[],
		projectName: string
	): Promise<ScheduledImportTask[]> {
		if (importUrls.length === 0) return [];

		await this.goto();
		await this.openImportForm();
		await this.selectProject(projectName);

		for (const [index, importUrl] of importUrls.entries()) {
			if (index > 0) {
				await this.addRunInput();
			}

			await this.fillUrl(index, importUrl);
		}

		await this.submit();

		const tasks = await this.collectScheduledImportTasks();

		await this.closeResultModal();

		return tasks;
	}

	async collectScheduledImportTasks(): Promise<ScheduledImportTask[]> {
		const count = await this.importResultTasks.count();
		const tasks: ScheduledImportTask[] = [];

		for (let index = 0; index < count; index++) {
			const task = this.importResultTasks.nth(index);
			const jobId = Number(await task.getAttribute('data-job-id'));
			const runSourceUrl =
				(await task.getAttribute('data-run-source-url')) ?? '';

			if (Number.isFinite(jobId) && runSourceUrl) {
				tasks.push({ jobId, runSourceUrl });
			}
		}

		return tasks;
	}

	async filterByJobId(jobId: number): Promise<void> {
		await this.page.getByLabel('Job ID').fill(String(jobId));
		await this.page.getByRole('button', { name: 'Submit' }).click();
	}

	async filterByUrl(runSourceUrl: string): Promise<void> {
		await this.page.getByLabel('URL').fill(runSourceUrl);
		await this.page.getByRole('button', { name: 'Submit' }).click();
	}

	async findSuccessfulRunIdByUrl(runSourceUrl: string): Promise<number> {
		await this.goto();
		await this.filterByUrl(runSourceUrl);

		const expectedUrl = normalizeUrl(runSourceUrl);
		await expect
			.poll(
				async () => {
					const statusCount = await this.page
						.getByTestId('import-event-status')
						.count();
					const isEmpty = await this.page
						.getByText('No results found', { exact: true })
						.isVisible()
						.catch(() => false);
					const isNotFound = await this.page
						.getByText(
							"Tasks corresponding to the passed parameters doesn't exist"
						)
						.isVisible()
						.catch(() => false);

					return statusCount > 0 || isEmpty || isNotFound;
				},
				{ timeout: 15_000, intervals: [500, 1000, 2000] }
			)
			.toBe(true);

		const statuses = this.page
			.getByTestId('import-event-status')
			.filter({ hasText: 'SUCCESS' });
		const statusCount = await statuses.count();

		for (let index = 0; index < statusCount; index++) {
			const status = statuses.nth(index);
			const rowSourceUrl =
				(await status.getAttribute('data-run-source-url')) ?? '';
			const runId = Number(await status.getAttribute('data-run-id'));

			if (normalizeUrl(rowSourceUrl) === expectedUrl && runId > 0) {
				return Number.isFinite(runId) ? runId : 0;
			}
		}

		return 0;
	}

	async waitForSuccessfulJob(
		jobId: number,
		expectedTaskCount = 1
	): Promise<CompletedImportTask[]> {
		await this.goto();

		await expect
			.poll(
				async () => {
					await this.filterByJobId(jobId);

					const statuses = this.page
						.getByTestId('import-event-status')
						.filter({ hasText: 'SUCCESS' });
					const statusCount = await statuses.count();

					if (statusCount < expectedTaskCount) return false;

					for (let index = 0; index < statusCount; index++) {
						const status = statuses.nth(index);
						const runId = Number(await status.getAttribute('data-run-id'));

						if (!Number.isFinite(runId) || runId <= 0) {
							return false;
						}
					}

					return true;
				},
				{ timeout: 300_000, intervals: [1000, 2000, 5000] }
			)
			.toBe(true);

		const statuses = this.page.getByTestId('import-event-status');
		const statusCount = await statuses.count();
		const tasks: CompletedImportTask[] = [];

		for (let index = 0; index < statusCount; index++) {
			const status = statuses.nth(index);
			const runId = Number(await status.getAttribute('data-run-id'));
			const runSourceUrl =
				(await status.getAttribute('data-run-source-url')) ?? '';

			if (Number.isFinite(runId) && runId > 0 && runSourceUrl) {
				tasks.push({ jobId, runId, runSourceUrl });
			}
		}

		return tasks;
	}

	async closeResultModal(): Promise<void> {
		const closeButton = this.importModal.locator(
			'button[class*="absolute top-4"]'
		);
		await closeButton.click({ timeout: 1_000 });
	}
}

export { ImportPage };
export type { CompletedImportTask, ScheduledImportTask };
