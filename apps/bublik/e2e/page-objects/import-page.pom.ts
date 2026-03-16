/* SPDX-License-Identifier: Apache-2.0 */
/* SPDX-FileCopyrightText: 2024-2026 OKTET LTD */
import { expect, Locator, Page } from '@playwright/test';

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
	}

	async closeResultModal(): Promise<void> {
		const closeButton = this.importModal.locator(
			'button[class*="absolute top-4"]'
		);
		await closeButton.click({ force: true });
		await this.importModal
			.waitFor({ state: 'hidden', timeout: 5_000 })
			.catch(() => {
				// Import completion polling reloads the page, so a still-open result modal is harmless.
			});
	}
}

export { ImportPage };
