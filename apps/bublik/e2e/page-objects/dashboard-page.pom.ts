/* SPDX-License-Identifier: Apache-2.0 */
/* SPDX-FileCopyrightText: 2024-2026 OKTET LTD */
import { expect, Page } from '@playwright/test';

class DashboardPage {
	readonly page: Page;

	constructor(page: Page) {
		this.page = page;
	}

	async goto(date?: string): Promise<void> {
		const search = date ? `?main=${date}` : '';

		await this.page.goto(`dashboard${search}`);
		await expect(this.page).toHaveURL(/\/dashboard(?:$|\?)/);
	}

	async expectRunVisible(runId: number): Promise<void> {
		await expect(
			this.page.locator(`[data-testid="dashboard-row"][data-run-id="${runId}"]`)
		).toBeVisible({ timeout: 30_000 });
	}
}

export { DashboardPage };
