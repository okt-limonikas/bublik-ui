/* SPDX-License-Identifier: Apache-2.0 */
/* SPDX-FileCopyrightText: 2024-2026 OKTET LTD */
import { expect, Locator, Page } from '@playwright/test';

import { UrlParams, urlParams } from '../support/url-params';

/**
 * Unlike the run page, the comparison writes its expanded state as plain JSON
 * (`JsonParam`), not lz-string — so here the value *is* readable, and a link
 * pinning one row can be built by hand.
 */
const RUN_COMPARE_URL_PARAMS = {
	left: {
		codec: 'raw',
		values: 'a run id',
		whenAbsent: 'the page reports no selected runs',
		writtenBy: 'the runs selection popover'
	},
	right: {
		codec: 'raw',
		values: 'a run id',
		whenAbsent: 'the page reports no selected runs',
		writtenBy: 'the runs selection popover'
	},
	expanded: {
		codec: 'JsonParam — plain JSON, not compressed',
		values: 'a map of row id to true',
		whenAbsent: 'nothing is expanded',
		writtenBy: 'the tree toggles'
	},
	columnVisibility: {
		codec: 'JsonParam',
		values: 'a tanstack VisibilityState',
		whenAbsent: 'the default columns',
		writtenBy: 'the Columns menu'
	}
} as const;

type RunCompareUrlParam = keyof typeof RUN_COMPARE_URL_PARAMS;

class RunDiffPage {
	private readonly url: UrlParams;

	constructor(private readonly page: Page) {
		this.url = urlParams(page);
	}

	async goto(leftRunId?: number, rightRunId?: number): Promise<void> {
		const params = new URLSearchParams();
		if (leftRunId) params.set('left', String(leftRunId));
		if (rightRunId) params.set('right', String(rightRunId));

		await this.page.goto(`compare${params.toString() ? `?${params}` : ''}`);
		await expect(this.page).toHaveURL(/\/compare(?:$|\?)/);
	}


	async gotoWithParams(params: Record<string, string>): Promise<void> {
		const searchParams = new URLSearchParams(params);
		const search = searchParams.size ? `?${searchParams.toString()}` : '';

		await this.page.goto(`compare${search}`);
		await expect(this.page).toHaveURL(/\/compare(?:$|\?)/);
	}

	async expectParams(expected: Record<string, string | null>): Promise<void> {
		await this.url.expect(expected);
	}

	async expectParamsPresent(keys: readonly string[]): Promise<void> {
		await this.url.expectPresent(keys);
	}

	rows(): Locator {
		return this.page.getByTestId('run-diff-page').locator('tbody tr');
	}

	expandableRows(): Locator {
		return this.rows().filter({ has: this.page.getByRole('button') });
	}

	/**
	 * Toggles the first row that can be, and waits for the write to land.
	 *
	 * Toggle rather than expand: the diff opens with its first row already
	 * expanded, so the first click collapses it. Which way it goes is the
	 * fixture's business — what these scenarios pin is that the change reaches
	 * the URL and comes back from it.
	 */
	async toggleFirstRow(): Promise<void> {
		await this.expandableRows().first().getByRole('button').first().click();
		await this.url.expectWritten('expanded');
	}

	async rowCount(): Promise<number> {
		return this.rows().count();
	}

	async expectRowCount(count: number): Promise<void> {
		await expect
			.poll(() => this.rows().count(), {
				timeout: 30_000,
				message: 'rows rendered by the diff'
			})
			.toBe(count);
	}

	async expectLoaded(): Promise<void> {
		await expect(this.page.getByTestId('run-diff-page')).toBeVisible({
			timeout: 30_000
		});
	}

	async expectMissingRunsError(): Promise<void> {
		await expect(this.page.getByText('No selected runs')).toBeVisible({
			timeout: 15_000
		});
	}

	async showInfoDiff(): Promise<void> {
		await this.page.getByRole('button', { name: 'Info Diff' }).click();
	}

	async openLeftLog(): Promise<void> {
		await this.page
			.getByTestId('run-diff-page')
			.getByRole('banner')
			.locator('a[href*="/log/"]')
			.first()
			.click();
		await expect(this.page).toHaveURL(/\/log\/\d+(?:\?.*)?$/, {
			timeout: 15_000
		});
	}
}

export { RUN_COMPARE_URL_PARAMS, RunDiffPage };
export type { RunCompareUrlParam };
