/* SPDX-License-Identifier: Apache-2.0 */
/* SPDX-FileCopyrightText: 2024-2026 OKTET LTD */
import { expect, Locator, Page, Request } from '@playwright/test';

import { exactText } from '../support/e2e-data';
import { UrlParams, urlParams } from '../support/url-params';
import { HistoryGlobalSearchForm } from './history-global-search-form';

/**
 * The five modes the page renders, as spelled in `?mode=`. Mirrors
 * `HISTORY_PAGE_MODES` in
 * `libs/bublik/features/history/src/lib/history-mode-picker/history-mode.ts`,
 * whose `resolveHistoryMode` falls back to `linear` for anything else.
 */
const HISTORY_MODES = [
	'linear',
	'aggregation',
	'measurements',
	'measurements-by-iteration',
	'measurements-combined'
] as const;

type HistoryMode = (typeof HISTORY_MODES)[number];

/**
 * The cell ids of the two table modes, as carried by `data-column-id`.
 *
 * The aggregation ids read backwards against their headers — `results-log`
 * renders the "Parameters/Hash" column and `parameters-hash` renders
 * "Results/Log". That swap is in
 * `libs/bublik/features/history/src/lib/history-aggregation/`; the selectors
 * follow the ids, not the headers.
 */
const HISTORY_LINEAR_COLUMNS = [
	'links',
	'start-duration',
	'metadata',
	'tags',
	'expected-results',
	'obtained-results',
	'parameters'
] as const;

const HISTORY_AGGREGATION_COLUMNS = [
	/** Renders the "Parameters/Hash" column: parameter badges plus the hash. */
	'results-log',
	/** Renders the "Results/Log" column: result, verdict badges and log links. */
	'parameters-hash'
] as const;

type HistoryColumn =
	| (typeof HISTORY_LINEAR_COLUMNS)[number]
	| (typeof HISTORY_AGGREGATION_COLUMNS)[number];

/**
 * Cells that hold a result block render the result type first and its verdicts
 * after, and the two filter differently — a result badge narrows by type and
 * expectedness, a verdict badge by membership. Callers say which they mean.
 */
type HistoryBadgePart = 'all' | 'result' | 'verdicts';

/**
 * A badge some listed rows carry and others do not, so clicking it visibly
 * narrows the table.
 */
interface DiscriminatingHistoryBadge {
	column: HistoryColumn;
	text: string;
	rowIndex: number;
	matchingRows: number;
	totalRows: number;
}

type HistoryLegendItem =
	| 'runs'
	| 'iterations'
	| 'results'
	| 'expected'
	| 'unexpected';

/**
 * The history page keeps its whole query in the URL — the search form is not
 * persisted anywhere else, so a link is the only way a query is saved or
 * shared. This table is the inventory the @url-params scenarios are written
 * against.
 *
 * `sentAs` is the column the dashboard's equivalent table does not need. A
 * history parameter is renamed twice on its way out: once from the URL name to
 * the backend name (`searchQueryToBackendQuery` in
 * `libs/bublik/features/history/src/lib/slice/history-slice.utils.ts`) and once
 * from camelCase to snake_case (`prepareForSend` in
 * `libs/services/bublik-api/src/lib/utils/utils.ts`). Nothing validates the URL
 * on the way in — `useHistoryQuery` does `Object.fromEntries(searchParams)` —
 * so a key renamed on one side only fails silently, filtering by nothing at
 * all. `sentAs` is what the scenarios assert against the outgoing request.
 *
 * List values are joined with `;` (`config.queryDelimiter`). The whole search
 * form block is written on every submit, empty fields included as `''` —
 * `historySearchStateToQuery` never omits a key.
 *
 * Two things are deliberately not in this table:
 *
 * - `_s` (compressed sidebar state) and `hide-sidebar` ride along on the URL
 *   but belong to the sidebar, and `navigateWithProject` injects them.
 *   Assertions must name the keys they read rather than compare query strings.
 * - There is no substring/search parameter. The substring filter lives in
 *   redux only (`history-substring-filter.container.tsx`) and is lost on
 *   reload — unlike the dashboard's `search`, which is a URL parameter.
 */
const HISTORY_URL_PARAMS = {
	/* Test section */
	testName: {
		sentAs: 'test_name',
		values: 'test path',
		whenAbsent: 'the page asks for a test name instead of querying',
		writtenBy: 'the global search form'
	},
	hash: {
		sentAs: 'hash',
		values: 'iteration hash',
		whenAbsent: 'results are not narrowed by hash',
		writtenBy: 'the global search form'
	},
	parameters: {
		sentAs: 'test_args',
		values: '`;`-joined key=value pairs',
		whenAbsent: 'results are not narrowed by parameter',
		writtenBy: 'the global search form'
	},
	revisions: {
		sentAs: 'revisions',
		values: '`;`-joined revisions',
		whenAbsent: 'results are not narrowed by revision',
		writtenBy: 'the global search form'
	},
	branches: {
		sentAs: 'branches',
		values: '`;`-joined branches',
		whenAbsent: 'results are not narrowed by branch',
		writtenBy: 'the global search form'
	},
	labels: {
		sentAs: 'labels',
		values: '`;`-joined labels',
		whenAbsent: 'results are not narrowed by label',
		writtenBy: 'the global search form'
	},
	/* Run section */
	startDate: {
		sentAs: 'from_date',
		values: 'YYYY-MM-DD',
		whenAbsent: '31 days ago',
		writtenBy: 'the global search form date picker'
	},
	finishDate: {
		sentAs: 'to_date',
		values: 'YYYY-MM-DD',
		whenAbsent: 'today',
		writtenBy: 'the global search form date picker'
	},
	runData: {
		sentAs: 'tags',
		values: '`;`-joined run tags and metadata',
		whenAbsent: 'results are not narrowed by run data',
		writtenBy: 'the global search form'
	},
	runIds: {
		sentAs: 'run_ids',
		values: '`;`-joined run ids',
		whenAbsent: 'every run in the date range is queried',
		writtenBy: 'the global search form'
	},
	tagExpr: {
		sentAs: 'tag_expr',
		values: 'tag expression',
		whenAbsent: 'no tag expression is applied',
		writtenBy: 'the global search form expression field'
	},
	branchExpr: {
		sentAs: 'branch_expr',
		values: 'branch expression',
		whenAbsent: 'no branch expression is applied',
		writtenBy: 'the global search form expression field'
	},
	labelExpr: {
		sentAs: 'label_expr',
		values: 'label expression',
		whenAbsent: 'no label expression is applied',
		writtenBy: 'the global search form expression field'
	},
	testArgExpr: {
		sentAs: 'test_arg_expr',
		values: 'parameter expression',
		whenAbsent: 'no parameter expression is applied',
		writtenBy: 'the global search form expression field'
	},
	revisionExpr: {
		sentAs: 'rev_expr',
		values: 'revision expression',
		whenAbsent: 'no revision expression is applied',
		writtenBy: 'the global search form expression field'
	},
	verdictExpr: {
		sentAs: 'verdict_expr',
		values: 'verdict expression',
		whenAbsent: 'no verdict expression is applied',
		writtenBy: 'the global search form expression field'
	},
	/* Result section */
	runProperties: {
		sentAs: 'run_properties',
		values: '`;`-joined run properties',
		whenAbsent: 'not compromised runs only',
		writtenBy: 'the global search form result section'
	},
	resultProperties: {
		sentAs: 'result_types',
		values: '`;`-joined expected | unexpected',
		whenAbsent: 'both expected and unexpected',
		writtenBy: 'the global search form result section'
	},
	results: {
		sentAs: 'result_statuses',
		values: '`;`-joined PASSED | FAILED | KILLED | …',
		whenAbsent: 'every obtained result type',
		writtenBy: 'the global search form result section'
	},
	/* Verdict section */
	verdictLookup: {
		sentAs: 'verdict_lookup',
		values: 'string | regex | none',
		whenAbsent: 'string',
		writtenBy: 'the global search form verdict lookup picker'
	},
	verdict: {
		sentAs: 'verdict',
		values: '`;`-joined verdicts',
		whenAbsent: 'results are not narrowed by verdict',
		writtenBy: 'the global search form'
	},
	/* Layout and paging — not part of the query sent to the history endpoint */
	mode: {
		sentAs: null,
		values: HISTORY_MODES.join(' | '),
		whenAbsent: 'the list of results',
		writtenBy: 'the sidebar mode links; re-stamped by every form write'
	},
	page: {
		sentAs: 'page',
		values: '1-based page number',
		whenAbsent: 'the first page',
		writtenBy: 'the pagination control; forced back to 1 on submit'
	},
	pageSize: {
		sentAs: 'page_size',
		values: 'results per page',
		whenAbsent: '25',
		writtenBy: 'the pagination control'
	},
	/* Charts */
	combinedPlots: {
		sentAs: null,
		values: '`;`-joined chart ids',
		whenAbsent: 'the stacked view has nothing to draw',
		writtenBy: 'Add to combined chart, in the trend view'
	},
	'chart-group': {
		sentAs: null,
		values: 'trend | measurement',
		whenAbsent: 'no grouping is applied',
		writtenBy: 'the combined charts provider, which also clears it'
	},
	parametersByResultName: {
		sentAs: null,
		values: 'repeated chart name',
		whenAbsent: 'every chart is drawn',
		writtenBy: 'the Charts filter, in the series view'
	},
	parametersByResultFilter: {
		sentAs: null,
		values: 'repeated parameter name',
		whenAbsent: 'every parameter is drawn',
		writtenBy: 'the Parameters filter, in the series view'
	},
	/* Scoping */
	project: {
		sentAs: 'project',
		values: 'project id, repeatable',
		whenAbsent: 'every project is queried',
		writtenBy: 'the sidebar project picker; re-appended by every form write'
	}
} as const;

type HistoryUrlParam = keyof typeof HISTORY_URL_PARAMS;

/** Every key the search form writes, in the order the serializer emits them. */
const HISTORY_SEARCH_FORM_PARAMS = [
	'testName',
	'hash',
	'labels',
	'parameters',
	'revisions',
	'branches',
	'runData',
	'tagExpr',
	'branchExpr',
	'labelExpr',
	'testArgExpr',
	'revisionExpr',
	'verdictExpr',
	'startDate',
	'finishDate',
	'runIds',
	'resultProperties',
	'runProperties',
	'results',
	'verdictLookup',
	'verdict'
] as const satisfies readonly HistoryUrlParam[];

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
	private readonly url: UrlParams;

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
		this.url = urlParams(page);
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

	/**
	 * Deep-links the history page with an arbitrary query string, so a scenario
	 * can open a link the way a user who bookmarked one does. `gotoWithTestPath`
	 * covers the common case; this one exists for the parameters it does not
	 * name, and for values that are deliberately malformed.
	 */
	async gotoWithParams(params: Record<string, string>): Promise<void> {
		await this.goto(new URLSearchParams(params));
	}

	/**
	 * Asserts the query string the page is currently carrying. A `null`
	 * expectation means the key must be absent, `''` means present but empty —
	 * the two are different states, and the history page uses both.
	 *
	 * Only the named keys are read: the URL also carries sidebar state the
	 * history page does not own, so asserting the whole query string would be
	 * flaky. Polls because every write is an async history replace.
	 */
	async expectParams(expected: Record<string, string | null>): Promise<void> {
		await this.url.expect(expected);
	}

	/**
	 * Asserts the keys are in the query string whatever their values. The search
	 * form writes its whole block on every submit, most of it empty, so "the key
	 * is still being written" is the contract worth pinning — a parameter that
	 * silently stopped being serialized fails here.
	 */
	async expectParamsPresent(keys: readonly string[]): Promise<void> {
		await this.url.expectPresent(keys);
	}

	/** The raw value of one key, for assertions the helpers do not cover. */
	paramValue(key: string): string | null {
		return this.url.get(key);
	}

	/** Every value of a repeated key — an ArrayParam, not a `;`-joined list. */
	paramValues(key: string): string[] {
		return this.url.getAll(key);
	}

	/** `;`-joined lists: membership, since the app chooses the order. */
	async expectDelimitedParam(key: string, ...values: string[]): Promise<void> {
		await this.url.expectDelimitedContains(key, ...values);
	}

	/** `ArrayParam` lists: one repeated key per value, not a joined string. */
	async expectRepeatedParam(
		key: string,
		values: readonly string[]
	): Promise<void> {
		await this.url.expectRepeated(key, values);
	}

	/**
	 * The keyed form of `expectUrlUnchangedWhile`, for scenarios where the
	 * sidebar is free to write `_s` while the history query must not move.
	 */
	async expectParamsUnchangedWhile(
		keys: readonly string[],
		action: () => Promise<void>,
		settleMs = 2_000
	): Promise<void> {
		await this.url.expectUnchangedWhile(keys, action, settleMs);
	}

	/**
	 * Resolves with the request the page sent to the history API. Scenarios that
	 * check the renames assert the request rather than the response, so they
	 * hold whether or not the backend likes the query.
	 *
	 * The grouped endpoint backs the aggregation mode and takes the same query,
	 * so both count. Arm this before navigating.
	 */
	waitForHistoryRequest(testPath?: string): Promise<Request> {
		return this.page.waitForRequest((request) => {
			const url = new URL(request.url());
			const isHistory =
				url.pathname.endsWith('/api/v2/history/') ||
				url.pathname.endsWith('/api/v2/history/grouped/');

			return (
				isHistory &&
				(!testPath || url.searchParams.get('test_name') === testPath)
			);
		});
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

	/**
	 * Cells of a column across every listed row. Both modes render through
	 * `TwTable`, so both tag their cells with the column id.
	 */
	cells(columnId: HistoryColumn): Locator {
		return this.rows().locator(`[data-column-id="${columnId}"]`);
	}

	/**
	 * Only clickable badges are buttons — the shared `Badge` renders a `div`
	 * when it has no handler, which is how the aggregation hash and the whole
	 * Expected Results column stay out of the way.
	 */
	badges(columnId: HistoryColumn, rowIndex = 0): Locator {
		return this.cells(columnId)
			.nth(rowIndex)
			.locator('button[data-testid="tw-badge"]');
	}

	/** Aggregation: the parameter badges, excluding the non-clickable hash. */
	parameterBadges(rowIndex = 0): Locator {
		return this.badges('results-log', rowIndex);
	}

	/** The first badge of a result block is the result type; the rest verdicts. */
	obtainedResultBadge(
		rowIndex = 0,
		columnId: HistoryColumn = 'obtained-results'
	): Locator {
		return this.badges(columnId, rowIndex).first();
	}

	/**
	 * Every badge text of a column, per row, from one DOM snapshot — sampling
	 * row by row could straddle a re-render and mix two filter states.
	 */
	async badgeTextsByRow(
		columnId: HistoryColumn,
		part: HistoryBadgePart = 'all'
	): Promise<string[][]> {
		return this.table.evaluate(
			(root, { column, part: which }) => {
				const cells = Array.from(
					root.querySelectorAll(
						`.tw-table-body [role="row"] [data-column-id="${column}"]`
					)
				);

				return cells.map((cell) => {
					// A result block is one verdict list: the result badge, then its
					// verdicts. The aggregation cell holds several such blocks, so
					// each is sliced on its own.
					const blocks = Array.from(
						cell.querySelectorAll('[data-testid="tw-verdict-list"]')
					);
					const groups = (blocks.length ? blocks : [cell]).map((block) =>
						Array.from(
							block.querySelectorAll('button[data-testid="tw-badge"]')
						).map((badge) => (badge.textContent ?? '').trim())
					);

					if (which === 'result') {
						return groups.flatMap((items) => items.slice(0, 1));
					}

					if (which === 'verdicts') {
						return groups.flatMap((items) => items.slice(1));
					}

					return groups.flat();
				});
			},
			{ column: columnId, part }
		);
	}

	/**
	 * Picks a badge carried by some listed rows and not others. Throws rather
	 * than skipping, so a fixture that stops exercising the filter fails loudly.
	 */
	async pickDiscriminatingBadge(
		columnId: HistoryColumn,
		part: HistoryBadgePart = 'all'
	): Promise<DiscriminatingHistoryBadge> {
		const byRow = await this.badgeTextsByRow(columnId, part);
		const counts = new Map<string, { rows: number[] }>();

		for (const [rowIndex, texts] of byRow.entries()) {
			for (const text of new Set(texts)) {
				const entry = counts.get(text) ?? { rows: [] };
				entry.rows.push(rowIndex);
				counts.set(text, entry);
			}
		}

		for (const [text, { rows }] of counts) {
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
			`No badge in the "${columnId}" column is carried by only some of the ${byRow.length} listed rows, so clicking one cannot be observed. Check the fixture plan.`
		);
	}

	async clickBadge(
		columnId: HistoryColumn,
		rowIndex: number,
		text: string
	): Promise<void> {
		await this.badges(columnId, rowIndex)
			.filter({ hasText: exactText(text) })
			.first()
			.click();
	}

	/**
	 * Badge filtering is a client-side table filter, so the rows settle without
	 * a request — but React still re-renders, hence the poll. Asserts the cut is
	 * real (something went, something stayed) and that every survivor carries the
	 * value; the exact count is only worth pinning in the aggregation mode, where
	 * the grouping makes it deterministic.
	 */
	async expectRowsNarrowedTo(
		columnId: HistoryColumn,
		text: string,
		before: number,
		part: HistoryBadgePart = 'all'
	): Promise<void> {
		await expect
			.poll(() => this.rows().count(), {
				timeout: 30_000,
				message: `rows after filtering by "${text}"`
			})
			.toBeLessThan(before);

		const byRow = await this.badgeTextsByRow(columnId, part);

		expect(byRow.length).toBeGreaterThan(0);
		for (const texts of byRow) {
			expect(texts).toContain(text);
		}
	}

	/**
	 * A badge marks itself selected through `data-badge-selected`. In the history
	 * tables nothing else records that the filter was applied — the query stays
	 * untouched — so this is what tells a selected badge from an inert one.
	 *
	 * Matched across the table rather than in one row: filtering removes rows, so
	 * the index the badge was clicked at no longer identifies it.
	 */
	async expectBadgeSelected(
		columnId: HistoryColumn,
		text: string
	): Promise<void> {
		await expect(
			this.cells(columnId)
				.locator('button[data-testid="tw-badge"][data-badge-selected]')
				.filter({ hasText: exactText(text) })
				.first()
		).toBeVisible({ timeout: 15_000 });
	}

	/**
	 * Right-clicking a cell opens the history context menu, which — unlike a
	 * left click on the same badges — rewrites the URL and refetches. The menu
	 * is portalled, so it is waited for before an item is chosen.
	 */
	async openCellContextMenu(
		columnId: HistoryColumn,
		rowIndex = 0
	): Promise<void> {
		await this.cells(columnId).nth(rowIndex).click({ button: 'right' });
		await expect(this.page.getByRole('menu')).toBeVisible({ timeout: 15_000 });
	}

	async chooseContextMenuItem(label: string): Promise<void> {
		await this.page
			.getByRole('menuitem', { name: label, exact: true })
			.first()
			.click();
	}

	/**
	 * Runs `action` and asserts the query string did not move. Bounded on
	 * purpose: proving a negative needs a deadline, not an open-ended wait.
	 */
	async expectUrlUnchangedWhile(
		action: () => Promise<void>,
		settleMs = 2_000
	): Promise<void> {
		const before = new URL(this.page.url()).search;

		await action();
		// A deliberate settle: the assertion is that nothing happened, and there
		// is no event to wait for when the contract is "no navigation".
		// eslint-disable-next-line playwright/no-wait-for-timeout
		await this.page.waitForTimeout(settleMs);

		expect(new URL(this.page.url()).search).toBe(before);
	}

	/**
	 * Every history request the page sent while `action` ran, in order.
	 *
	 * `waitForHistoryRequest` resolves on the *first* match, which is the wrong
	 * one here: a filter applied through the context menu replaces a query that
	 * may still have a request in flight, so the interesting request is the last
	 * one, not the next one.
	 */
	async captureHistoryRequests(
		action: () => Promise<void>,
		settleMs = 2_000
	): Promise<Request[]> {
		const requests: Request[] = [];
		const listen = (request: Request) => {
			const { pathname } = new URL(request.url());

			if (
				pathname.endsWith('/api/v2/history/') ||
				pathname.endsWith('/api/v2/history/grouped/')
			) {
				requests.push(request);
			}
		};

		this.page.on('request', listen);
		try {
			await action();
			// A deliberate settle: the refetch is fired by a cache invalidation,
			// so there is no single event that marks the end of the burst.
			// eslint-disable-next-line playwright/no-wait-for-timeout
			await this.page.waitForTimeout(settleMs);
		} finally {
			this.page.off('request', listen);
		}

		return requests;
	}

	/**
	 * Resolves to true when the page sent a history request within `withinMs`.
	 * The client-side filters must not, so the scenario that pins that contract
	 * needs a bounded wait rather than `waitForHistoryRequest`.
	 */
	async sentHistoryRequestWithin(
		action: () => Promise<void>,
		withinMs = 2_000
	): Promise<boolean> {
		let sent = false;
		const listen = (request: { url(): string }) => {
			const { pathname } = new URL(request.url());

			if (
				pathname.endsWith('/api/v2/history/') ||
				pathname.endsWith('/api/v2/history/grouped/')
			) {
				sent = true;
			}
		};

		this.page.on('request', listen);
		try {
			await action();
			// Same deliberate settle: the contract is that no request was sent.
			// eslint-disable-next-line playwright/no-wait-for-timeout
			await this.page.waitForTimeout(withinMs);
		} finally {
			this.page.off('request', listen);
		}

		return sent;
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

export {
	HISTORY_AGGREGATION_COLUMNS,
	HISTORY_LINEAR_COLUMNS,
	HISTORY_MODES,
	HISTORY_SEARCH_FORM_PARAMS,
	HISTORY_URL_PARAMS,
	HistoryPage
};
export type {
	DiscriminatingHistoryBadge,
	HistoryBadgePart,
	HistoryColumn,
	HistoryLegendItem,
	HistoryMode,
	HistoryUrlParam
};
