/* SPDX-License-Identifier: Apache-2.0 */
/* SPDX-FileCopyrightText: 2024-2026 OKTET LTD */
import { expect, Locator, Page } from '@playwright/test';

import { UrlParams, urlParams } from '../support/url-params';

/**
 * The layouts `LogPageMode` declares. The page compares the raw `mode` against
 * these by strict equality (`log-page.tsx`), so anything else is not a layout
 * it renders — see `LOG_URL_PARAMS.mode`.
 */
type LogMode = 'log' | 'infoAndlog' | 'treeAndinfoAndlog' | 'treeAndlog';

/**
 * Which panels each layout puts on the screen. `log` is not a fallback: it is
 * also what an unrecognised value renders, because neither panel's condition
 * matches.
 */
const LOG_MODE_LAYOUTS: Record<LogMode, { tree: boolean; info: boolean }> = {
	log: { tree: false, info: false },
	infoAndlog: { tree: false, info: true },
	treeAndinfoAndlog: { tree: true, info: true },
	treeAndlog: { tree: true, info: false }
};

/**
 * Declared in `libs/bublik/features/log/src/lib/hooks/index.ts`. The thing to
 * know about this page is that three of its parameters *delete* others when
 * they are written — focusing a result throws away the bookmarked line and the
 * page, and so does paging. A link that carried all three would otherwise
 * restore a bookmark belonging to a different result.
 *
 * Not in the URL, deliberately: the NOK-only tree toggle, the expanded log
 * rows, and the "all pages" preference, which is remembered in localStorage
 * (`useAllPagesMemory`) rather than shared through the link.
 */
const LOG_URL_PARAMS = {
	focusId: {
		codec: 'raw int',
		values: 'a result id',
		whenAbsent: "the whole run's log is shown",
		writtenBy:
			'the tree items (`setFocusId`), which also delete lineNumber and page'
	},
	mode: {
		codec: 'raw',
		values: 'log | infoAndlog | treeAndinfoAndlog | treeAndlog',
		whenAbsent:
			'neither the tree nor the info panel — the page has no fallback, so an unknown value renders the log on its own',
		writtenBy:
			'the sidebar layout links; appended by the /log/:runId/:old redirect'
	},
	page: {
		codec: 'raw',
		values:
			'a page number above one; 0 means every page at once. Page one is written as an ABSENT key, never as `page=1` — the publisher gives page one the unsuffixed file name and only suffixes pages above it (rgt `xml2multi_common.c`), so against a published bundle `?page=1` asks for a file nobody wrote',
		whenAbsent:
			'the first page — unless "all pages" was remembered for this run and result, which `useAllPagesMemory` keeps in localStorage for a day and which is on by default, in which case an absent key silently means page zero',
		writtenBy:
			'the pager (`setPage`), which deletes the key outright when it goes back to 1, and always deletes lineNumber — a bookmark belongs to one page'
	},
	lineNumber: {
		codec: 'raw',
		values: '<focusId>_<line>',
		whenAbsent: 'no line is bookmarked',
		writtenBy: 'clicking a line number'
	},
	legacy: {
		codec: 'raw',
		values: "'true' | 'false'",
		whenAbsent: 'the JSON renderer',
		writtenBy:
			'the legacy toggle, which writes `false` rather than deleting the key; and useLegacyLogRedirect, from the user preference'
	},
	experimental: {
		codec: 'raw, deprecated',
		values: "'false' means the legacy renderer",
		whenAbsent: 'ignored',
		writtenBy:
			'nothing any more — it is still read, but the toggle deletes it and writes `legacy` instead'
	}
} as const;

type LogUrlParam = keyof typeof LOG_URL_PARAMS;

class LogPage {
	private readonly url: UrlParams;

	constructor(private readonly page: Page) {
		this.url = urlParams(page);
	}

	get root(): Locator {
		return this.page.getByTestId('log-page');
	}

	get tree(): Locator {
		return this.page.getByTestId('log-tree');
	}

	get logTable(): Locator {
		return this.page.getByTestId('log-table-block').first();
	}

	get legacyToggle(): Locator {
		return this.page.getByTestId('log-legacy-toggle');
	}

	get legacyFrame(): Locator {
		return this.page.frameLocator('iframe[title="log"]').locator('body');
	}

	async goto(
		runId: number,
		searchParams?: URLSearchParams | string
	): Promise<void> {
		const search =
			typeof searchParams === 'string'
				? searchParams
				: searchParams?.toString() ?? '';
		await this.page.goto(`log/${runId}${search ? `?${search}` : ''}`);
		await expect(this.page).toHaveURL(new RegExp(`/log/${runId}`));
	}

	async expectLoaded(): Promise<void> {
		await expect(this.root).toBeVisible({ timeout: 30_000 });
		await expect(
			this.root.getByRole('main').getByText('Log', { exact: true })
		).toBeVisible({ timeout: 30_000 });
	}

	async expectInfoVisible(): Promise<void> {
		await expect(this.page.getByTestId('log-info')).toBeVisible({
			timeout: 30_000
		});
	}

	async expectInfoHidden(): Promise<void> {
		await expect(this.page.getByTestId('log-info')).toHaveCount(0);
	}

	async expectTreeVisible(): Promise<void> {
		await expect(this.tree).toBeVisible({ timeout: 30_000 });
	}

	async expectTreeHidden(): Promise<void> {
		await expect(this.tree).toHaveCount(0);
	}

	treeItem(resultId: string | number): Locator {
		return this.page.locator(
			`[data-testid="log-tree-item"][data-log-tree-item-id="${resultId}"]`
		);
	}

	async expectFocusedTreeItem(resultId: string | number): Promise<void> {
		await expect(this.treeItem(resultId)).toHaveAttribute(
			'data-log-tree-item-focused',
			'true',
			{ timeout: 30_000 }
		);
	}

	async showRunLog(): Promise<void> {
		await this.page.getByTestId('log-tree-run-log').click();
		await expect(this.page).not.toHaveURL(/focusId=/, { timeout: 15_000 });
	}

	async toggleOnlyNok(): Promise<void> {
		await this.page.getByTestId('log-tree-only-nok').click();
	}

	async scrollToFocus(): Promise<void> {
		await this.page.getByTestId('log-tree-scroll-to-focus').click();
	}

	async toggleLegacyLog(): Promise<void> {
		await this.legacyToggle.click();
	}

	async openFocusedResultMeasurements(): Promise<void> {
		await this.root.getByRole('link', { name: 'Result', exact: true }).click();
	}

	async expectJsonLogVisible(): Promise<void> {
		await expect(this.logTable).toBeVisible({ timeout: 30_000 });
	}

	async expectLegacyLogVisible(): Promise<void> {
		await expect(this.page.locator('iframe[title="log"]')).toBeVisible({
			timeout: 30_000
		});
	}

	/**
	 * Deep-links a log, so a scenario can open a link the way a user who
	 * bookmarked one does — including combinations the UI would never write
	 * itself, which is the point of the clear-on-write scenarios.
	 */
	async gotoWithParams(
		runId: number,
		params: Record<string, string>
	): Promise<void> {
		await this.goto(runId, new URLSearchParams(params));
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

	async expectParamsUnchangedWhile(
		keys: readonly string[],
		action: () => Promise<void>
	): Promise<void> {
		await this.url.expectUnchangedWhile(keys, action);
	}

	/**
	 * The mode as the page received it, not as it resolved it — the attribute
	 * reflects the raw parameter, so an unrecognised value shows up here
	 * unchanged while the panels below fall back to the log on its own.
	 */
	async expectRawMode(mode: string): Promise<void> {
		await expect(this.root).toHaveAttribute('data-log-mode', mode, {
			timeout: 30_000
		});
	}

	/** The panels a layout puts on the screen, which is the real contract. */
	async expectLayout(layout: { tree: boolean; info: boolean }): Promise<void> {
		await this.expectLoaded();

		if (layout.tree) await this.expectTreeVisible();
		else await this.expectTreeHidden();

		if (layout.info) await this.expectInfoVisible();
		else await this.expectInfoHidden();
	}

	async expectModeLayout(mode: LogMode): Promise<void> {
		await this.expectLayout(LOG_MODE_LAYOUTS[mode]);
	}

	treeItems(): Locator {
		return this.page.getByTestId('log-tree-item');
	}

	/** Result ids of the tree items currently listed, in tree order. */
	async treeItemIds(): Promise<string[]> {
		return this.treeItems().evaluateAll((items) =>
			items.map((item) => item.getAttribute('data-log-tree-item-id') ?? '')
		);
	}

	/**
	 * Focuses a tree item and waits for the focus to land in the URL, so the
	 * scenarios that assert what focusing *cleared* are not racing the write.
	 */
	async focusTreeItem(resultId: string | number): Promise<void> {
		await this.treeItem(resultId).click();
		await expect(this.page).toHaveURL(new RegExp(`focusId=${resultId}`), {
			timeout: 15_000
		});
	}

	get allPagesButton(): Locator {
		return this.page.getByTestId('log-all-pages').first();
	}

	/**
	 * The numbered pager. Scoped to the log table because `tw-pagination` is a
	 * shared testid, and `.first()` because the pager is rendered both above and
	 * below the rows.
	 */
	get pager(): Locator {
		return this.logTable.getByTestId('tw-pagination').first();
	}

	pagerButton(pageNumber: number): Locator {
		return this.pager.getByRole('button', {
			name: String(pageNumber),
			exact: true
		});
	}

	logRows(): Locator {
		return this.logTable.getByTestId('log-table-row');
	}

	logRow(rowId: string): Locator {
		return this.logTable.locator(`[data-log-row-id="${rowId}"]`);
	}

	async logRowCount(): Promise<number> {
		await expect(this.logRows().first()).toBeVisible({ timeout: 30_000 });

		return this.logRows().count();
	}

	/**
	 * The row id of the first rendered row. Row ids are `<blockIndex>_<line>`,
	 * built by the table itself — never assemble one from a focus id.
	 */
	async firstRowId(): Promise<string> {
		const first = this.logRows().first();
		await expect(first).toBeVisible({ timeout: 30_000 });

		return (await first.getAttribute('data-log-row-id')) ?? '';
	}

	async openAllPages(): Promise<void> {
		await this.allPagesButton.click();
		await expect(this.page).toHaveURL(/page=0/, { timeout: 15_000 });
	}

	/** Pages through the numbered pager, which is the only way the UI writes `page`. */
	async openPage(pageNumber: number): Promise<void> {
		const button = this.pagerButton(pageNumber);

		await button.click();
		await this.expectCurrentPage(pageNumber);
	}

	/**
	 * The pager marks the page in view with `aria-current`. It does not do so
	 * while every page is shown at once — that state is read off the All pages
	 * button instead.
	 */
	async expectCurrentPage(pageNumber: number): Promise<void> {
		await expect(this.pager.locator('[aria-current="page"]')).toHaveText(
			String(pageNumber),
			{ timeout: 15_000 }
		);
	}

	/**
	 * No page is current while every page is shown at once — the pager hides the
	 * marker rather than picking one, so the All pages button is the only thing
	 * that says which view is in force.
	 */
	async expectNoCurrentPage(): Promise<void> {
		await expect(this.pager.locator('[aria-current="page"]')).toHaveCount(0);
	}

	async expectPagesCount(pages: number): Promise<void> {
		await expect(this.pagerButton(pages)).toBeVisible({ timeout: 30_000 });
		await expect(this.pagerButton(pages + 1)).toHaveCount(0);
	}

	/** A log published as a single file renders no pager at all — not even All pages. */
	async expectNoPager(): Promise<void> {
		await expect(this.page.getByTestId('log-all-pages')).toHaveCount(0);
	}

	async expectRowInViewport(rowId: string): Promise<void> {
		await expect(this.logRow(rowId)).toBeInViewport({ timeout: 15_000 });
	}

	async expectRowOutOfViewport(rowId: string): Promise<void> {
		await expect(this.logRow(rowId)).not.toBeInViewport({ timeout: 15_000 });
	}

	/**
	 * Bookmarks one line and returns the value the app wrote, which is the row
	 * id (`<blockIndex>_<line>`) and not `<focusId>_<line>` — the block index is
	 * the position of the table in the log's content, so it cannot be predicted
	 * from the URL.
	 */
	async bookmarkLine(line: number): Promise<string> {
		const button = this.logTable.locator(
			`[data-testid="log-line-number"][data-log-line-number="${line}"]`
		);
		await expect(button).toBeVisible({ timeout: 30_000 });
		await button.click();
		await expect(this.page).toHaveURL(/lineNumber=/, { timeout: 15_000 });

		return new URL(this.page.url()).searchParams.get('lineNumber') ?? '';
	}

	/**
	 * Drops the remembered "all pages" choice before the first navigation.
	 * `log.rememberAllPages` is on by default, so without this an absent `page`
	 * can silently mean page zero and the pagination scenarios stop being about
	 * what the URL says.
	 */
	async forgetAllPagesMemory(): Promise<void> {
		await this.page.addInitScript(() =>
			window.localStorage.removeItem('log-all-pages-memory')
		);
	}

	/**
	 * The pager marks itself pressed while every page is shown, which is the
	 * only rendered signal that page zero was applied rather than merely
	 * written.
	 */
	async expectAllPagesActive(active: boolean): Promise<void> {
		await expect(this.allPagesButton).toHaveAttribute(
			'aria-pressed',
			String(active),
			{ timeout: 15_000 }
		);
	}

	async bookmarkFirstLine(): Promise<string> {
		const firstLine = this.page.getByTestId('log-line-number').first();
		await expect(firstLine).toBeVisible({ timeout: 30_000 });
		const line = await firstLine.getAttribute('data-log-line-number');
		await firstLine.click();
		await expect(this.page).toHaveURL(/lineNumber=/, { timeout: 15_000 });
		return line ?? '1';
	}

	async expandFirstRowIfAvailable(): Promise<void> {
		const expandButton = this.page.getByTestId('log-row-expand').first();
		if (await expandButton.isVisible()) {
			await expandButton.click();
		}
	}
}

export { LOG_MODE_LAYOUTS, LOG_URL_PARAMS, LogPage };
export type { LogMode, LogUrlParam };
