/* SPDX-License-Identifier: Apache-2.0 */
/* SPDX-FileCopyrightText: 2024-2026 OKTET LTD */
import { expect, Locator, Page } from '@playwright/test';

/**
 * The sidebar's project picker. Selecting a project writes `?project=<id>`, and
 * every page-level query (dashboard, runs, history) is scoped by it — so the
 * selection is observable in the URL as well as in the trigger's own label.
 */
class ProjectPicker {
	constructor(private readonly page: Page) {}

	private sidebar(): Locator {
		return this.page.locator('#sidebar');
	}

	trigger(): Locator {
		return this.sidebar().getByTestId('project-picker-trigger');
	}

	/**
	 * The list reports whether it is open: the options stay in the DOM while it
	 * is collapsed, and a clipped option still has a bounding box, so
	 * visibility alone cannot tell the two states apart.
	 */
	list(): Locator {
		return this.sidebar().getByTestId('project-picker-list');
	}

	option(projectId: number | 'all'): Locator {
		return this.sidebar().locator(
			`[data-testid="project-picker-option"][data-project-id="${projectId}"]`
		);
	}

	/**
	 * The sidebar starts collapsed (localStorage `sidebar-open` defaults to
	 * false, and a signed-out context starts with empty storage). From
	 * collapsed, a single click both expands the sidebar and opens the list;
	 * from an expanded sidebar it toggles the list — so selecting a project,
	 * which leaves the list open, must not click the trigger again.
	 */
	async open(): Promise<void> {
		if ((await this.list().getAttribute('data-state')) === 'open') return;

		await this.trigger().click();
		await expect(this.list()).toHaveAttribute('data-state', 'open', {
			timeout: 15_000
		});
	}

	async select(projectId: number): Promise<void> {
		await this.open();
		await this.option(projectId).click();
		await expect(this.page).toHaveURL(new RegExp(`project=${projectId}`), {
			timeout: 15_000
		});
	}

	async selectAll(): Promise<void> {
		await this.open();
		await this.option('all').click();
		await expect
			.poll(() => new URL(this.page.url()).searchParams.get('project'), {
				timeout: 15_000
			})
			.toBeNull();
	}

	/** The trigger shows the selected project's name, or `Projects` for none. */
	async expectSelectedLabel(name: string): Promise<void> {
		await expect(this.trigger()).toContainText(name, { timeout: 15_000 });
	}
}

export { ProjectPicker };
