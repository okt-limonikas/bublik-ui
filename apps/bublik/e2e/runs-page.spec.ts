/* SPDX-License-Identifier: Apache-2.0 */
/* SPDX-FileCopyrightText: 2024-2026 OKTET LTD */
/* Implements apps/bublik/e2e/features/runs.feature */
import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

import { RunsPage } from './pages/runs-page';
import { RunPage } from './pages/run-page';
import { importedRunId } from './support/e2e-data';
import { and, given, then, when } from './support/gherkin';
import { requireCapability } from './support/capabilities';
import { requireManifest } from './support/manifest';
import type { Bundle } from './support/manifest';
import {
	expectedNokCount,
	representativeNokRun,
	representativeRun,
	runPairOnSameDate,
	runsBadgeDate
} from './support/sample-cases';
import type { DiscriminatingBadge, RunsBadgeColumn } from './pages/runs-page';

function fixtureTagExpr(bundle: Bundle): string {
	return `fixture_id=${bundle.e2eRunId}`;
}

/** The date whose runs do not all carry the same tags — see runsBadgeDate. */
function badgeDate(): string {
	return requireCapability(
		runsBadgeDate(requireManifest()),
		'Fixture manifest contains no date whose imported runs carry differing tags.'
	).date;
}

/**
 * Clicking a badge only writes `runData` while `runs.autoApplyBadgeFilters` is
 * on. It is on by default and lives in localStorage, which Playwright seeds per
 * context from a snapshot — but the scenarios below are about the filter, not
 * about the preference, so they pin it rather than inherit it.
 */
async function withBadgeFiltersApplied(page: Page): Promise<void> {
	await page.addInitScript(() => {
		window.localStorage.setItem(
			'user-preferences',
			JSON.stringify({ runs: { autoApplyBadgeFilters: true } })
		);
	});
}

/**
 * Opens the fixture date and picks a badge some of its runs carry and some do
 * not, preferring important tags — the column the fixture plan varies most.
 */
async function openWithDiscriminatingBadge(
	page: Page,
	runsPage: RunsPage
): Promise<DiscriminatingBadge> {
	await withBadgeFiltersApplied(page);
	await runsPage.gotoForDate(badgeDate());
	await runsPage.expectTableLoaded();

	const columns: RunsBadgeColumn[] = ['important_tags', 'Metadata', 'Tags'];
	let lastError: unknown;

	for (const column of columns) {
		try {
			return await runsPage.pickDiscriminatingBadge(column);
		} catch (error) {
			lastError = error;
		}
	}

	throw lastError;
}

test.describe('Runs Page', () => {
	// Assertions are encapsulated by RunsPage.
	// eslint-disable-next-line playwright/expect-expect
	test(
		'Runs table lists a run matching a tag expression',
		{ tag: ['@smoke'] },
		async ({ page }) => {
			const runsPage = new RunsPage(page);
			const { bundle } = representativeRun(requireManifest());

			await given('the fixture manifest describes an imported run', () =>
				expect(importedRunId(bundle)).toBeGreaterThan(0)
			);
			await when(
				"I open the runs page filtered by that run's fixture tag",
				() => runsPage.gotoWithTagExpr(fixtureTagExpr(bundle))
			);
			await then('the runs table lists that run', async () => {
				await runsPage.expectTableLoaded();
				await runsPage.expectRowVisible(importedRunId(bundle));
			});
		}
	);

	test('The Run link opens the run details page', async ({ page }) => {
		const runsPage = new RunsPage(page);
		const { bundle } = representativeRun(requireManifest());
		const runId = importedRunId(bundle);

		await given('the runs table lists a run', async () => {
			await runsPage.gotoWithTagExpr(fixtureTagExpr(bundle));
			await runsPage.expectRowVisible(runId);
		});
		await when("I follow the row's Run link", () => runsPage.openRun(runId));
		await then('the run details page is open', () =>
			expect(page.getByTestId('run-table')).toBeVisible({ timeout: 30_000 })
		);
	});

	// Assertions are encapsulated by RunsPage.openLog.
	// eslint-disable-next-line playwright/expect-expect
	test('The Log link opens the log page', async ({ page }) => {
		const runsPage = new RunsPage(page);
		const { bundle } = representativeRun(requireManifest());

		await given('the runs table lists a run', async () => {
			await runsPage.gotoWithTagExpr(fixtureTagExpr(bundle));
			await runsPage.expectTableLoaded();
		});
		await when("I follow the row's Log link", () =>
			runsPage.openLog(importedRunId(bundle))
		);
		await then('the log page for that run is open', () =>
			expect(page).toHaveURL(new RegExp(`/log/${importedRunId(bundle)}`))
		);
	});

	// Sorting is client-side over the current page. With a single fixture run the
	// order cannot change, so this guards that toggling the sort does not break
	// the table and keeps the run visible.
	// eslint-disable-next-line playwright/expect-expect
	test('Sorting by statistic summary keeps the run listed', async ({
		page
	}) => {
		const runsPage = new RunsPage(page);
		const { bundle } = representativeRun(requireManifest());

		await given('the runs table lists a run', async () => {
			await runsPage.gotoWithTagExpr(fixtureTagExpr(bundle));
			await runsPage.expectTableLoaded();
		});
		await when('I sort the table by statistic summary', () =>
			runsPage.sortBySummary()
		);
		await then('the table is still healthy and the run is listed', async () => {
			await runsPage.expectTableLoaded();
			await runsPage.expectRowVisible(importedRunId(bundle));
		});
	});

	// Assertions are encapsulated by RunsPage.
	// eslint-disable-next-line playwright/expect-expect
	test(
		'The NOK summary badge reports the unexpected result count',
		{ tag: ['@needs-nok'] },
		async ({ page }) => {
			const runsPage = new RunsPage(page);
			const representative = requireCapability(
				representativeNokRun(requireManifest()),
				'Fixture manifest contains no NOK samples.'
			);
			const runId = importedRunId(representative.bundle);
			const nokCount = expectedNokCount(representative.expectedRun);

			await given(
				'the fixture manifest describes a run with unexpected results',
				() => expect(nokCount).toBeGreaterThan(0)
			);
			await when(
				"I open the runs page filtered by that run's fixture tag",
				() => runsPage.gotoWithTagExpr(fixtureTagExpr(representative.bundle))
			);
			await then(
				"the row's NOK badge shows the unexpected result count from the manifest",
				() => runsPage.expectNokCount(runId, nokCount)
			);
		}
	);

	test(
		'Clicking the NOK badge opens the run with unexpected rows previewed',
		{ tag: ['@needs-nok'] },
		async ({ page }) => {
			const runsPage = new RunsPage(page);
			const runPage = new RunPage(page);
			const representative = requireCapability(
				representativeNokRun(requireManifest()),
				'Fixture manifest contains no NOK samples.'
			);
			const runId = importedRunId(representative.bundle);

			await given(
				'the fixture manifest describes a run with unexpected results',
				() => expect(representative.sampleNames.length).toBeGreaterThan(0)
			);
			await when(
				"I open the runs page filtered by that run's fixture tag",
				() => runsPage.gotoWithTagExpr(fixtureTagExpr(representative.bundle))
			);
			await and("I click the row's NOK badge", () => runsPage.openNok(runId));
			await then('the run page for that run is open', () =>
				runPage.expectLoaded(representative.expectedRun.name)
			);
			await and(
				'the tests with unexpected results are listed on the run page',
				async () => {
					for (const sampleName of representative.sampleNames) {
						await expect(page.getByText(sampleName).first()).toBeVisible({
							timeout: 15_000
						});
					}
				}
			);
		}
	);

	test('Applying a tag expression writes it to the URL', async ({ page }) => {
		const runsPage = new RunsPage(page);
		const { expectedRun } = representativeRun(requireManifest());

		await given(
			'I open the runs page for a date covered by the fixtures',
			async () => {
				await runsPage.gotoForDate(expectedRun.dashboardDate);
				await runsPage.expectReady();
			}
		);
		await when('I type a tag expression and submit the form', async () => {
			await runsPage.fillTagExpr('linux');
			await runsPage.submit();
		});
		await then('the tag expression is recorded in the URL', () =>
			expect(page).toHaveURL(/[?&]tagExpr=linux(?:&|$)/, { timeout: 15_000 })
		);
	});

	test('Resetting the form clears the filters from the URL', async ({
		page
	}) => {
		const runsPage = new RunsPage(page);
		const { expectedRun } = representativeRun(requireManifest());
		const date = expectedRun.dashboardDate;

		await given(
			'I open the runs page with a date range and a tag expression',
			async () => {
				const params = new URLSearchParams({
					startDate: date,
					finishDate: date,
					calendarMode: 'default',
					tagExpr: 'linux'
				});
				await page.goto(`runs?${params.toString()}`);
				await expect(page).toHaveURL(/tagExpr=linux/);
			}
		);
		await when('I reset the form', () => runsPage.resetForm());
		await then('the URL no longer carries the filters', async () => {
			await expect(page).not.toHaveURL(/tagExpr=/, { timeout: 15_000 });
			await expect(page).not.toHaveURL(/startDate=/);
			await expect(page).not.toHaveURL(/finishDate=/);
		});
	});

	// Assertions are encapsulated by RunsPage.
	// eslint-disable-next-line playwright/expect-expect
	test('A tag expression that matches nothing shows the empty state', async ({
		page
	}) => {
		const runsPage = new RunsPage(page);

		await when(
			'I open the runs page filtered by a tag that no run carries',
			() => runsPage.gotoWithTagExpr('fixture_id=no-such-fixture-run')
		);
		await then('the runs page shows the "No runs found" empty state', () =>
			runsPage.expectEmptyState()
		);
	});

	test('Selecting two runs offers comparison and multi-run views', async ({
		page
	}) => {
		const runsPage = new RunsPage(page);
		const pair = requireCapability(
			runPairOnSameDate(requireManifest()),
			'Fixture manifest contains no two imported runs sharing a date.'
		);
		const runIds = pair.bundles.map(importedRunId) as [number, number];

		await given('the fixture manifest describes two imported runs', () =>
			expect(new Set(runIds).size).toBe(2)
		);
		await when('I open the runs page covering both runs', async () => {
			await runsPage.gotoForDate(pair.date);
			await runsPage.expectTableLoaded();
		});
		await and('I select both rows', async () => {
			for (const runId of runIds) {
				await runsPage.expectRowVisible(runId);
				await runsPage.selectRow(runId);
			}
		});
		await then('the selection popover reports two selected runs', () =>
			runsPage.expectSelectedCount(2)
		);
		await and('it offers to open them in the multiple-runs view', () =>
			runsPage.expectMultipleOffered(runIds)
		);
		await and('it offers to compare them', () =>
			runsPage.expectCompareOffered(runIds)
		);
	});

	test(
		'Clicking a run tag badge filters the runs table and records it in the URL',
		{ tag: ['@runs', '@url-params'] },
		async ({ page }) => {
			const runsPage = new RunsPage(page);
			let badge: DiscriminatingBadge;

			await given(
				'the runs table lists the runs imported on a fixture date',
				async () => {
					badge = await openWithDiscriminatingBadge(page, runsPage);
					expect(badge.withoutIt.length).toBeGreaterThan(0);
				}
			);
			await when('I click a tag badge that only some of those runs carry', () =>
				runsPage.clickBadge(badge.withIt[0], badge.column, badge.text)
			);
			await then('that tag is recorded in the URL as run data', () =>
				runsPage.expectRunDataContains(badge.payload)
			);
			await and('the URL is back on the first page', () =>
				runsPage.expectOnFirstPage()
			);
			await and('only the runs carrying that tag are listed', () =>
				runsPage.expectOnlyRunsListed(badge.withIt)
			);
			await and('the badge is shown as selected', () =>
				runsPage.expectBadgeSelected(badge.withIt[0], badge.column, badge.text)
			);
		}
	);

	// Assertions are encapsulated by the page object.
	// eslint-disable-next-line playwright/expect-expect
	test(
		'Clicking the same run tag badge again clears the run data filter',
		{ tag: ['@runs', '@url-params'] },
		async ({ page }) => {
			const runsPage = new RunsPage(page);
			let badge: DiscriminatingBadge;

			await given('the runs table is filtered by a tag badge', async () => {
				badge = await openWithDiscriminatingBadge(page, runsPage);
				await runsPage.clickBadge(badge.withIt[0], badge.column, badge.text);
				await runsPage.expectRunDataContains(badge.payload);
				await runsPage.expectOnlyRunsListed(badge.withIt);
			});
			await when('I click that badge again', () =>
				runsPage.clickBadge(badge.withIt[0], badge.column, badge.text)
			);
			await then('the run data is dropped from the URL', () =>
				runsPage.expectNoRunData()
			);
			await and('the runs the badge had filtered out are listed again', () =>
				runsPage.expectRunsListed(badge.withoutIt)
			);
		}
	);

	// Assertions are encapsulated by the page object.
	// eslint-disable-next-line playwright/expect-expect
	test(
		'Clicking two badges of the same run combines both into the run data filter',
		{ tag: ['@runs', '@url-params'] },
		async ({ page }) => {
			const runsPage = new RunsPage(page);
			let runId = 0;
			let importantBadge: DiscriminatingBadge;
			let metadataBadge: DiscriminatingBadge;

			await given(
				'the runs table lists the runs imported on a fixture date',
				async () => {
					await withBadgeFiltersApplied(page);
					await runsPage.gotoForDate(badgeDate());
					await runsPage.expectTableLoaded();

					importantBadge = await runsPage.pickDiscriminatingBadge(
						'important_tags'
					);
					metadataBadge = await runsPage.pickDiscriminatingBadge('Metadata');
					// Both badges have to be on one row, or the AND empties the table.
					runId = requireCapability(
						importantBadge.withIt.find((id) =>
							metadataBadge.withIt.includes(id)
						),
						'No listed run carries both a discriminating important tag and a discriminating metadata value.'
					);
				}
			);
			await when('I click an important tag badge of a run', async () => {
				await runsPage.clickBadge(runId, 'important_tags', importantBadge.text);
				await runsPage.expectRunDataContains(importantBadge.payload);
			});
			await and('I click a metadata badge of the same run', () =>
				runsPage.clickBadge(runId, 'Metadata', metadataBadge.text)
			);
			await then('both values are recorded in the URL as run data', () =>
				runsPage.expectRunDataContains(
					importantBadge.payload,
					metadataBadge.payload
				)
			);
			await and('that run is still listed', () =>
				runsPage.expectRunsListed([runId])
			);
		}
	);

	// Assertions are encapsulated by the page object.
	// eslint-disable-next-line playwright/expect-expect
	test(
		'A run data filter in the link is reflected in the Metas field',
		{ tag: ['@runs', '@url-params'] },
		async ({ page }) => {
			const runsPage = new RunsPage(page);
			let badge: DiscriminatingBadge;
			const date = badgeDate();

			await given(
				'a link that pins a run data value the fixture runs carry',
				async () => {
					badge = await openWithDiscriminatingBadge(page, runsPage);
				}
			);
			await when('I open that link', async () => {
				const params = new URLSearchParams({
					startDate: date,
					finishDate: date,
					calendarMode: 'default',
					mode: 'table',
					runData: badge.payload
				});
				await page.goto(`runs?${params.toString()}`);
				await runsPage.expectTableLoaded();
			});
			await then('the Metas field reports that value as selected', () =>
				runsPage.expectMetaSelected(badge.text)
			);
			await and('only the runs carrying it are listed', () =>
				runsPage.expectOnlyRunsListed(badge.withIt)
			);
		}
	);

	// Assertions are encapsulated by the page object.
	// eslint-disable-next-line playwright/expect-expect
	test(
		'Selecting a meta in the Metas field filters the runs table on submit',
		{ tag: ['@runs', '@url-params'] },
		async ({ page }) => {
			const runsPage = new RunsPage(page);
			let badge: DiscriminatingBadge;

			await given(
				'the runs table lists the runs imported on a fixture date',
				async () => {
					badge = await openWithDiscriminatingBadge(page, runsPage);
				}
			);
			await when(
				'I select a meta in the Metas field and submit the form',
				async () => {
					await runsPage.selectMeta(badge.payload, badge.text);
					await runsPage.submit();
				}
			);
			await then('that meta is recorded in the URL as run data', () =>
				runsPage.expectRunDataContains(badge.payload)
			);
			await and('only the runs carrying it are listed', () =>
				runsPage.expectOnlyRunsListed(badge.withIt)
			);
		}
	);

	// Assertions are encapsulated by the page object.
	// eslint-disable-next-line playwright/expect-expect
	test(
		'Resetting the form clears the run data applied by a badge',
		{ tag: ['@runs'] },
		async ({ page }) => {
			const runsPage = new RunsPage(page);
			let badge: DiscriminatingBadge;

			await given('the runs table is filtered by a tag badge', async () => {
				badge = await openWithDiscriminatingBadge(page, runsPage);
				await runsPage.clickBadge(badge.withIt[0], badge.column, badge.text);
				await runsPage.expectRunDataContains(badge.payload);
			});
			await when('I reset the form', () => runsPage.resetForm());
			await then('the run data is dropped from the URL', () =>
				runsPage.expectNoRunData()
			);
			await and('the runs the badge had filtered out are listed again', () =>
				runsPage.expectRunsListed(badge.withoutIt)
			);
		}
	);

	test(
		'Submitting a tag expression keeps the run data applied by a badge',
		{ tag: ['@runs', '@url-params'] },
		async ({ page }) => {
			const runsPage = new RunsPage(page);
			let badge: DiscriminatingBadge;

			await given('the runs table is filtered by a tag badge', async () => {
				badge = await openWithDiscriminatingBadge(page, runsPage);
				await runsPage.clickBadge(badge.withIt[0], badge.column, badge.text);
				await runsPage.expectRunDataContains(badge.payload);
			});
			await when('I type a tag expression and submit the form', async () => {
				await runsPage.fillTagExpr('linux');
				await runsPage.submit();
			});
			await then(
				'the URL carries both the tag expression and the run data',
				async () => {
					await expect(page).toHaveURL(/[?&]tagExpr=linux(?:&|$)/, {
						timeout: 15_000
					});
					await runsPage.expectRunDataContains(badge.payload);
				}
			);
		}
	);

	// Both modes aggregate over every run the current filter allows, which on a
	// seeded instance takes noticeably longer than the table view.
	test.describe('The runs page renders every view mode', () => {
		test.slow();

		// Assertions are encapsulated by RunsPage.
		// eslint-disable-next-line playwright/expect-expect
		test('charts', async ({ page }) => {
			const runsPage = new RunsPage(page);

			await when('I open the runs page in the given mode', () =>
				runsPage.gotoWithMode('charts')
			);
			await then("the mode's own section is rendered", () =>
				runsPage.expectModeSection('charts')
			);
		});

		// Assertions are encapsulated by RunsPage.
		// eslint-disable-next-line playwright/expect-expect
		test('progress', async ({ page }) => {
			const runsPage = new RunsPage(page);

			await when('I open the runs page in the given mode', () =>
				runsPage.gotoWithMode('progress')
			);
			await then("the mode's own section is rendered", () =>
				runsPage.expectModeSection('progress')
			);
		});
	});
});
