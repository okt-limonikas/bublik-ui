/* SPDX-License-Identifier: Apache-2.0 */
/* SPDX-FileCopyrightText: 2024-2026 OKTET LTD */
import { expect, Locator, Page } from '@playwright/test';

import { HistoryGlobalSearchForm } from './history-global-search-form';

/** The five modes the page renders, as spelled in `?mode=`. */
type HistoryMode =
	| 'linear'
	| 'aggregation'
	| 'measurements'
	| 'measurements-by-iteration'
	| 'measurements-combined';

type HistoryLegendItem =
	| 'runs'
	| 'iterations'
	| 'results'
	| 'expected'
	| 'unexpected';

class HistoryPage {
	readonly page: Page;
	readonly root: Locator;
	readonly editSearchButton: Locator;
	readonly submitButton: Locator;
	readonly resetFilterButton: Locator;
	readonly substringFilter: Locator;
	readonly legend: Locator;
	readonly table: Locator;
	readonly pagination: Locator;
	readonly globalSearchForm: HistoryGlobalSearchForm;

	constructor(page: Page) {
		this.page = page;
		this.root = page.getByTestId('history-page');
		this.editSearchButton = page.getByRole('button', { name: 'Edit Search' });
		this.submitButton = page.getByRole('button', { name: 'Submit' });
		this.resetFilterButton = page.getByRole('button', { name: 'Reset Filter' });
		this.substringFilter = page.getByPlaceholder('Substring filter');
		this.legend = this.root.getByTestId('history-legend-count');
		this.table = this.root.locator('[role="table"]').first();
		this.pagination = this.root.getByTestId('tw-pagination').first();
		this.globalSearchForm = new HistoryGlobalSearchForm(page);
	}

	async goto(searchParams?: URLSearchParams | string): Promise<void> {
		const search =
			typeof searchParams === 'string'
				? searchParams
				: searchParams?.toString() ?? '';
		const url = search.length > 0 ? `history?${search}` : 'history';

		await this.page.goto(url);
		await expect(this.page).toHaveURL(/\/history(?:$|\?)/);
	}

	/**
	 * The query the page actually reads lives in the URL, so scenarios that are
	 * about the results rather than about the form go straight there instead of
	 * re-driving the search drawer.
	 */
	async gotoWithTestPath(
		testPath: string,
		extraParams?: Record<string, string>
	): Promise<void> {
		const params = new URLSearchParams({ testName: testPath });

		for (const [key, value] of Object.entries(extraParams ?? {})) {
			params.set(key, value);
		}

		await this.goto(params);
	}

	async expectReady(): Promise<void> {
		await expect(this.editSearchButton).toBeVisible();
	}

	/** Asserts the mode the page resolved, plus that mode's own landmark. */
	async expectModeReady(mode: HistoryMode): Promise<void> {
		await this.expectReady();
		await expect(this.root).toHaveAttribute('data-history-mode', mode, {
			timeout: 30_000
		});

		if (mode === 'linear' || mode === 'aggregation') {
			await expect(this.table).toBeVisible({ timeout: 60_000 });
			return;
		}

		await expect(this.chartsHeader(mode)).toBeVisible({ timeout: 60_000 });
	}

	/**
	 * The card header each chart mode renders above its plots. Scoped to the
	 * page, because the sidebar names the same modes.
	 */
	chartsHeader(mode: HistoryMode): Locator {
		if (mode === 'measurements') return this.root.getByText('Trend Charts');
		if (mode === 'measurements-by-iteration') {
			return this.root.getByText('Series Charts');
		}

		// The stacked view shows "Charts" once plots are selected, and an
		// explanation when none are.
		return this.root
			.getByText('Charts', { exact: true })
			.or(this.root.getByText('You have not selected plots'))
			.first();
	}

	rows(): Locator {
		return this.table.locator('.tw-table-body [role="row"]');
	}

	async expectHasResults(): Promise<void> {
		await expect(this.rows().first()).toBeVisible({ timeout: 60_000 });
	}

	async expectNoResults(): Promise<void> {
		await expect(
			this.root.getByText('No results', { exact: true })
		).toBeVisible({ timeout: 60_000 });
	}

	async expectNoTestName(): Promise<void> {
		await expect(
			this.root.getByText('No test name', { exact: true })
		).toBeVisible({ timeout: 30_000 });
	}

	legendCount(item: HistoryLegendItem): Locator {
		return this.root.locator(`[data-legend-count="${item}"]`);
	}

	async expectLegendCountAtLeast(
		item: HistoryLegendItem,
		minimum: number
	): Promise<void> {
		await expect
			.poll(async () => Number(await this.legendCount(item).innerText()), {
				timeout: 60_000
			})
			.toBeGreaterThanOrEqual(minimum);
	}

	async openGlobalSearchForm(): Promise<void> {
		await this.editSearchButton.click();
		await this.globalSearchForm.expectVisible();
	}

	async searchForTestPath(testPath: string): Promise<void> {
		await this.openGlobalSearchForm();
		await this.globalSearchForm.fillTestPath(testPath);
		await this.globalSearchForm.applySearch();
		await this.globalSearchForm.expectHidden();
	}

	async openNextPage(): Promise<void> {
		await this.pagination.getByRole('button', { name: 'Next' }).click();
	}

	/** One control panel is rendered per plot, in every chart mode. */
	charts(): Locator {
		return this.root.getByTestId('tw-chart-control-panel');
	}

	async addChartToCombined(index: number): Promise<void> {
		await this.root
			.getByRole('button', { name: 'Add to combined chart' })
			.nth(index)
			.click();
	}

	/**
	 * The selection popover remembers whether it was collapsed, so the footer
	 * may need unfolding before the Stacked button is reachable.
	 */
	async openStackedFromSelection(): Promise<void> {
		const stacked = this.page.getByRole('button', {
			name: 'Stacked',
			exact: true
		});

		if (!(await stacked.isVisible())) {
			await this.page
				.getByRole('button', { name: /chart\(s\) selected/i })
				.click();
		}

		await stacked.click();
	}
}

export { HistoryPage };
export type { HistoryLegendItem, HistoryMode };
