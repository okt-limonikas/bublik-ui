/* SPDX-License-Identifier: Apache-2.0 */
/* SPDX-FileCopyrightText: 2024-2026 OKTET LTD */
import { expect, Locator, Page } from '@playwright/test';

class RunPage {
	constructor(private readonly page: Page) {}

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

export { RunPage };
