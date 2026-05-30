/* SPDX-License-Identifier: Apache-2.0 */
/* SPDX-FileCopyrightText: 2024-2026 OKTET LTD */
import { expect, Page } from '@playwright/test';

class RunPage {
	readonly page: Page;

	constructor(page: Page) {
		this.page = page;
	}

	async goto(runId: number): Promise<void> {
		await this.page.goto(`runs/${runId}`);
		await expect(this.page).toHaveURL(new RegExp(`/runs/${runId}(?:$|[?#])`));
	}

	async expectLoaded(runName: string): Promise<void> {
		await expect(this.page.getByTestId('run-table')).toBeVisible({
			timeout: 30_000
		});
		await expect(
			this.page.getByText(runName, { exact: false }).first()
		).toBeVisible({
			timeout: 30_000
		});
	}

	async previewNok(): Promise<void> {
		await this.page.getByRole('button', { name: 'Preview NOK' }).click();
	}
}

export { RunPage };
