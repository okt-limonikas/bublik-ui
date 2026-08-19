/* SPDX-License-Identifier: Apache-2.0 */
/* SPDX-FileCopyrightText: 2024-2026 OKTET LTD */
import { expect, Locator, Page } from '@playwright/test';

import { badgeTextToPayload, exactText } from '../support/e2e-data';
import { expectConclusionHoverCard } from '../support/conclusion-hover';

/** Sidebar view modes of the runs page: the table, the charts, the matrix. */
type RunsMode = 'table' | 'charts' | 'progress';

/**
 * The badge-bearing columns, by the id the `<td>` carries as `data-column-id`.
 *
 * `important_tags` declares its id; `Metadata` and `Tags` do not, so tanstack
 * falls back to their header string — which is why two of the three are
 * capitalised. Changing a header renames the selector.
 */
type RunsBadgeColumn = 'important_tags' | 'Metadata' | 'Tags';

/**
 * A badge that some of the listed runs carry and others do not, so clicking it
 * visibly narrows the table. Which tags land in which column is the backend's
 * decision, so this is read from the DOM rather than from the manifest.
 */
interface DiscriminatingBadge {
	column: RunsBadgeColumn;
	/** As rendered: `fixture: basic`. */
	text: string;
	/** As filtered and as written to the URL: `fixture=basic`. */
	payload: string;
	withIt: number[];
	withoutIt: number[];
}

class RunsPage {
	constructor(private readonly page: Page) {}

	async goto(): Promise<void> {
		await this.page.goto('runs');
		await expect(this.page).toHaveURL(/\/runs(?:$|\?)/);
	}

	// Navigate with a one-day range so the table shows the runs imported on
	// that date. startDate/finishDate accept the API day format (yyyy-MM-dd),
	// which is what the fixture manifest stores in `dashboardDate`.
	async gotoForDate(date: string): Promise<void> {
		const params = new URLSearchParams({
			startDate: date,
			finishDate: date,
			calendarMode: 'default',
			mode: 'table'
		});
		await this.page.goto(`runs?${params.toString()}`);
		await expect(this.page).toHaveURL(/\/runs\?/);
	}

	async gotoWithTagExpr(tagExpr: string): Promise<void> {
		const params = new URLSearchParams({ tagExpr, mode: 'table' });
		await this.page.goto(`runs?${params.toString()}`);
		await expect(this.page).toHaveURL(/\/runs\?/);
	}

	async gotoWithMode(mode: RunsMode): Promise<void> {
		await this.page.goto(`runs?mode=${mode}`);
		await expect(this.page).toHaveURL(new RegExp(`mode=${mode}`));
	}

	/**
	 * Each mode owns one section. The loaded section is matched by test id
	 * rather than by its heading: the charts skeleton and the loaded charts
	 * carry different captions, so asserting on text would pass or fail
	 * depending on how fast the aggregation returned.
	 */
	async expectModeSection(mode: RunsMode): Promise<void> {
		if (mode === 'table') {
			await this.expectTableLoaded();
			return;
		}

		await expect(
			this.page.getByTestId(mode === 'charts' ? 'runs-stats' : 'runs-progress')
		).toBeVisible({ timeout: 60_000 });
	}

	get table(): Locator {
		return this.page.getByTestId('runs-table');
	}

	async expectTableLoaded(): Promise<void> {
		const emptyState = this.page.getByRole('heading', {
			name: 'No runs found'
		});

		await expect(this.table.or(emptyState)).toBeVisible({ timeout: 30_000 });

		if (await emptyState.isVisible()) {
			throw new Error(
				'Expected runs table, but the current date/filter returned no runs. Check fixture import and query params.'
			);
		}

		await expect(this.page.getByTestId('runs-row').first()).toBeVisible({
			timeout: 30_000
		});
	}

	async expectReady(): Promise<void> {
		await expect(this.tagExprInput).toBeVisible({ timeout: 30_000 });
		await expect(
			this.page.getByRole('button', { name: 'Submit' })
		).toBeVisible();
	}

	row(runId: number): Locator {
		return this.page.locator(
			`[data-testid="runs-row"][data-run-id="${runId}"]`
		);
	}

	async expectRowVisible(runId: number): Promise<void> {
		await expect(this.row(runId)).toBeVisible({ timeout: 30_000 });
	}

	/** The conclusion indicator is icon-only; its wording lives in the hover
	 *  card, so the state is read from data-conclusion and the label is
	 *  confirmed by hovering. */
	async expectRowConclusion(runId: number, conclusion: string): Promise<void> {
		await expectConclusionHoverCard(
			this.page,
			this.row(runId).getByTestId('run-conclusion'),
			conclusion
		);
	}

	async firstRowRunId(): Promise<string | null> {
		return this.page
			.getByTestId('runs-row')
			.first()
			.getAttribute('data-run-id');
	}

	async openRun(runId: number): Promise<void> {
		await this.row(runId).getByTestId('run-details-link').click();
		await expect(this.page).toHaveURL(new RegExp(`/runs/${runId}`), {
			timeout: 15_000
		});
	}

	async openLog(runId: number): Promise<void> {
		await this.row(runId).getByTestId('run-log-link').click();
		await expect(this.page).toHaveURL(new RegExp(`/log/${runId}`), {
			timeout: 15_000
		});
	}

	async sortBySummary(): Promise<void> {
		await this.table.getByText('Statistic Summary', { exact: true }).click();
	}

	// Form controls. Submit/Reset are reachable by their accessible name; the
	// tag-expression field by its placeholder.
	get tagExprInput(): Locator {
		return this.page.getByPlaceholder('Tag expression');
	}

	async fillTagExpr(expr: string): Promise<void> {
		await this.tagExprInput.fill(expr);
		// Wait for the controlled input to commit the value before submitting.
		// Without this, webkit can fire Submit before React registers the change
		// and the form posts an empty tag expression.
		await expect(this.tagExprInput).toHaveValue(expr);
	}

	async submit(): Promise<void> {
		await this.page.getByRole('button', { name: 'Submit' }).click();
	}

	async resetForm(): Promise<void> {
		await this.page.getByRole('button', { name: 'Reset form' }).click();
	}

	async expectEmptyState(): Promise<void> {
		await expect(
			this.page.getByRole('heading', { name: 'No runs found' })
		).toBeVisible({ timeout: 30_000 });
	}

	/** Total / OK / NOK badge of a row; `summary` is the lower-cased label. */
	summaryBadge(runId: number, summary: 'total' | 'ok' | 'nok'): Locator {
		return this.row(runId).locator(
			`[data-testid="run-summary-badge"][data-summary="${summary}"]`
		);
	}

	async expectNokCount(runId: number, count: number): Promise<void> {
		await expect(this.summaryBadge(runId, 'nok')).toContainText(String(count), {
			timeout: 30_000
		});
	}

	/**
	 * Like the dashboard NOK cell, this badge preventDefault()s and navigates with
	 * react-router state so the run table opens on the unexpected results; ctrl
	 * additionally expands their result tables.
	 */
	async openNok(
		runId: number,
		options: { ctrl?: boolean } = {}
	): Promise<void> {
		const badge = this.summaryBadge(runId, 'nok');
		await expect(badge).toBeVisible({ timeout: 30_000 });
		await badge.click(options.ctrl ? { modifiers: ['Control'] } : undefined);
		await expect(this.page).toHaveURL(new RegExp(`/runs/${runId}(?:$|[?#/])`), {
			timeout: 15_000
		});
	}

	/**
	 * A body cell of a run row, by the column id the `<td>` carries.
	 */
	cell(runId: number, columnId: RunsBadgeColumn): Locator {
		return this.row(runId).locator(`td[data-column-id="${columnId}"]`);
	}

	badges(runId: number, columnId: RunsBadgeColumn): Locator {
		return this.cell(runId, columnId).getByTestId('tw-badge');
	}

	/** The run ids currently listed, in table order. */
	async listedRunIds(): Promise<number[]> {
		const ids = await this.page
			.getByTestId('runs-row')
			.evaluateAll((rows) =>
				rows.map((row) => row.getAttribute('data-run-id'))
			);

		return ids
			.map((id) => Number(id))
			.filter((id) => Number.isFinite(id) && id > 0);
	}

	/**
	 * Every badge text rendered in a column, per run id. Read in one evaluate so
	 * the whole table is sampled from a single DOM snapshot — polling cell by
	 * cell could straddle a refetch and produce a mixed picture.
	 */
	async badgeTextsByRun(
		columnId: RunsBadgeColumn
	): Promise<Map<number, string[]>> {
		const entries = await this.table.evaluate((table, column) => {
			const rows = Array.from(
				table.querySelectorAll('[data-testid="runs-row"]')
			);

			return rows.map((row) => {
				const cell = row.querySelector(`td[data-column-id="${column}"]`);
				const badges = cell
					? Array.from(cell.querySelectorAll('[data-testid="tw-badge"]'))
					: [];

				return [
					Number(row.getAttribute('data-run-id')),
					badges.map((badge) => (badge.textContent ?? '').trim())
				] as [number, string[]];
			});
		}, columnId);

		return new Map(entries);
	}

	/**
	 * Picks a badge carried by some listed runs and not others. Throws rather
	 * than skipping when the fixtures offer none: a scenario that quietly stops
	 * exercising the filter is worse than one that fails.
	 *
	 * The badge is taken from `columnId` — that is where the click has to land —
	 * but which runs carry it is read across all three badge columns, because the
	 * filter the click applies is over a run's tags, metadata and important tags
	 * together. Reading one column would under-count a value the backend files
	 * differently on another run.
	 */
	async pickDiscriminatingBadge(
		columnId: RunsBadgeColumn
	): Promise<DiscriminatingBadge> {
		const inColumn = await this.badgeTextsByRun(columnId);
		const everywhere = await this.allBadgeTextsByRun();
		const candidates = new Set(
			[...inColumn.values()].flat().filter(Boolean)
		);

		for (const text of candidates) {
			const withIt = [...everywhere]
				.filter(([, texts]) => texts.includes(text))
				.map(([runId]) => runId);

			if (withIt.length === everywhere.size) continue;

			return {
				column: columnId,
				text,
				payload: badgeTextToPayload(text),
				withIt,
				withoutIt: [...everywhere.keys()].filter(
					(runId) => !withIt.includes(runId)
				)
			};
		}

		throw new Error(
			`No badge in the "${columnId}" column is carried by only some of the ${everywhere.size} listed runs, so clicking one cannot be observed. Check the fixture plan.`
		);
	}

	/** The union of a run's important-tag, metadata and tag badges. */
	private async allBadgeTextsByRun(): Promise<Map<number, string[]>> {
		const merged = new Map<number, string[]>();

		for (const column of ['important_tags', 'Metadata', 'Tags'] as const) {
			for (const [runId, texts] of await this.badgeTextsByRun(column)) {
				merged.set(runId, [...(merged.get(runId) ?? []), ...texts]);
			}
		}

		return merged;
	}

	/**
	 * Clicking a badge writes the run data filter to the URL and refetches (the
	 * `runs.autoApplyBadgeFilters` preference, on by default). The stale rows
	 * stay mounted while the request is in flight, so callers must assert the URL
	 * first and poll the rows — never read the table straight after this.
	 */
	async clickBadge(
		runId: number,
		columnId: RunsBadgeColumn,
		text: string
	): Promise<void> {
		await this.badges(runId, columnId)
			.filter({ hasText: exactText(text) })
			.first()
			.click();
	}

	/**
	 * A badge marks itself selected through `data-badge-selected`. Selection is
	 * otherwise expressed only in the badge's colour, and the colour differs per
	 * variant, so this is the one assertion that holds for every badge.
	 */
	async expectBadgeSelected(
		runId: number,
		columnId: RunsBadgeColumn,
		text: string
	): Promise<void> {
		await expect(
			this.badges(runId, columnId).filter({ hasText: exactText(text) }).first()
		).toHaveAttribute('data-badge-selected', '', { timeout: 15_000 });
	}

	/**
	 * The runs page keeps its badge filter in `runData`, `;`-joined and
	 * normalised, so membership is the contract — not the whole string.
	 */
	async expectRunDataContains(...payloads: string[]): Promise<void> {
		for (const payload of payloads) {
			await expect
				.poll(
					() =>
						(
							new URL(this.page.url()).searchParams.get('runData') ?? ''
						).split(';'),
					{ timeout: 15_000, message: `runData should carry "${payload}"` }
				)
				.toContain(payload);
		}
	}

	async expectNoRunData(): Promise<void> {
		await expect
			.poll(() => new URL(this.page.url()).searchParams.get('runData'), {
				timeout: 15_000,
				message: 'runData'
			})
			.toBeNull();
	}

	/** Any write to the filter sends the table back to the first page. */
	async expectOnFirstPage(): Promise<void> {
		await expect
			.poll(() => new URL(this.page.url()).searchParams.get('page'), {
				timeout: 15_000,
				message: 'page'
			})
			.toBe('1');
	}

	/**
	 * Polls, because the badge click triggers a refetch and the previous rows
	 * stay mounted (dimmed) until it lands.
	 */
	async expectOnlyRunsListed(runIds: number[]): Promise<void> {
		const expected = [...runIds].sort((a, b) => a - b);

		await expect
			.poll(async () => (await this.listedRunIds()).sort((a, b) => a - b), {
				timeout: 30_000,
				message: 'listed run ids'
			})
			.toEqual(expected);
	}

	async expectRunsListed(runIds: number[]): Promise<void> {
		await expect
			.poll(async () => await this.listedRunIds(), {
				timeout: 30_000,
				message: 'listed run ids'
			})
			.toEqual(expect.arrayContaining(runIds));
	}

	// The Metas combobox (TagsBoxInput) is the form's own way of writing the
	// same `runData` the badges write. Its trigger and its search field share
	// the "Metas" wording, so the trigger is matched by role and the field by
	// placeholder.
	get metasTrigger(): Locator {
		return this.page.getByRole('combobox').filter({ hasText: 'Metas' });
	}

	async openMetas(): Promise<void> {
		await this.metasTrigger.click();
		await expect(this.page.getByPlaceholder('Metas')).toBeVisible();
	}

	/**
	 * The list filters on each option's underlying value (`fixture=basic`) while
	 * rendering the display wording (`fixture: basic`), so the search box is
	 * given the payload and the option is picked by what it shows.
	 */
	async selectMeta(payload: string, displayText: string): Promise<void> {
		await this.openMetas();
		await this.page.getByPlaceholder('Metas').fill(payload);

		const option = this.page
			.getByRole('option')
			.filter({ hasText: displayText })
			.first();

		await expect(option).toBeVisible({ timeout: 15_000 });
		await option.click();
		await this.page.keyboard.press('Escape');
	}

	/** The trigger lists up to two selections, then collapses to "N selected". */
	async expectMetaSelected(displayText: string): Promise<void> {
		await expect(this.metasTrigger).toContainText(displayText, {
			timeout: 15_000
		});
	}

	/**
	 * Selection is toggled by clicking the row background: the handler ignores
	 * clicks whose target is not a TD or DIV, so links and badges navigate
	 * instead. Aim at a cell's padding to land on the TD itself.
	 */
	async selectRow(runId: number): Promise<void> {
		await this.row(runId)
			.locator('td')
			.first()
			.click({ position: { x: 2, y: 2 } });
	}

	get selectionTrigger(): Locator {
		return this.page.getByRole('button', { name: /\d+ runs selected/ });
	}

	async expectSelectedCount(count: number): Promise<void> {
		await expect(this.selectionTrigger).toHaveText(
			new RegExp(`${count} runs selected`),
			{ timeout: 15_000 }
		);
	}

	// The sidebar carries its own Multiple/Compare entries pointing at the same
	// selection, so the popover's links have to be scoped to the page body.
	multipleLink(): Locator {
		return this.page
			.locator('#page-container')
			.getByRole('link', { name: 'Multiple' });
	}

	compareLink(): Locator {
		return this.page
			.locator('#page-container')
			.getByRole('link', { name: 'Compare' });
	}

	async expectMultipleOffered(runIds: number[]): Promise<void> {
		const href = await this.multipleLink().getAttribute('href');
		for (const runId of runIds) {
			expect(href).toContain(`runIds=${runId}`);
		}
	}

	async expectCompareOffered(runIds: [number, number]): Promise<void> {
		const href = await this.compareLink().getAttribute('href');
		expect(href).toContain(`left=${runIds[0]}`);
		expect(href).toContain(`right=${runIds[1]}`);
	}
}

export { RunsPage };
export type { DiscriminatingBadge, RunsBadgeColumn, RunsMode };
