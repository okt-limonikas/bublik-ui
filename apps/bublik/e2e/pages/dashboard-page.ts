/* SPDX-License-Identifier: Apache-2.0 */
/* SPDX-FileCopyrightText: 2024-2026 OKTET LTD */
import { expect, Locator, Page } from '@playwright/test';

/**
 * `rows` is a single day in one column, `rows-line` a single day in two, and
 * `columns` two days side by side. The deployment default comes from
 * per_conf.json (`DASHBOARD_DEFAULT_MODE`), so tests that care about the layout
 * pass the mode explicitly instead of relying on it.
 */
type DashboardMode = 'rows' | 'rows-line' | 'columns';

interface DashboardNavigationOptions {
	mode?: DashboardMode;
	/** Scopes the dashboard to one project, as the sidebar picker does. */
	projectId?: number;
}

const MODE_LABELS: Record<DashboardMode, string> = {
	rows: 'Mode rows',
	'rows-line': 'Mode rows line',
	columns: 'Mode columns'
};

class DashboardPage {
	constructor(private readonly page: Page) {}

	async goto(
		date?: string,
		options: DashboardNavigationOptions = {}
	): Promise<void> {
		const searchParams = new URLSearchParams();

		if (date) searchParams.set('main', date);
		if (options.mode) searchParams.set('mode', options.mode);
		if (typeof options.projectId === 'number') {
			searchParams.set('project', String(options.projectId));
		}

		const search = searchParams.size ? `?${searchParams.toString()}` : '';
		await this.page.goto(`dashboard${search}`);
		await expect(this.page).toHaveURL(/\/dashboard(?:$|\?)/);
	}

	row(runId: number): Locator {
		return this.page.locator(
			`[data-testid="dashboard-row"][data-run-id="${runId}"]`
		);
	}

	runLink(runName: string): Locator {
		return this.page.getByRole('link', { name: runName, exact: false }).first();
	}

	/**
	 * A counter cell of a run's row. `cellKey` is the dashboard column id from
	 * per_conf.json's DASHBOARD_HEADER (`total`, `unexpected`, `progress`, ...),
	 * which is stable even when the deployment renames the visible label.
	 */
	cell(runId: number, cellKey: string): Locator {
		return this.row(runId).locator(
			`[data-testid="dashboard-cell-link"][data-cell-key="${cellKey}"]`
		);
	}

	nokCell(runId: number): Locator {
		return this.cell(runId, 'unexpected');
	}

	expandButton(runId: number): Locator {
		return this.page.locator(
			`[data-testid="dashboard-row-expand"][data-run-id="${runId}"]`
		);
	}

	subrow(runId: number): Locator {
		return this.page.locator(
			`[data-testid="dashboard-row-subrow"][data-run-id="${runId}"]`
		);
	}

	async expectRunVisible(runName: string): Promise<void> {
		await expect(this.runLink(runName)).toBeVisible({ timeout: 30_000 });
	}

	async expectRunIdVisible(runId: number): Promise<void> {
		await expect(this.row(runId)).toBeVisible({ timeout: 30_000 });
	}

	/** The conclusion indicator is icon-only; its wording lives in the hover
	 *  card, so the state is read from data-conclusion and the label is
	 *  confirmed by hovering. */
	async expectRowConclusion(runId: number, conclusion: string): Promise<void> {
		const indicator = this.row(runId).getByTestId('run-conclusion');

		await expect(indicator).toHaveAttribute(
			'data-conclusion',
			`run-${conclusion}`,
			{
				timeout: 30_000
			}
		);
		await indicator.hover();
		await expect(this.page.getByText('Conclusion:')).toBeVisible({
			timeout: 15_000
		});
		await expect(
			this.page.getByText(conclusion, { exact: true }).first()
		).toBeVisible({ timeout: 15_000 });
	}

	async expectRunIdHidden(runId: number): Promise<void> {
		await expect(this.row(runId)).toHaveCount(0);
	}

	async expectEmpty(): Promise<void> {
		await expect(
			this.page.getByRole('heading', { name: 'No data', exact: true })
		).toBeVisible({ timeout: 30_000 });
	}

	async expectCellValue(
		runId: number,
		cellKey: string,
		value: string
	): Promise<void> {
		await expect(this.cell(runId, cellKey)).toHaveText(value, {
			timeout: 30_000
		});
	}

	async expectCellVisible(runId: number, cellKey: string): Promise<void> {
		await expect(this.cell(runId, cellKey)).toBeVisible({ timeout: 30_000 });
	}

	async openRun(runName: string): Promise<number> {
		const link = this.runLink(runName);
		await expect(link).toBeVisible({ timeout: 30_000 });
		const href = await link.getAttribute('href');
		const runId = Number(href?.match(/\/runs\/(\d+)/)?.[1] ?? 0);

		await link.click();
		await expect(this.page).toHaveURL(/\/runs\/\d+/, { timeout: 15_000 });
		return runId;
	}

	/**
	 * The NOK cell does not navigate through its href: it preventDefault()s and
	 * navigates programmatically so it can carry react-router location state
	 * (`openUnexpected`, or `openUnexpectedResults` when ctrl is held), which the
	 * run table turns into "Preview NOK" / "Open NOK". That state cannot be
	 * deep-linked, so the flows have to be driven by a real click.
	 */
	async openCell(
		runId: number,
		cellKey: string,
		destination: RegExp
	): Promise<void> {
		const cell = this.cell(runId, cellKey);
		await expect(cell).toBeVisible({ timeout: 30_000 });
		await cell.click();
		await expect(this.page).toHaveURL(destination, { timeout: 15_000 });
	}

	async openUnexpected(runId: number): Promise<void> {
		await this.openCell(
			runId,
			'unexpected',
			new RegExp(`/runs/${runId}(?:$|[?#/])`)
		);
	}

	async openUnexpectedResults(runId: number): Promise<void> {
		const cell = this.nokCell(runId);
		await expect(cell).toBeVisible({ timeout: 30_000 });
		await cell.click({ modifiers: ['Control'] });
		await expect(this.page).toHaveURL(new RegExp(`/runs/${runId}(?:$|[?#/])`), {
			timeout: 15_000
		});
	}

	async expandRow(runId: number): Promise<void> {
		await this.expandButton(runId).click();
		await expect(this.expandButton(runId)).toHaveAttribute(
			'aria-expanded',
			'true'
		);
	}

	async collapseRow(runId: number): Promise<void> {
		await this.expandButton(runId).click();
		await expect(this.expandButton(runId)).toHaveAttribute(
			'aria-expanded',
			'false'
		);
	}

	async expectSubrowVisible(runId: number): Promise<void> {
		await expect(this.subrow(runId)).toBeVisible({ timeout: 30_000 });
	}

	async expectSubrowHidden(runId: number): Promise<void> {
		await expect(this.subrow(runId)).toHaveCount(0);
	}

	async search(term: string): Promise<void> {
		// The search bar debounces by 400ms before it writes ?search=.
		await this.page.getByPlaceholder('Search...').fill(term);
	}

	async clearSearch(): Promise<void> {
		await this.search('');
	}

	async setMode(mode: DashboardMode): Promise<void> {
		await this.page.getByLabel(MODE_LABELS[mode]).click();
		await expect(this.page).toHaveURL(new RegExp(`mode=${mode}`), {
			timeout: 15_000
		});
	}

	async expectRunIdsVisible(runIds: number[]): Promise<void> {
		for (const runId of runIds) await this.expectRunIdVisible(runId);
	}

	async expectRunIdsHidden(runIds: number[]): Promise<void> {
		for (const runId of runIds) await this.expectRunIdHidden(runId);
	}

	/**
	 * Waits for the day's own dashboard request. The `date=` guard matters: it
	 * skips `/api/v2/dashboard/default_mode` and the unparameterised query the
	 * page fires to resolve "today". `notBefore` ignores anything that lands too
	 * early to be the awaited refetch — the page prefetches the neighbouring
	 * days on load, and those carry `date=` too.
	 */
	async waitForDayFetch(
		action: () => Promise<unknown> | unknown,
		options: { timeout?: number; notBefore?: number } = {}
	): Promise<void> {
		const { timeout = 15_000, notBefore = 0 } = options;
		const startedAt = Date.now();

		await Promise.all([
			this.page.waitForResponse(
				(response) => {
					const url = response.url();
					return (
						response.request().method() === 'GET' &&
						/\/api\/v2\/dashboard\/\?/.test(url) &&
						url.includes('date=') &&
						response.status() === 200 &&
						Date.now() - startedAt >= notBefore
					);
				},
				{ timeout }
			),
			action()
		]);
	}

	refreshButton(): Locator {
		return this.page.getByRole('button', { name: 'Refresh dashboard' });
	}

	async clickRefresh(): Promise<void> {
		await this.refreshButton().click();
	}

	autoReloadToggle(): Locator {
		return this.page.getByRole('switch', { name: 'Auto reload' });
	}

	async setAutoReload(enabled: boolean): Promise<void> {
		const toggle = this.autoReloadToggle();
		await expect(toggle).toHaveAttribute(
			'aria-checked',
			enabled ? 'false' : 'true'
		);
		await toggle.click();
		await this.expectAutoReload(enabled);
	}

	/** `reload` is a BooleanParam, so the URL carries `1` / `0`, not the word. */
	async expectAutoReload(enabled: boolean): Promise<void> {
		await expect(this.autoReloadToggle()).toHaveAttribute(
			'aria-checked',
			String(enabled)
		);
		await expect(this.page).toHaveURL(new RegExp(`reload=${enabled ? 1 : 0}`), {
			timeout: 15_000
		});
	}

	/**
	 * TV mode is a full-screen Radix dialog, not a route. It carries no
	 * DialogTitle, so it has no accessible name to match on.
	 */
	tvScreen(): Locator {
		return this.page.getByRole('dialog');
	}

	/**
	 * The dialog is portaled while the page behind it stays mounted, so a row
	 * testid matches twice while TV mode is open — TV assertions have to be
	 * scoped to the dialog.
	 */
	tvRow(runId: number): Locator {
		return this.tvScreen().locator(
			`[data-testid="dashboard-row"][data-run-id="${runId}"]`
		);
	}

	async enterTvMode(): Promise<void> {
		await this.page.getByRole('button', { name: 'TV' }).click();
	}

	async leaveTvMode(): Promise<void> {
		await this.page.keyboard.press('Escape');
	}

	async expectTvRunVisible(runId: number): Promise<void> {
		await expect(this.tvRow(runId)).toBeVisible({ timeout: 30_000 });
	}

	/** Entering TV mode force-enables auto reload, so `reload=1` comes with it. */
	async expectTvModeOpen(): Promise<void> {
		await expect(this.tvScreen()).toBeVisible({ timeout: 15_000 });
		await expect(this.page).toHaveURL(/tv=1/, { timeout: 15_000 });
		await expect(this.page).toHaveURL(/reload=1/, { timeout: 15_000 });
		// The TV screen re-mounts the tables alone — none of the page controls.
		await expect(
			this.tvScreen().getByRole('button', { name: 'Today' })
		).toHaveCount(0);
	}

	async expectTvModeClosed(): Promise<void> {
		await expect(this.tvScreen()).toHaveCount(0);
		await expect(this.page).toHaveURL(/tv=0/, { timeout: 15_000 });
		await expect(this.page).toHaveURL(/reload=0/, { timeout: 15_000 });
		await expect(this.todayButton()).toBeVisible();
	}

	todayButton(): Locator {
		return this.page.getByRole('button', { name: 'Today' });
	}

	async clickToday(): Promise<void> {
		await this.todayButton().click();
	}

	async expectDateNotPinned(): Promise<void> {
		await expect
			.poll(() => new URL(this.page.url()).searchParams.get('main'), {
				timeout: 15_000
			})
			.toBeNull();
	}
}

export { DashboardPage };
export type { DashboardMode };
