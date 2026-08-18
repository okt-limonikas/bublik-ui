/* SPDX-License-Identifier: Apache-2.0 */
/* SPDX-FileCopyrightText: 2024-2026 OKTET LTD */
/* Implements apps/bublik/e2e/features/run-details.feature */
import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

import { DashboardPage } from './pages/dashboard-page';
import { LogPage } from './pages/log-page';
import { RunPage } from './pages/run-page';
import { RunsPage } from './pages/runs-page';
import { HistoryPage } from './pages/history-page';
import {
	importedRunId,
	reportConfiguredImportedRun,
	representativeImportedRun
} from './support/e2e-data';
import { and, given, then, when } from './support/gherkin';
import { requireCapability } from './support/capabilities';
import { requireManifest } from './support/manifest';
import { mutableRun, representativeNokRun } from './support/sample-cases';

function nokRun() {
	const representative = requireCapability(
		representativeNokRun(requireManifest()),
		'Fixture manifest contains no NOK samples.'
	);

	return { ...representative, runId: importedRunId(representative.bundle) };
}

/** A healthy run that no other spec asserts on, so the scenarios below may mark
 *  it compromised or comment on it as long as they put it back. */
function scratchRun() {
	const scratch = requireCapability(
		mutableRun(requireManifest()),
		'Fixture manifest contains no healthy run that is safe to mutate.'
	);

	return { ...scratch, runId: importedRunId(scratch.bundle) };
}

/** The history verdict variant only produces a `verdict` param when the result
 *  it starts from actually carries one, so the case is pinned to an
 *  unexpected-failed sample with verdicts rather than to whichever test row the
 *  tree happens to reach first. */
function nokVerdictCase() {
	const manifest = requireManifest();

	for (const bundle of manifest.bundles) {
		if (!bundle.runId) continue;

		for (const expectedRun of bundle.expectedRuns) {
			const sample = (expectedRun.sampleTests.unexpectedFailed ?? []).find(
				(entry) => entry.verdicts.length > 0
			);

			if (sample) {
				return {
					bundle,
					expectedRun,
					runId: importedRunId(bundle),
					testName: sample.name || sample.pathStr
				};
			}
		}
	}

	return null;
}

function historyParams(url: string): URLSearchParams {
	return new URL(url).searchParams;
}

test.describe('Run Details Page', () => {
	// Assertions are encapsulated by RunPage.
	// eslint-disable-next-line playwright/expect-expect
	test(
		'Run details show the metadata recorded in the manifest',
		{ tag: ['@smoke'] },
		async ({ page }) => {
			const runPage = new RunPage(page);
			const { expectedRun, runId } = representativeImportedRun(
				requireManifest()
			);

			await given('the fixture manifest describes an imported run', () =>
				expect(runId).toBeGreaterThan(0)
			);
			await when("I open that run's page", async () => {
				await runPage.goto(runId);
				await runPage.expectLoaded(expectedRun.name);
			});
			await then('the info card shows the run id', () =>
				runPage.expectDetail('Run ID', String(runId))
			);
			await and('the info card shows the conclusion', () =>
				runPage.expectDetail('Conclusion')
			);
		}
	);

	// Assertions are encapsulated by RunPage.
	// eslint-disable-next-line playwright/expect-expect
	test('Exposing the run info reveals the full detail set', async ({
		page
	}) => {
		const runPage = new RunPage(page);
		const { expectedRun, runId } = representativeImportedRun(requireManifest());

		await given("I open an imported run's page", async () => {
			await runPage.goto(runId);
			await runPage.expectLoaded(expectedRun.name);
		});
		await when('I expose the full run info', () => runPage.toggleFullMode());
		await then(
			'the info card also shows the run status and duration',
			async () => {
				await runPage.expectDetail('Status');
				await runPage.expectDetail('Duration');
			}
		);
	});

	test('Expanding a package reveals the tests it contains', async ({
		page
	}) => {
		const runPage = new RunPage(page);
		const { expectedRun, runId } = representativeImportedRun(requireManifest());
		let rowsBefore = 0;

		await given("I open an imported run's page", async () => {
			await runPage.goto(runId);
			await runPage.expectLoaded(expectedRun.name);
			rowsBefore = await runPage.rows().count();
		});
		await when('I expand the first collapsed package of the tree', async () => {
			const collapsed = runPage.packageRows({ expanded: false }).first();
			await expect(collapsed).toBeVisible({ timeout: 30_000 });
			await runPage.toggleTreeNode(collapsed);
		});
		await then('more rows are shown than before', () =>
			runPage.expectRowCountAbove(rowsBefore)
		);
	});

	// Assertions are encapsulated by RunPage.
	// eslint-disable-next-line playwright/expect-expect
	test(
		'Open NOK expands the result tables of the unexpected results',
		{ tag: ['@needs-nok'] },
		async ({ page }) => {
			const runPage = new RunPage(page);
			const { expectedRun, runId } = nokRun();

			await given('I open a run that has unexpected results', async () => {
				await runPage.goto(runId);
				await runPage.expectLoaded(expectedRun.name);
			});
			await when('I press Open NOK', () => runPage.openNok());
			await then('at least one result table is expanded', () =>
				runPage.expectResultTableVisible()
			);
			await when('I press Reset', () => runPage.resetTable());
			await then('no result table is expanded', () =>
				runPage.expectNoResultTable()
			);
		}
	);

	test(
		'Preview NOK expands the tree without opening result tables',
		{ tag: ['@needs-nok'] },
		async ({ page }) => {
			const runPage = new RunPage(page);
			const { expectedRun, runId, sampleNames } = nokRun();

			await given('I open a run that has unexpected results', async () => {
				await runPage.goto(runId);
				await runPage.expectLoaded(expectedRun.name);
			});
			await when('I press Preview NOK', () => runPage.previewNok());
			await then('the tests with unexpected results are listed', async () => {
				for (const sampleName of sampleNames) {
					await expect(page.getByText(sampleName).first()).toBeVisible({
						timeout: 15_000
					});
				}
			});
			await and('no result table is expanded', () =>
				runPage.expectNoResultTable()
			);
		}
	);

	test("Clicking a count badge opens that test's result table", async ({
		page
	}) => {
		const runPage = new RunPage(page);
		const { expectedRun, runId } = representativeImportedRun(requireManifest());
		let testName = '';

		let testRow = page.locator('never');

		await given(
			"I open an imported run's page and expand the tree down to a test",
			async () => {
				await runPage.goto(runId);
				await runPage.expectLoaded(expectedRun.name);
				testRow = await runPage.expandUntilTestRow();
				testName = (await testRow.getAttribute('data-test-name')) ?? '';
			}
		);
		await when('I click the total count badge of that test row', () =>
			runPage.firstCountBadge(testRow).click()
		);
		await then("that test's result table is expanded", () =>
			expect(runPage.resultTable(testName)).toBeVisible({ timeout: 30_000 })
		);
	});

	test('The run header opens the log of the whole run', async ({ page }) => {
		const runPage = new RunPage(page);
		const logPage = new LogPage(page);
		const { expectedRun, runId } = representativeImportedRun(requireManifest());

		await given("I open an imported run's page", async () => {
			await runPage.goto(runId);
			await runPage.expectLoaded(expectedRun.name);
		});
		await when("I follow the header's Log link", () =>
			page.getByRole('banner').getByRole('link', { name: /^Log$/ }).click()
		);
		await then('the log page for that run is open', async () => {
			await expect(page).toHaveURL(new RegExp(`/log/${runId}`));
			await logPage.expectLoaded();
		});
	});

	test('A result row links to the log of that result', async ({ page }) => {
		const runPage = new RunPage(page);
		const { expectedRun, runId } = representativeImportedRun(requireManifest());

		await given(
			"I open an imported run's page with a result table expanded",
			async () => {
				await runPage.goto(runId);
				await runPage.expectLoaded(expectedRun.name);

				const testRow = await runPage.expandUntilTestRow();
				await runPage.firstCountBadge(testRow).click();
				await runPage.expectResultTableVisible();
			}
		);
		await when("I follow the result's Log link", () =>
			runPage
				.resultTables()
				.first()
				.getByRole('link', { name: 'Log', exact: true })
				.first()
				.click()
		);
		await then('the log page opens focused on that result', () =>
			expect(page).toHaveURL(new RegExp(`/log/${runId}.*focusId=\\d+`), {
				timeout: 15_000
			})
		);
	});

	test('The compare form rejects a value that is not a run', async ({
		page
	}) => {
		const runPage = new RunPage(page);
		const { expectedRun, runId } = representativeImportedRun(requireManifest());

		await given("I open an imported run's page", async () => {
			await runPage.goto(runId);
			await runPage.expectLoaded(expectedRun.name);
		});
		await when(
			'I open the compare form and submit an invalid run reference',
			async () => {
				const form = await runPage.openCompareForm();
				await form.getByLabel('Right Run').fill('not-a-run');
				await form.getByRole('button', { name: 'Compare' }).click();
			}
		);
		await then(
			'the form reports that the value is not a valid URL or run id',
			() =>
				expect(page.getByText(/Must be a valid URL/).first()).toBeVisible({
					timeout: 15_000
				})
		);
	});

	// Assertions are encapsulated by RunPage.
	// eslint-disable-next-line playwright/expect-expect
	test(
		'A run comment can be added and then removed',
		{ tag: ['@run', '@comments'] },
		async ({ page }) => {
			const runPage = new RunPage(page);
			const { expectedRun, runId } = scratchRun();
			const comment = 'e2e run comment';

			await given("I open an imported run's page with no comment", async () => {
				await runPage.goto(runId);
				await runPage.expectLoaded(expectedRun.name);
				await runPage.expectNoComment();
			});
			await when('I add a comment to the run', async () => {
				await runPage.openCommentEditor();
				await runPage.submitComment(comment);
			});
			await then('the info card shows that comment', () =>
				runPage.expectComment(comment)
			);
			await when('I remove the run comment', async () => {
				await runPage.openCommentEditor();
				await runPage.submitComment('');
			});
			await then('the info card shows no comment', () =>
				runPage.expectNoComment()
			);
		}
	);

	// Assertions are encapsulated by RunPage.
	// eslint-disable-next-line playwright/expect-expect
	test(
		'A note can be added to a test node and then removed',
		{ tag: ['@run', '@comments'] },
		async ({ page }) => {
			const runPage = new RunPage(page);
			const { expectedRun, runId } = scratchRun();
			const note = 'e2e test node note';
			let testRow = page.locator('never');

			await given(
				"I open an imported run's page with the Notes column shown",
				async () => {
					await runPage.goto(runId);
					await runPage.expectLoaded(expectedRun.name);
					await runPage.showColumn('Notes');
					testRow = await runPage.expandUntilTestRow();
				}
			);
			await when('I add a note to a test node', () =>
				runPage.addNote(testRow, note)
			);
			await then('that test node shows the note', () =>
				runPage.expectNote(testRow, note)
			);
			await when('I delete the note', () => runPage.deleteNote(testRow));
			await then('that test node has no note', () =>
				runPage.expectNoNote(testRow)
			);
		}
	);

	// Assertions are encapsulated by RunPage and the runs/dashboard page objects.
	// eslint-disable-next-line playwright/expect-expect
	test(
		'Marking a run as compromised marks it on the run, runs and dashboard pages',
		{ tag: ['@run', '@runs', '@dashboard', '@compromised'] },
		async ({ page }) => {
			const runPage = new RunPage(page);
			const runsPage = new RunsPage(page);
			const dashboard = new DashboardPage(page);
			const { bundle, expectedRun, runId } = scratchRun();

			await given('I open a run that is not compromised', async () => {
				await runPage.goto(runId);
				await runPage.expectLoaded(expectedRun.name);
				await runPage.expectNotCompromised();
			});
			await when('I mark the run as compromised', () =>
				runPage.markCompromised({ comment: 'e2e compromise', bugId: '42' })
			);
			await then('the run page reports the run as compromised', () =>
				runPage.expectCompromised()
			);
			await and("the run's conclusion is compromised", () =>
				runPage.expectDetail('Conclusion', 'compromised')
			);

			await when('I open the runs page filtered to that run', async () => {
				await runsPage.gotoWithTagExpr(`fixture_id=${bundle.e2eRunId}`);
				await runsPage.expectRowVisible(runId);
			});
			await then('the runs row reports the run as compromised', () =>
				runsPage.expectRowConclusion(runId, 'compromised')
			);

			await when("I open the dashboard for that run's date", async () => {
				await dashboard.goto(expectedRun.dashboardDate, { mode: 'rows' });
				await dashboard.expectRunIdVisible(runId);
			});
			await then('the dashboard row reports the run as compromised', () =>
				dashboard.expectRowConclusion(runId, 'compromised')
			);

			await when('I remove the compromised status from the run', async () => {
				await runPage.goto(runId);
				await runPage.expectLoaded(expectedRun.name);
				await runPage.removeCompromised();
			});
			await then('the run page no longer reports the run as compromised', () =>
				runPage.expectNotCompromised()
			);
		}
	);

	test(
		'The compromise form requires a comment',
		{ tag: ['@run', '@compromised'] },
		async ({ page }) => {
			const runPage = new RunPage(page);
			const { expectedRun, runId } = scratchRun();

			await given('I open a run that is not compromised', async () => {
				await runPage.goto(runId);
				await runPage.expectLoaded(expectedRun.name);
				await runPage.expectNotCompromised();
			});
			await when('I submit the compromise form without a comment', async () => {
				const form = await runPage.openCompromiseForm();
				await form.getByLabel('Bug ID').fill('42');
				await form.getByRole('button', { name: 'Submit' }).click();
			});
			await then('the form reports that a comment is required', () =>
				expect(page.getByText('Comment is required').first()).toBeVisible({
					timeout: 15_000
				})
			);
		}
	);

	test(
		'The History link opens the history for the test path, parameters and important tags',
		{ tag: ['@run', '@history'] },
		async ({ page }) => {
			const runPage = new RunPage(page);
			const { expectedRun, runId } = representativeImportedRun(
				requireManifest()
			);
			let testName = '';

			await given(
				"I open an imported run's page with a result table expanded",
				async () => {
					await runPage.goto(runId);
					await runPage.expectLoaded(expectedRun.name);

					const testRow = await runPage.expandUntilTestRow();
					testName = (await testRow.getAttribute('data-test-name')) ?? '';
					await runPage.firstCountBadge(testRow).click();
					await runPage.expectResultTableVisible();
				}
			);
			await when("I follow the result's History link", async () => {
				await runPage.historyLink(testName).first().click();
				await expect(page).toHaveURL(/\/history/, { timeout: 15_000 });
			});
			await then('the history page opens filtered by that test path', () =>
				expect(historyParams(page.url()).get('testName')).toContain(testName)
			);
			await and(
				"the history query carries the result parameters and the run's important tags",
				() => {
					const params = historyParams(page.url());
					expect(params.get('parameters')).toBeTruthy();
					expect(params.get('runData')).toBeTruthy();
				}
			);
		}
	);

	// The direct variants differ only in which narrowing params they add. The
	// feature checker can only trace static test titles, so each Examples row is
	// spelled out and shares one runner.
	test.describe('The result history menu filters the history by the chosen variant', () => {
		async function expectVariantParams(
			page: Page,
			variant: string,
			expectation: { present: string[]; absent: string[] }
		): Promise<void> {
			const runPage = new RunPage(page);
			const { expectedRun, runId, testName } = requireCapability(
				nokVerdictCase(),
				'Fixture manifest contains no unexpected failure carrying a verdict.'
			);

			await given(
				'I open a run with unexpected results and a result table expanded',
				async () => {
					await runPage.goto(runId);
					await runPage.expectLoaded(expectedRun.name);
					await runPage.previewNok();

					const testRow = runPage.testNodeRow(testName).first();
					await expect(testRow).toBeVisible({ timeout: 30_000 });
					await runPage.countBadge(testRow, 'FAILED_UNEXPECTED').click();
					await runPage.expectResultTableVisible();
				}
			);
			await when(
				'I choose the given variant from the result history menu',
				async () => {
					await runPage.openResultHistoryMenu(testName);
					await runPage.chooseHistoryLink(variant, 'direct');
					await expect(page).toHaveURL(/\/history/, { timeout: 15_000 });
				}
			);
			await then(
				'the history query carries the parameters of that variant',
				() => {
					const params = historyParams(page.url());

					expect(params.get('testName')).toContain(testName);
					for (const name of expectation.present) {
						expect(params.get(name)).toBeTruthy();
					}
					for (const name of expectation.absent) {
						expect(params.get(name)).toBeFalsy();
					}
				}
			);
		}

		// eslint-disable-next-line playwright/expect-expect
		test('Path only', { tag: ['@run', '@history', '@needs-nok'] }, ({ page }) =>
			expectVariantParams(page, 'Test Path', {
				present: [],
				absent: ['parameters', 'verdict', 'runData']
			})
		);

		// eslint-disable-next-line playwright/expect-expect
		test(
			'Path and verdicts',
			{ tag: ['@run', '@history', '@needs-nok'] },
			({ page }) =>
				expectVariantParams(page, 'Test Path + Verdicts', {
					present: ['verdict'],
					absent: ['parameters']
				})
		);

		// eslint-disable-next-line playwright/expect-expect
		test(
			'Path and parameters',
			{ tag: ['@run', '@history', '@needs-nok'] },
			({ page }) =>
				expectVariantParams(page, 'Test Path + Parameters', {
					present: ['parameters'],
					absent: ['verdict']
				})
		);

		// eslint-disable-next-line playwright/expect-expect
		test(
			'Path, parameters and all tags',
			{ tag: ['@run', '@history', '@needs-nok'] },
			({ page }) =>
				expectVariantParams(page, 'Test Path + Parameters + All Tags', {
					present: ['parameters', 'runData'],
					absent: ['verdict']
				})
		);
	});

	test(
		'A prefilled history link opens the global search form with the query prefilled',
		{ tag: ['@run', '@history'] },
		async ({ page }) => {
			const runPage = new RunPage(page);
			const historyPage = new HistoryPage(page);
			const { expectedRun, runId } = representativeImportedRun(
				requireManifest()
			);
			let testName = '';

			await given(
				"I open an imported run's page with a result table expanded",
				async () => {
					await runPage.goto(runId);
					await runPage.expectLoaded(expectedRun.name);

					const testRow = await runPage.expandUntilTestRow();
					testName = (await testRow.getAttribute('data-test-name')) ?? '';
					await runPage.firstCountBadge(testRow).click();
					await runPage.expectResultTableVisible();
				}
			);
			await when(
				'I choose a prefilled variant from the result history menu',
				async () => {
					await runPage.openResultHistoryMenu(testName);
					await runPage.chooseHistoryLink('Test Path + Verdicts', 'prefilled');
					await expect(page).toHaveURL(/fromRun=true/, { timeout: 15_000 });
				}
			);
			await then(
				'the global search form opens with that test path prefilled',
				async () => {
					await historyPage.globalSearchForm.expectVisible();
					await expect(historyPage.globalSearchForm.testPathInput).toHaveValue(
						new RegExp(testName),
						{ timeout: 15_000 }
					);
				}
			);
		}
	);

	test(
		'The test node history link opens the history scoped to that run',
		{ tag: ['@run', '@history'] },
		async ({ page }) => {
			const runPage = new RunPage(page);
			const { expectedRun, runId } = representativeImportedRun(
				requireManifest()
			);
			let testName = '';
			let testRow = page.locator('never');

			await given(
				"I open an imported run's page and expand the tree down to a test node",
				async () => {
					await runPage.goto(runId);
					await runPage.expectLoaded(expectedRun.name);
					testRow = await runPage.expandUntilTestRow();
					testName = (await testRow.getAttribute('data-test-name')) ?? '';
				}
			);
			await when('I open the history view of that test node', async () => {
				await runPage.openTestNodeHistory(testRow);
				await expect(page).toHaveURL(/\/history/, { timeout: 15_000 });
			});
			await then(
				'the history query is scoped to that run and test path',
				() => {
					const params = historyParams(page.url());

					expect(params.get('runIds')).toBe(String(runId));
					expect(params.get('testName')).toContain(testName);
				}
			);
		}
	);

	test(
		'The reports menu lists the configured report',
		{ tag: ['@needs-report'] },
		async ({ page }) => {
			const runPage = new RunPage(page);
			const manifest = requireManifest();
			const { expectedRun, runId } = reportConfiguredImportedRun(manifest);
			const configName = requireCapability(
				manifest.configs.find((config) => config.type === 'report')?.name,
				'Fixture manifest contains no report config.'
			);

			await given(
				'I open a run whose project has a report config',
				async () => {
					await runPage.goto(runId);
					await runPage.expectLoaded(expectedRun.name);
				}
			);
			await when('I open the reports menu', () => runPage.openReports());
			await then('the configured report is offered', () =>
				expect(page.getByRole('menuitem', { name: configName })).toBeVisible({
					timeout: 15_000
				})
			);
		}
	);
});
