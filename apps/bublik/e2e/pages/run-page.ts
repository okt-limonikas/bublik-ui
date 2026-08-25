/* SPDX-License-Identifier: Apache-2.0 */
/* SPDX-FileCopyrightText: 2024-2026 OKTET LTD */
import { expect, Locator, Page } from '@playwright/test';

import { exactText } from '../support/e2e-data';
import { UrlParams, urlParams } from '../support/url-params';

/**
 * The result table's own column ids (`result-table/constants.ts`), which the
 * cells carry as `data-column-id`. `links` and the Expected Results column are
 * tanstack defaults and are not filterable.
 */
type ResultColumn =
	| 'obtained-result'
	| 'artifacts'
	| 'parameters'
	| 'requirements';

/** The faceted filters the result table toolbar offers, by their title. */
type ResultFilterTitle =
	| 'Obtained Result'
	| 'Result Type'
	| 'Verdicts'
	| 'Artifacts'
	| 'Parameters';

/**
 * A value some of a result table's rows carry and others do not, so clicking
 * its badge visibly narrows the table.
 */
interface DiscriminatingResultBadge {
	column: ResultColumn;
	text: string;
	/** The first row carrying it, so the click has something to aim at. */
	rowIndex: number;
	matchingRows: number;
	totalRows: number;
}

/**
 * The Obtained Result cell holds the result type first and its verdicts after,
 * and the two filter differently — a result badge narrows by type *and*
 * expectedness, a verdict badge by membership alone. Callers say which they
 * mean.
 */
type ObtainedResultPart = 'all' | 'result' | 'verdicts';

/**
 * The run table keeps its whole shape in the query string, which is what makes
 * a run link worth sharing — but most of it is lz-string compressed
 * (`encodeCompressedState` in
 * `libs/bublik/features/sidebar/src/lib/sidebar-url.utils.ts`), so the values
 * are not readable and must not be asserted as literals. What a scenario can
 * prove is that the key is written, and that opening the same link again
 * renders the same table.
 *
 * Read in `run-table/run-table.hooks.ts` (`useRunTableQueryState`) and
 * `result-table/result-table.component.tsx` (`useColumnFilters`).
 *
 * Not in the URL, deliberately: the unexpected-only expansion the dashboard
 * and the runs table navigate with. It arrives as react-router `location.state`
 * (`openUnexpected`, `openUnexpectedIntentId`), so it cannot be deep-linked and
 * does not survive a reload.
 */
const RUN_URL_PARAMS = {
	expanded: {
		codec: 'lz-string compressed JSON',
		values: 'a map of row id to true',
		whenAbsent: 'the first row is expanded',
		writtenBy:
			'the tree toggles. Migrated on mount from plain JSON and from dot-separated legacy row ids'
	},
	sorting: {
		codec: 'lz-string compressed JSON',
		values: 'a tanstack SortingState',
		whenAbsent: 'the rows are in tree order',
		writtenBy: 'the column headers'
	},
	globalFilter: {
		codec: 'lz-string compressed JSON',
		values: 'a list of strings',
		whenAbsent: 'no toolbar filter is applied',
		writtenBy: 'the toolbar search'
	},
	rowState: {
		codec: 'lz-string compressed JSON',
		values: 'per-row result-table state',
		whenAbsent: 'no result table is open',
		writtenBy: 'opening a result table from a count badge'
	},
	visibility: {
		codec: 'lz-string compressed JSON',
		values: 'a tanstack VisibilityState',
		whenAbsent:
			'localStorage `run-column-visibility[:projectId]`, then the computed default — the URL wins over both',
		writtenBy: 'the Columns menu'
	},
	columnFilters: {
		codec: 'lz-string compressed JSON, written with replaceIn',
		values: 'a map of row id to a tanstack ColumnFiltersState',
		whenAbsent: 'no result-table filter is applied',
		writtenBy: 'result badges and the faceted filters'
	},
	columnOrder: {
		codec: 'JsonParam — plain JSON, *not* compressed',
		values: 'a list of column ids',
		whenAbsent:
			'localStorage `run-column-order[:projectId]`, then the default order',
		writtenBy: 'dragging a column; written to the URL and localStorage both'
	},
	globalRequirements: {
		codec: 'ArrayParam — the key is repeated once per value',
		values: 'requirement names',
		whenAbsent: 'no requirement filter is applied',
		writtenBy: 'the requirements filter'
	},
	targetIterationId: {
		codec: 'NumberParam',
		values: 'an iteration id',
		whenAbsent: 'nothing is targeted',
		writtenBy: 'links that open a run at one iteration'
	},
	resultFilter: {
		codec: 'StringParam',
		values: 'a result column id',
		whenAbsent: 'no column is pre-filtered',
		writtenBy: 'incoming links only — the table does not write it back'
	}
} as const;

type RunUrlParam = keyof typeof RUN_URL_PARAMS;

/** The subset whose values are compressed, and so are presence-only. */
const RUN_COMPRESSED_URL_PARAMS = [
	'expanded',
	'sorting',
	'globalFilter',
	'rowState',
	'visibility',
	'columnFilters'
] as const satisfies readonly RunUrlParam[];

class RunPage {
	private readonly url: UrlParams;

	constructor(private readonly page: Page) {
		this.url = urlParams(page);
	}

	async goto(runId: number): Promise<void> {
		await this.page.goto(`runs/${runId}`);
		await expect(this.page).toHaveURL(new RegExp(`/runs/${runId}`));
	}

	async expectLoaded(name: string): Promise<void> {
		await expect(this.page.getByTestId('run-table')).toBeVisible({
			timeout: 30_000
		});
		await expect(
			this.page.getByText(name, { exact: false }).first()
		).toBeVisible({ timeout: 30_000 });
	}

	rows(): Locator {
		return this.page.getByTestId('run-row');
	}

	/** Package (or session/suite) rows of the run tree, by their expanded state. */
	packageRows(options: { expanded?: boolean } = {}): Locator {
		const expanded =
			options.expanded === undefined
				? ''
				: `[data-expanded="${options.expanded}"]`;

		return this.page.locator(
			`[data-testid="run-row"]:not([data-node-type="test"])${expanded}`
		);
	}

	/** Result tables are only in the DOM while their test row is expanded. */
	resultTables(): Locator {
		return this.page.getByTestId('run-result-table');
	}

	async expectExpandedPackage(): Promise<void> {
		await expect(this.packageRows({ expanded: true }).first()).toBeVisible({
			timeout: 30_000
		});
	}

	async expectResultTableVisible(): Promise<void> {
		await expect(this.resultTables().first()).toBeVisible({ timeout: 30_000 });
	}

	async expectNoResultTable(): Promise<void> {
		await expect(this.resultTables()).toHaveCount(0);
	}

	/**
	 * Scoped to the toolbar because the requirements filter and every expanded
	 * result table carry a Reset button of their own.
	 */
	get toolbar(): Locator {
		return this.page.getByTestId('run-table-toolbar');
	}

	async previewNok(): Promise<void> {
		await this.toolbar.getByRole('button', { name: 'Preview NOK' }).click();
	}

	async openNok(): Promise<void> {
		await this.toolbar.getByRole('button', { name: 'Open NOK' }).click();
	}

	async resetTable(): Promise<void> {
		await this.toolbar
			.getByRole('button', { name: 'Reset', exact: true })
			.click();
	}

	/** A `<dd>` of the info card, addressed by the label of its `<dt>`. */
	detail(label: string): Locator {
		return this.page.locator(
			`[data-testid="run-detail"][data-label="${label}"]`
		);
	}

	async expectDetail(label: string, value?: string): Promise<void> {
		const detail = this.detail(label);
		await expect(detail).toBeVisible({ timeout: 30_000 });
		if (value !== undefined) await expect(detail).toContainText(value);
	}

	/** Expose/Hide switches the info card between the compact and full detail set. */
	async toggleFullMode(): Promise<void> {
		await this.page.getByRole('button', { name: /^(Expose|Hide)$/ }).click();
	}

	testRow(testName: string): Locator {
		return this.page.locator(
			`[data-testid="run-row"][data-test-name="${testName}"]`
		);
	}

	/** A package and the test inside it often share a name (…/foo/foo), and a
	 *  count badge only opens a result table on the test row — on a package row
	 *  it expands the subtree instead. */
	testNodeRow(testName: string): Locator {
		return this.page.locator(
			`[data-testid="run-row"][data-node-type="test"][data-test-name="${testName}"]`
		);
	}

	resultTable(testName: string): Locator {
		return this.page.locator(
			`[data-testid="run-result-table"][data-test-name="${testName}"]`
		);
	}

	/**
	 * Count badges carry their run-table column id (`RUN`, `PASSED_EXPECTED`,
	 * ...); clicking one on a test row opens that test's result table filtered to
	 * the column, and on a package row expands the subtree instead. Which columns
	 * are visible is user state, so prefer `firstCountBadge` over naming one.
	 */
	countBadge(row: Locator, columnId: string): Locator {
		return row.locator(
			`[data-testid="tw-badge"][data-column-id="${columnId}"]`
		);
	}

	firstCountBadge(row: Locator): Locator {
		return row.locator('[data-testid="tw-badge"][data-column-id]').first();
	}

	/** The tree cell is a button labelled with the node name; it toggles the row. */
	async toggleTreeNode(row: Locator): Promise<void> {
		await row.getByRole('button').first().click();
	}

	testRows(): Locator {
		return this.page.locator('[data-testid="run-row"][data-node-type="test"]');
	}

	/**
	 * A run opens with only its root expanded, so tests are several packages deep.
	 * Walk down the first collapsed package until a test row surfaces.
	 */
	async expandUntilTestRow(maxDepth = 10): Promise<Locator> {
		for (let depth = 0; depth < maxDepth; depth += 1) {
			if (await this.testRows().first().isVisible()) break;

			const collapsed = this.packageRows({ expanded: false }).first();
			await expect(collapsed).toBeVisible({ timeout: 30_000 });
			await this.toggleTreeNode(collapsed);
		}

		const testRow = this.testRows().first();
		await expect(testRow).toBeVisible({ timeout: 30_000 });
		return testRow;
	}

	/**
	 * Walks the tree down a package chain by name, expanding each level.
	 * `expandUntilTestRow` takes whatever surfaces first; this one is for the
	 * scenarios that need a *particular* test, because only some fixture tests
	 * report artifacts and only some report requirements.
	 */
	async expandPackagePath(packageNames: string[]): Promise<void> {
		for (const name of packageNames) {
			const row = this.page
				.locator(
					`[data-testid="run-row"]:not([data-node-type="test"])[data-test-name="${name}"]`
				)
				.first();

			// A manifest test path starts at the suite, which the tree may render
			// as the already-expanded root or not as a row at all. A name that
			// never surfaces is skipped rather than failed: the caller's assertion
			// on the test row is the one that should report the real problem.
			if (!(await row.isVisible())) continue;

			if ((await row.getAttribute('data-expanded')) === 'true') continue;

			await this.toggleTreeNode(row);
			await expect(row).toHaveAttribute('data-expanded', 'true', {
				timeout: 30_000
			});
		}
	}

	/**
	 * Expands the tree down to a named test and opens its result table through a
	 * count badge, returning the table. The test path from the manifest is
	 * `pkg/.../test`, and its last segment repeats as the test node's name.
	 */
	async openResultTableAt(
		packageNames: string[],
		testName: string
	): Promise<Locator> {
		// A count badge opens the result table filtered to its own column, and the
		// columns visible by default all exclude something — `RUN`, the first of
		// them, leaves out SKIPPED and FAKED. These scenarios are about filtering
		// the table, so they have to start from the unfiltered set: `TOTAL` is the
		// only column that asks for every result type, and it is hidden by default.
		await this.showColumn('Total');
		await this.expandPackagePath(packageNames);

		const testRow = this.testNodeRow(testName).first();
		await expect(testRow).toBeVisible({ timeout: 60_000 });
		await this.countBadge(testRow, 'TOTAL').first().click();

		const table = this.resultTable(testName).first();
		await expect(table).toBeVisible({ timeout: 60_000 });
		await expect
			.poll(() => this.resultRowCount(table), { timeout: 60_000 })
			.toBeGreaterThan(1);

		return table;
	}

	/**
	 * A result table is a CSS grid: its cells are siblings with no row wrapper
	 * and no `role="row"`, so a "row" is one cell of a column that every result
	 * renders. `obtained-result` is that column.
	 */
	resultCells(table: Locator, columnId: ResultColumn): Locator {
		return table.locator(`[data-column-id="${columnId}"]`);
	}

	resultRowCount(table: Locator): Promise<number> {
		return this.resultCells(table, 'obtained-result').count();
	}

	/** The first badge of a result's VerdictList is the result type itself. */
	obtainedResultBadge(table: Locator, index = 0): Locator {
		return this.resultCells(table, 'obtained-result')
			.nth(index)
			.getByTestId('tw-badge')
			.first();
	}

	/** Everything after the result badge in the same cell is a verdict. */
	verdictBadges(table: Locator, index = 0): Locator {
		return this.resultCells(table, 'obtained-result')
			.nth(index)
			.getByTestId('tw-badge');
	}

	artifactBadges(table: Locator, index = 0): Locator {
		return this.resultCells(table, 'artifacts')
			.nth(index)
			.getByTestId('tw-badge');
	}

	/** Parameters are bare buttons, not Badges — they carry the diff highlight. */
	parameterButtons(table: Locator, index = 0): Locator {
		return this.resultCells(table, 'parameters').nth(index).locator('button');
	}

	requirementBadges(table: Locator, index = 0): Locator {
		return this.resultCells(table, 'requirements')
			.nth(index)
			.getByTestId('tw-badge');
	}

	/**
	 * Clicks a badge by the exact value it renders. Exact, because artifacts and
	 * parameters are long strings that share prefixes — a substring match would
	 * silently filter by the wrong one.
	 */
	async clickResultBadge(
		table: Locator,
		columnId: ResultColumn,
		text: string
	): Promise<void> {
		const items =
			columnId === 'parameters'
				? this.resultCells(table, columnId).locator('button')
				: this.resultCells(table, columnId).getByTestId('tw-badge');

		await items
			.filter({ hasText: exactText(text) })
			.first()
			.click();
	}

	/**
	 * The values rendered in one column, per result row, sampled from a single
	 * DOM snapshot.
	 */
	async resultValuesByRow(
		table: Locator,
		columnId: ResultColumn,
		part: ObtainedResultPart = 'all'
	): Promise<string[][]> {
		return table.evaluate(
			(root, { column, part: which }) => {
				const cells = Array.from(
					root.querySelectorAll(`[data-column-id="${column}"]`)
				);

				return cells.map((cell) => {
					// Parameters render as bare buttons; everything else as badges.
					const items = Array.from(
						cell.querySelectorAll('[data-testid="tw-badge"], button')
					).map((item) => (item.textContent ?? '').trim());

					if (which === 'result') return items.slice(0, 1);
					if (which === 'verdicts') return items.slice(1);

					return items;
				});
			},
			{ column: columnId, part }
		);
	}

	/**
	 * Picks a value carried by some result rows and not others. Throws rather
	 * than skipping — see features/README.md.
	 */
	async pickDiscriminatingResultBadge(
		table: Locator,
		columnId: ResultColumn,
		part: ObtainedResultPart = 'all'
	): Promise<DiscriminatingResultBadge> {
		const byRow = await this.resultValuesByRow(table, columnId, part);
		const counts = new Map<string, number[]>();

		for (const [rowIndex, values] of byRow.entries()) {
			for (const value of new Set(values)) {
				counts.set(value, [...(counts.get(value) ?? []), rowIndex]);
			}
		}

		for (const [text, rows] of counts) {
			if (rows.length === byRow.length || !text) continue;

			return {
				column: columnId,
				text,
				rowIndex: rows[0],
				matchingRows: rows.length,
				totalRows: byRow.length
			};
		}

		throw new Error(
			`No value in the result table's "${columnId}" column is carried by only some of its ${byRow.length} rows, so clicking one cannot be observed. Check the fixture plan.`
		);
	}

	/**
	 * The table filters client-side, so the surviving rows settle without a
	 * request — but React still has to re-render, hence the poll.
	 */
	async expectResultRowsNarrowedTo(
		table: Locator,
		columnId: ResultColumn,
		text: string,
		expectedRows: number,
		part: ObtainedResultPart = 'all'
	): Promise<void> {
		await expect
			.poll(() => this.resultRowCount(table), {
				timeout: 15_000,
				message: `result rows after filtering by "${text}"`
			})
			.toBe(expectedRows);

		const byRow = await this.resultValuesByRow(table, columnId, part);
		expect(byRow).toHaveLength(expectedRows);
		for (const values of byRow) {
			expect(values).toContain(text);
		}
	}

	/**
	 * The obtained-result badge filters by result type *and* by whether the
	 * result was expected, and expectedness is only in the badge's colour — so
	 * the surviving count cannot be predicted from the text. The honest contract
	 * is that the table was cut and everything left shows that result.
	 */
	async expectResultRowsNarrowedByResult(
		table: Locator,
		text: string,
		before: number
	): Promise<void> {
		await expect
			.poll(() => this.resultRowCount(table), {
				timeout: 15_000,
				message: `result rows after filtering by "${text}"`
			})
			.toBeLessThan(before);

		const byRow = await this.resultValuesByRow(
			table,
			'obtained-result',
			'result'
		);

		expect(byRow.length).toBeGreaterThan(0);
		for (const values of byRow) {
			expect(values).toContain(text);
		}
	}

	// The filter toolbar. `hasToolbar = showToolbar || hasFilters`, so any badge
	// click reveals it on its own — the Filters toggle only decides whether it
	// shows while nothing is filtered.
	get filtersToggle(): Locator {
		return this.page.getByRole('button', { name: 'Filters' });
	}

	/**
	 * The faceted filter trigger names itself after its title plus the options
	 * picked ("N selected" past two), which makes it the one user-visible
	 * reflection of the result table's filter state.
	 */
	facetedFilter(table: Locator, title: ResultFilterTitle): Locator {
		return table.getByRole('button', { name: new RegExp(`^${title}`) }).first();
	}

	async expectToolbarVisible(table: Locator): Promise<void> {
		await expect(this.facetedFilter(table, 'Obtained Result')).toBeVisible({
			timeout: 15_000
		});
	}

	async expectToolbarHidden(table: Locator): Promise<void> {
		await expect(this.facetedFilter(table, 'Obtained Result')).toBeHidden({
			timeout: 15_000
		});
	}

	async expectFacetedFilterReports(
		table: Locator,
		title: ResultFilterTitle,
		label: string
	): Promise<void> {
		await expect(this.facetedFilter(table, title)).toContainText(label, {
			timeout: 15_000
		});
	}

	/** With nothing picked, a trigger renders its bare title and nothing else. */
	async expectNoFacetedFilterSelection(table: Locator): Promise<void> {
		for (const title of [
			'Obtained Result',
			'Result Type',
			'Verdicts',
			'Artifacts',
			'Parameters'
		] as const) {
			await expect(this.facetedFilter(table, title)).toHaveText(title, {
				timeout: 15_000
			});
		}
	}

	/** The toolbar's own Reset — not the run table toolbar's. */
	async resetResultFilters(table: Locator): Promise<void> {
		await table
			.getByRole('button', { name: 'Reset', exact: true })
			.first()
			.click();
	}

	/**
	 * `columnFilters` is a compressed blob, so only its presence is assertable;
	 * the round trip is proved by reloading and re-reading the rows.
	 */
	async expectColumnFiltersInUrl(): Promise<void> {
		await this.url.expectWritten('columnFilters');
	}

	/**
	 * Deep-links a run with an arbitrary query string, so a scenario can open a
	 * link the way a user who was sent one does. Values for the compressed
	 * parameters must come from `captureLink()` rather than being hand-built —
	 * see the note there.
	 */
	async gotoWithParams(
		runId: number,
		params: Record<string, string | string[]>
	): Promise<void> {
		const searchParams = new URLSearchParams();
		for (const [key, value] of Object.entries(params)) {
			for (const item of Array.isArray(value) ? value : [value]) {
				searchParams.append(key, item);
			}
		}

		const search = searchParams.size ? `?${searchParams.toString()}` : '';
		await this.page.goto(`runs/${runId}${search}`);
		await expect(this.page).toHaveURL(new RegExp(`/runs/${runId}`));
	}

	async expectParams(expected: Record<string, string | null>): Promise<void> {
		await this.url.expect(expected);
	}

	async expectParamsPresent(keys: readonly string[]): Promise<void> {
		await this.url.expectPresent(keys);
	}

	async expectParamsAbsent(keys: readonly string[]): Promise<void> {
		await this.url.expectAbsent(keys);
	}

	/** The raw value of one key, for the parameters that are not compressed. */
	paramValue(key: string): string | null {
		return this.url.get(key);
	}

	/** `globalRequirements` repeats its key rather than joining the values. */
	async expectRepeatedParam(
		key: string,
		values: readonly string[]
	): Promise<void> {
		await this.url.expectRepeated(key, values);
	}

	/**
	 * The only assertion a compressed parameter supports. Reading the value
	 * would pin lz-string rather than the state it encodes; the round trip is
	 * proved by opening the link again and re-reading the rendered rows.
	 */
	async expectCompressedParams(
		keys: readonly string[] = RUN_COMPRESSED_URL_PARAMS
	): Promise<void> {
		for (const key of keys) await this.url.expectWritten(key);
	}

	async expectParamsUnchangedWhile(
		keys: readonly string[],
		action: () => Promise<void>
	): Promise<void> {
		await this.url.expectUnchangedWhile(keys, action);
	}

	/**
	 * The URL as it stands, for scenarios that share a link rather than build
	 * one. Half of this page's state is compressed, so the only honest way to
	 * test "someone opened the link I sent" is to let the app write the link
	 * and then open that — hand-encoding the blob would test lz-string.
	 */
	captureLink(): string {
		return this.page.url();
	}

	/** Test names of the rows the tree currently has expanded, in tree order. */
	async expandedRowNames(): Promise<string[]> {
		return this.page
			.locator('[data-testid="run-row"][data-expanded="true"]')
			.evaluateAll((rows) =>
				rows.map((row) => row.getAttribute('data-test-name') ?? '')
			);
	}

	async expectExpandedRowNames(names: readonly string[]): Promise<void> {
		await expect
			.poll(async () => (await this.expandedRowNames()).sort(), {
				timeout: 30_000,
				message: 'expanded rows'
			})
			.toEqual([...names].sort());
	}

	/**
	 * The header labels in the order the table renders them. The `<th>` cells
	 * carry no column id, so the label is the only handle the DOM offers —
	 * which means a header rename is a deliberate break of these scenarios.
	 */
	async visibleColumnLabels(): Promise<string[]> {
		return this.page
			.getByTestId('run-table')
			.locator('thead th')
			.evaluateAll((cells) =>
				cells.map((cell) => (cell.textContent ?? '').trim()).filter(Boolean)
			);
	}

	get columnsMenuTrigger(): Locator {
		return this.page
			.getByTestId('run-table-toolbar')
			.getByRole('button', { name: /Columns/ });
	}

	async openColumnsMenu(): Promise<void> {
		await this.columnsMenuTrigger.click();
		await expect(this.page.getByRole('menu')).toBeVisible({ timeout: 15_000 });
	}

	/** Toggles one column off (or on) from the Columns menu and closes it. */
	async toggleColumn(label: string): Promise<void> {
		await this.openColumnsMenu();
		await this.page.getByRole('menu').getByText(label, { exact: true }).click();
		await this.page.keyboard.press('Escape');
	}

	async expectRowCountAbove(previous: number): Promise<void> {
		await expect
			.poll(() => this.rows().count(), { timeout: 30_000 })
			.toBeGreaterThan(previous);
	}

	async openCompareForm(): Promise<Locator> {
		await this.page
			.getByRole('button', { name: 'Compare', exact: true })
			.first()
			.click();

		const form = this.page.locator('form').filter({ hasText: 'Compare Runs' });
		await expect(form).toBeVisible({ timeout: 15_000 });
		return form;
	}

	async openReports(): Promise<void> {
		await this.page.getByRole('button', { name: 'Reports' }).click();
	}

	/* ---------------------------------------------------------------- comment */

	/** The run comment on the info card; renders an em dash when there is none. */
	commentValue(): Locator {
		return this.page.getByTestId('run-comment-value');
	}

	async openCommentEditor(): Promise<void> {
		await this.page
			.getByRole('banner')
			.getByRole('button', { name: 'Edit', exact: true })
			.click();
		await expect(
			this.page.getByRole('heading', { name: 'Edit Comment' })
		).toBeVisible({ timeout: 15_000 });
	}

	/** The submit button is labelled Create, Update or Delete depending on the
	 *  current comment and what is left in the textarea. */
	async submitComment(comment: string): Promise<void> {
		const textarea = this.page.getByPlaceholder('Run comment...');
		await textarea.fill(comment);
		await this.page
			.getByRole('button', {
				name: comment === '' ? 'Delete' : /^(Create|Update)$/
			})
			.click();
	}

	async expectComment(comment: string): Promise<void> {
		await expect(this.commentValue()).toHaveText(comment, { timeout: 15_000 });
	}

	async expectNoComment(): Promise<void> {
		await expect(this.commentValue()).toHaveText('—', { timeout: 15_000 });
	}

	/* ------------------------------------------------------------------ notes */

	/** The Notes column is hidden by default, so a note cell only exists after
	 *  the column has been switched on through the toolbar. */
	async showColumn(label: string): Promise<void> {
		await this.toolbar.getByRole('button', { name: 'Columns' }).click();
		const menu = this.page.getByRole('menu');
		await expect(menu).toBeVisible({ timeout: 15_000 });
		await menu.getByText(label, { exact: true }).click();
		await this.page.keyboard.press('Escape');
		await expect(menu).toBeHidden({ timeout: 15_000 });
	}

	noteCell(row: Locator): Locator {
		return row.getByTestId('run-note-cell');
	}

	/** The note editors are portalled Radix popovers (role=dialog). Scoping to
	 *  the popover matters: the run table toolbar has a Submit button too. */
	notePopover(heading: string): Locator {
		return this.page
			.getByRole('dialog')
			.filter({ has: this.page.getByRole('heading', { name: heading }) });
	}

	async addNote(row: Locator, note: string): Promise<void> {
		await this.noteCell(row).getByRole('button', { name: 'Add Note' }).click();

		const popover = this.notePopover('Add Note');
		await expect(popover).toBeVisible({ timeout: 15_000 });
		await popover.getByPlaceholder('Example note...').fill(note);
		await popover.getByRole('button', { name: 'Submit' }).click();
		await expect(popover).toBeHidden({ timeout: 15_000 });
	}

	async expectNote(row: Locator, note: string): Promise<void> {
		await expect(this.noteCell(row).locator('pre')).toHaveText(note, {
			timeout: 30_000
		});
	}

	async expectNoNote(row: Locator): Promise<void> {
		await expect(
			this.noteCell(row).getByRole('button', { name: 'Add Note' })
		).toBeVisible({ timeout: 30_000 });
	}

	/** Deleting goes through the "all notes" popover, whose trigger is icon-only
	 *  and therefore addressed as the cell's first button. */
	async deleteNote(row: Locator): Promise<void> {
		await this.noteCell(row).getByRole('button').first().click();

		const popover = this.notePopover('Notes');
		await expect(popover).toBeVisible({ timeout: 15_000 });
		await popover.getByRole('button', { name: 'Delete Note' }).first().click();

		const confirm = this.page.getByRole('alertdialog');
		await expect(confirm).toBeVisible({ timeout: 15_000 });
		await confirm.getByRole('button', { name: 'Delete' }).click();
		await this.page.keyboard.press('Escape');
	}

	/* ------------------------------------------------------------ compromised */

	compromiseTrigger(): Locator {
		return this.page.getByRole('button', { name: 'Compromised form' });
	}

	/** The popover is portalled, and its "Mark as compromised" caption is a span
	 *  that repeats the trigger's label, so the form itself is the only stable
	 *  scope. */
	async openCompromiseForm(): Promise<Locator> {
		await this.compromiseTrigger().click();

		const form = this.page
			.locator('form')
			.filter({ hasText: 'Mark as compromised' });
		await expect(form).toBeVisible({ timeout: 15_000 });
		return form;
	}

	/** Bug ID and Bugs storage are both required by the form, even though the API
	 *  accepts a comment on its own. Bugs storage defaults to the first
	 *  configured issue tracker, so it is left untouched. */
	async markCompromised(values: {
		comment: string;
		bugId: string;
	}): Promise<void> {
		const form = await this.openCompromiseForm();
		await form.getByLabel('Comment').fill(values.comment);
		await form.getByLabel('Bug ID').fill(values.bugId);
		await form.getByRole('button', { name: 'Submit' }).click();
	}

	/** The app misspells this label — see CompromiseInfo. */
	async removeCompromised(): Promise<void> {
		await this.compromiseTrigger().click();
		await this.page
			.getByRole('button', { name: 'Remove compomised status' })
			.click();
	}

	/** The trigger's accessible name is pinned by aria-label="Compromised form",
	 *  so its state has to be read from the visible label instead. */
	async expectCompromised(): Promise<void> {
		await expect(this.compromiseTrigger()).toHaveText(/Run is compromised/, {
			timeout: 30_000
		});
	}

	async expectNotCompromised(): Promise<void> {
		await expect(this.compromiseTrigger()).toHaveText(/Mark as compromised/, {
			timeout: 30_000
		});
	}

	/**
	 * The compromise fixture run is shared by every browser project, so a spec
	 * that failed before undoing its own mutation would leave the next project
	 * with a compromised run. Restore the precondition instead of cascading.
	 */
	async ensureNotCompromised(): Promise<void> {
		const trigger = this.compromiseTrigger();
		await expect(trigger).toBeVisible({ timeout: 30_000 });

		if (/Run is compromised/.test((await trigger.textContent()) ?? '')) {
			await this.removeCompromised();
		}

		await this.expectNotCompromised();
	}

	/* --------------------------------------------------------- history links */

	/** The default History link of a result row, equivalent to the menu's
	 *  "Test Path + Parameters + Important Tags (Default)" entry. */
	historyLink(testName: string): Locator {
		return this.resultTable(testName).getByRole('link', { name: 'History' });
	}

	/** Opens the caret of the History split button on the first result row. */
	async openResultHistoryMenu(testName: string): Promise<void> {
		await this.resultTable(testName)
			.locator('button[aria-haspopup="menu"]')
			.first()
			.click();
		await expect(this.page.getByRole('menu')).toBeVisible({ timeout: 15_000 });
	}

	/** "Test Path + Verdicts" appears under both Open Direct Search and Open
	 *  Prefilled Form, in that DOM order, so the section picks which one. */
	async chooseHistoryLink(
		label: string,
		section: 'direct' | 'prefilled' = 'direct'
	): Promise<void> {
		const items = this.page.getByRole('menuitem', { name: label, exact: true });
		await (section === 'direct' ? items.first() : items.last()).click();
	}

	/** The history menu of a tree row — only rendered for test nodes of a single
	 *  run. */
	async openTestNodeHistory(row: Locator): Promise<void> {
		await row.getByTestId('tree-history-trigger').click();
		await this.page
			.getByRole('menuitem', { name: 'History View Of Results In The Run' })
			.click();
	}
}

export { RUN_COMPRESSED_URL_PARAMS, RUN_URL_PARAMS, RunPage };
export type {
	DiscriminatingResultBadge,
	ObtainedResultPart,
	ResultColumn,
	ResultFilterTitle
};
