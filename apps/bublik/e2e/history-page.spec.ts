/* SPDX-License-Identifier: Apache-2.0 */
/* SPDX-FileCopyrightText: 2024-2026 OKTET LTD */
/* Implements apps/bublik/e2e/features/history.feature */
import { expect, test } from '@playwright/test';
import type { APIRequestContext, Page } from '@playwright/test';

import { HistoryPage } from './pages/history-page';
import type { HistoryMode } from './pages/history-page';
import { ProjectPicker } from './pages/project-picker';
import { requireCapability } from './support/capabilities';
import { projectIdByName } from './support/e2e-data';
import { and, given, then, when } from './support/gherkin';
import { requireManifest } from './support/manifest';
import {
	firstHistoryTestPath,
	historyDateRange,
	historyEmptyDate,
	historyMeasurementTestPath,
	historyProjectPair
} from './support/sample-cases';

/*
 * Every scenario of this page carries @history, so the whole suite can be run
 * on its own with `--grep @history`.
 */
const HISTORY = { tag: ['@history'] };
const HISTORY_SMOKE = { tag: ['@history', '@smoke'] };
const HISTORY_MEASUREMENTS = { tag: ['@history', '@needs-measurements'] };

/** Every fixture run, so a query answers with the seeded data. */
function dateRange(): Record<string, string> {
	return historyDateRange(requireManifest());
}

function measurementCase() {
	return requireCapability(
		historyMeasurementTestPath(requireManifest()),
		'Fixture manifest contains no test path with measurements.'
	);
}

/**
 * Resolves after the history API answered for the given test path. The grouped
 * endpoint backs the aggregation mode and takes the same query, so both count.
 */
function waitForHistoryResponse(page: Page, testPath?: string) {
	return page.waitForResponse((response) => {
		const url = new URL(response.url());
		const isHistory =
			url.pathname.endsWith('/api/v2/history/') ||
			url.pathname.endsWith('/api/v2/history/grouped/');

		return (
			isHistory && (!testPath || url.searchParams.get('test_name') === testPath)
		);
	});
}

test.describe('History Page', () => {
	test.setTimeout(60_000);

	/*
	 * Building a query
	 */

	test(
		'Searching by test path queries the history API',
		HISTORY_SMOKE,
		async ({ page }) => {
			const historyPage = new HistoryPage(page);
			const testPath = firstHistoryTestPath();

			await given('the fixture manifest describes a tested path', () =>
				expect(testPath).toBeTruthy()
			);

			const historyResponsePromise = page.waitForResponse((response) => {
				const url = new URL(response.url());

				return (
					url.pathname.endsWith('/api/v2/history/') &&
					url.searchParams.get('test_name') === testPath
				);
			});

			await when('I search the history for that test path', async () => {
				await historyPage.goto();
				await historyPage.expectReady();
				await historyPage.openGlobalSearchForm();
				await historyPage.globalSearchForm.fillTestPath(testPath);
				await historyPage.globalSearchForm.applySearch();
			});
			await then('the history request is sent for that test path', async () => {
				const historyResponse = await historyResponsePromise;
				expect(historyResponse.ok()).toBeTruthy();
			});
			await and('the search form closes', () =>
				historyPage.globalSearchForm.expectHidden()
			);
		}
	);

	test(
		'The applied search is reflected in the URL',
		HISTORY,
		async ({ page }) => {
			const historyPage = new HistoryPage(page);
			const testPath = firstHistoryTestPath();

			await given('I open the history page', async () => {
				await historyPage.goto();
				await historyPage.expectReady();
			});
			await when('I search the history for a test path', async () => {
				await historyPage.openGlobalSearchForm();
				await historyPage.globalSearchForm.fillTestPath(testPath);
				await historyPage.globalSearchForm.applySearch();
			});
			await then('the test path is recorded in the URL', () =>
				expect(page).toHaveURL(
					new RegExp(`testName=${encodeURIComponent(testPath)}`),
					{ timeout: 15_000 }
				)
			);
		}
	);

	test(
		'The verdict lookup type can be switched to regex',
		HISTORY,
		async ({ page }) => {
			const historyPage = new HistoryPage(page);

			await given('I open the global search form', async () => {
				await historyPage.goto();
				await historyPage.expectReady();
				await historyPage.openGlobalSearchForm();
			});
			await when('I switch the verdict lookup to regex', () =>
				historyPage.globalSearchForm.setVerdictLookup('Regex')
			);
			await then('the regex lookup is selected', () =>
				expect(
					historyPage.globalSearchForm.verdictLookupOption('Regex')
				).toHaveAttribute('aria-checked', 'true', { timeout: 15_000 })
			);
		}
	);

	// Assertions are encapsulated by HistoryGlobalSearchForm.
	// eslint-disable-next-line playwright/expect-expect
	test(
		'Disabling the verdict lookup disables the verdict field',
		HISTORY,
		async ({ page }) => {
			const historyPage = new HistoryPage(page);
			const form = historyPage.globalSearchForm;

			await given('I open the global search form', async () => {
				await historyPage.goto();
				await historyPage.expectReady();
				await historyPage.openGlobalSearchForm();
				await form.expectVerdictFieldAcceptsInput();
			});
			await when('I switch the verdict lookup off', () =>
				form.setVerdictLookup('None')
			);
			await then('the verdict field is disabled', () =>
				form.expectVerdictFieldDisabled()
			);
		}
	);

	test(
		'Resetting the search form clears the narrowing fields but keeps the test path',
		HISTORY,
		async ({ page }) => {
			const historyPage = new HistoryPage(page);
			const form = historyPage.globalSearchForm;
			const testPath = firstHistoryTestPath();

			await given(
				'I open the global search form with a test path and a hash entered',
				async () => {
					await historyPage.goto();
					await historyPage.expectReady();
					await historyPage.openGlobalSearchForm();
					await form.fillTestPath(testPath);
					await form.fillHash('3c447d65a665c0eee17a0a20827e9');
					await expect(form.testPathInput).toHaveValue(testPath);
				}
			);
			await when('I reset the form', () => form.reset());
			await then('the hash is cleared', () =>
				expect(form.hashInput).toHaveValue('', { timeout: 15_000 })
			);
			await and('the test path is kept', () =>
				expect(form.testPathInput).toHaveValue(testPath)
			);
		}
	);

	// Assertions are encapsulated by HistoryGlobalSearchForm.
	// eslint-disable-next-line playwright/expect-expect
	test(
		'A search without a test path is rejected',
		HISTORY,
		async ({ page }) => {
			const historyPage = new HistoryPage(page);
			const form = historyPage.globalSearchForm;

			await given('I open the global search form', async () => {
				await historyPage.goto();
				await historyPage.expectReady();
				await historyPage.openGlobalSearchForm();
			});
			await when('I clear the test section', () => form.clearTestSection());
			await and('I apply the search', () => form.applySearch());
			await then('the form reports that the test name is required', () =>
				form.expectError('Test name is required')
			);
			await and('the search form stays open', () => form.expectVisible());
		}
	);

	// Assertions are encapsulated by HistoryGlobalSearchForm.
	// eslint-disable-next-line playwright/expect-expect
	test(
		'A search with no obtained result types is rejected',
		HISTORY,
		async ({ page }) => {
			const historyPage = new HistoryPage(page);
			const form = historyPage.globalSearchForm;
			const testPath = firstHistoryTestPath();

			await given(
				'I open the global search form with a test path entered',
				async () => {
					await historyPage.goto();
					await historyPage.expectReady();
					await historyPage.openGlobalSearchForm();
					await form.fillTestPath(testPath);
				}
			);
			await when('I clear the result section', () => form.clearResultSection());
			await and('I apply the search', () => form.applySearch());
			await then(
				'the form reports that an obtained result type is required',
				() => form.expectError('Select at least one obtained result type')
			);
		}
	);

	test('Ctrl+Enter submits the search form', HISTORY, async ({ page }) => {
		const historyPage = new HistoryPage(page);
		const form = historyPage.globalSearchForm;
		const testPath = firstHistoryTestPath();

		await given(
			'I open the global search form with a test path entered',
			async () => {
				await historyPage.goto();
				await historyPage.expectReady();
				await historyPage.openGlobalSearchForm();
				await form.fillTestPath(testPath);
			}
		);
		await when('I press Ctrl+Enter', () => form.submitWithKeyboard());
		await then('the test path is recorded in the URL', () =>
			expect(page).toHaveURL(
				new RegExp(`testName=${encodeURIComponent(testPath)}`),
				{ timeout: 15_000 }
			)
		);
		await and('the search form closes', () => form.expectHidden());
	});

	test(
		'The applied query is described by the filter legend',
		HISTORY,
		async ({ page }) => {
			const historyPage = new HistoryPage(page);
			const testPath = firstHistoryTestPath();

			await given('the fixture manifest describes a tested path', () =>
				expect(testPath).toBeTruthy()
			);
			await when('I open the history page for that path', async () => {
				await historyPage.gotoWithTestPath(testPath, {
					...dateRange(),
					results: 'PASSED;FAILED'
				});
				await historyPage.expectReady();
			});
			await then('the filter legend names the test path', () =>
				expect(
					historyPage.root.getByText('Test Path:', { exact: true })
				).toBeVisible({ timeout: 30_000 })
			);
			await and('the filter legend names the obtained results', () =>
				expect(
					historyPage.root.getByText('Obtained Result:', { exact: true })
				).toBeVisible()
			);
		}
	);

	/*
	 * Reading the results
	 */

	test(
		"The results table lists the test path's results with log and run links",
		HISTORY,
		async ({ page }) => {
			const historyPage = new HistoryPage(page);
			const testPath = firstHistoryTestPath();

			await given('the fixture manifest describes a tested path', () =>
				expect(testPath).toBeTruthy()
			);
			await when('I open the history page for that path', async () => {
				await historyPage.gotoWithTestPath(testPath, dateRange());
				await historyPage.expectModeReady('linear');
			});
			await then('the results table lists results', () =>
				historyPage.expectHasResults()
			);
			await and('each result links to its log and its run', async () => {
				const firstRow = historyPage.rows().first();

				await expect(
					firstRow.getByRole('link', { name: 'Log' }).first()
				).toBeVisible();
				await expect(
					firstRow.getByRole('link', { name: 'Run' }).first()
				).toBeVisible();
			});
		}
	);

	test(
		'The substring filter narrows the results already loaded',
		HISTORY,
		async ({ page }) => {
			const historyPage = new HistoryPage(page);
			const testPath = firstHistoryTestPath();

			await given('I search the history for a test path', async () => {
				await historyPage.gotoWithTestPath(testPath, dateRange());
				await historyPage.expectModeReady('linear');
				await historyPage.expectHasResults();
			});
			await when('I type a substring that no result matches', async () => {
				await expect(historyPage.substringFilter).toBeVisible({
					timeout: 30_000
				});
				await historyPage.substringFilter.fill('no-result-matches-this');
			});
			await then('the substring filter holds that value', () =>
				expect(historyPage.substringFilter).toHaveValue(
					'no-result-matches-this'
				)
			);
			await and('no results are left in the table', () =>
				expect(historyPage.rows()).toHaveCount(0, { timeout: 30_000 })
			);
		}
	);

	test(
		'Paging through the results records the page in the URL',
		HISTORY,
		async ({ page }) => {
			const historyPage = new HistoryPage(page);
			const testPath = firstHistoryTestPath();

			await given(
				'I open the history page for a path with more results than one page',
				async () => {
					await historyPage.gotoWithTestPath(testPath, {
						...dateRange(),
						pageSize: '10'
					});
					await historyPage.expectModeReady('linear');
					await historyPage.expectHasResults();
					await expect(historyPage.pagination).toBeVisible({
						timeout: 30_000
					});
				}
			);
			await when('I open the next page of results', () =>
				historyPage.openNextPage()
			);
			await then('the second page is recorded in the URL', () =>
				expect(page).toHaveURL(/[?&]page=2\b/, { timeout: 15_000 })
			);
		}
	);

	test(
		'The legend counts the runs and results the query returned',
		HISTORY,
		async ({ page }) => {
			const historyPage = new HistoryPage(page);
			const testPath = firstHistoryTestPath();

			await given('the fixture manifest describes a tested path', () =>
				expect(testPath).toBeTruthy()
			);
			await when('I open the history page for that path', async () => {
				await historyPage.gotoWithTestPath(testPath, dateRange());
				await historyPage.expectModeReady('linear');
				await historyPage.expectHasResults();
			});
			await then('the legend counts at least one run', () =>
				historyPage.expectLegendCountAtLeast('runs', 1)
			);
			await and('the legend counts at least one test result', () =>
				historyPage.expectLegendCountAtLeast('results', 1)
			);
		}
	);

	test(
		'Reset Filter restores the defaults but keeps the test path',
		HISTORY,
		async ({ page }) => {
			const historyPage = new HistoryPage(page);
			const testPath = firstHistoryTestPath();

			await given(
				'I open the history page for a path with a hash filter applied',
				async () => {
					await historyPage.gotoWithTestPath(testPath, {
						...dateRange(),
						hash: '3c447d65a665c0eee17a0a20827e9'
					});
					await historyPage.expectReady();
					await expect(page).toHaveURL(/hash=/);
				}
			);
			await when('I press Reset Filter', () =>
				historyPage.resetFilterButton.click()
			);
			await then('the hash is dropped from the URL', () =>
				expect(page).not.toHaveURL(/hash=3c447d65a665c0eee17a0a20827e9/, {
					timeout: 15_000
				})
			);
			await and('the test path is kept in the URL', () =>
				expect(page).toHaveURL(
					new RegExp(`testName=${encodeURIComponent(testPath)}`)
				)
			);
		}
	);

	// Assertions are encapsulated by HistoryPage.
	// eslint-disable-next-line playwright/expect-expect
	test(
		'A test path with no matching results shows the empty state',
		HISTORY,
		async ({ page }) => {
			const historyPage = new HistoryPage(page);
			const testPath = firstHistoryTestPath();
			const emptyDate = requireCapability(
				historyEmptyDate(requireManifest()),
				'Fixture manifest contains no day without runs.'
			);

			await given('a tested path and a day the lab did not run it', () =>
				expect(emptyDate).toBeTruthy()
			);
			await when(
				'I open the history page for that path on that day',
				async () => {
					await historyPage.gotoWithTestPath(testPath, {
						startDate: emptyDate,
						finishDate: emptyDate
					});
					await historyPage.expectReady();
				}
			);
			await then('the page reports that there are no results', () =>
				historyPage.expectNoResults()
			);
		}
	);

	// Assertions are encapsulated by HistoryPage.
	// eslint-disable-next-line playwright/expect-expect
	test(
		'Opening history without a test path asks for one',
		HISTORY,
		async ({ page }) => {
			const historyPage = new HistoryPage(page);

			await when('I open the history page with no query', async () => {
				await historyPage.goto();
				await historyPage.expectReady();
			});
			await then('the page reports that a test name is missing', () =>
				historyPage.expectNoTestName()
			);
		}
	);

	/*
	 * Grouped results
	 */

	test(
		'Grouped results list each parameter hash with the results it produced',
		HISTORY,
		async ({ page }) => {
			test.slow();

			const historyPage = new HistoryPage(page);
			const testPath = firstHistoryTestPath();

			await given('the fixture manifest describes a tested path', () =>
				expect(testPath).toBeTruthy()
			);
			await when(
				'I open the history page for that path in the aggregation mode',
				async () => {
					await historyPage.gotoWithTestPath(testPath, {
						...dateRange(),
						mode: 'aggregation'
					});
					await historyPage.expectModeReady('aggregation');
				}
			);
			await then('the grouped table is listed by parameters and hash', () =>
				expect(page.getByText('Parameters/Hash')).toBeVisible({
					timeout: 60_000
				})
			);
			await and('each group lists the results it produced', async () => {
				await historyPage.expectHasResults();
				await expect(page.getByText('Results/Log')).toBeVisible();
			});
		}
	);

	test(
		'A grouped result links to the log of that result',
		HISTORY,
		async ({ page }) => {
			test.slow();

			const historyPage = new HistoryPage(page);
			const testPath = firstHistoryTestPath();

			await given(
				'I open the history page for a path in the aggregation mode',
				async () => {
					await historyPage.gotoWithTestPath(testPath, {
						...dateRange(),
						mode: 'aggregation'
					});
					await historyPage.expectModeReady('aggregation');
					await historyPage.expectHasResults();
				}
			);
			await when('I follow the first numbered result link', () =>
				historyPage.rows().first().locator('a[href*="/log/"]').first().click()
			);
			await then('the log page for that result is open', () =>
				expect(page).toHaveURL(/\/log\/\d+/, { timeout: 30_000 })
			);
		}
	);

	/*
	 * Charts
	 */

	// Assertions are encapsulated by HistoryPage.
	// eslint-disable-next-line playwright/expect-expect
	test(
		'Trend charts render for a test path with measurements',
		HISTORY_MEASUREMENTS,
		async ({ page }) => {
			test.slow();

			const historyPage = new HistoryPage(page);
			const measurements = measurementCase();

			await given(
				'the fixture manifest describes a path with measurements',
				() => expect(measurements.testPath).toBeTruthy()
			);
			await when(
				'I open the history page for that path in the trend charts mode',
				async () => {
					await historyPage.gotoWithTestPath(measurements.testPath, {
						...dateRange(),
						mode: 'measurements'
					});
				}
			);
			await then('the trend charts are rendered', () =>
				historyPage.expectModeReady('measurements')
			);
		}
	);

	// Assertions are encapsulated by HistoryPage.
	// eslint-disable-next-line playwright/expect-expect
	test(
		'Series charts render one block per measurement result',
		HISTORY_MEASUREMENTS,
		async ({ page }) => {
			test.slow();

			const historyPage = new HistoryPage(page);
			const measurements = measurementCase();

			await given(
				'the fixture manifest describes a path with measurements',
				() => expect(measurements.testPath).toBeTruthy()
			);
			await when(
				'I open the history page for that path in the series charts mode',
				async () => {
					await historyPage.gotoWithTestPath(measurements.testPath, {
						...dateRange(),
						mode: 'measurements-by-iteration'
					});
				}
			);
			await then('the series charts are rendered', () =>
				historyPage.expectModeReady('measurements-by-iteration')
			);
		}
	);

	test(
		'Series charts can be narrowed by the chart name filter',
		HISTORY_MEASUREMENTS,
		async ({ page }) => {
			test.slow();

			const historyPage = new HistoryPage(page);
			const measurements = measurementCase();

			await given(
				'I open the history page for a path with measurements in the series charts mode',
				async () => {
					await historyPage.gotoWithTestPath(measurements.testPath, {
						...dateRange(),
						mode: 'measurements-by-iteration'
					});
					await historyPage.expectModeReady('measurements-by-iteration');
				}
			);
			await when('I pick the first chart in the Charts filter', async () => {
				await page.getByRole('button', { name: 'Charts', exact: true }).click();
				await page.locator('[role="option"]').first().click();
			});
			await then('the picked chart is recorded in the URL', () =>
				expect(page).toHaveURL(/parametersByResultName=/, { timeout: 15_000 })
			);
		}
	);

	test(
		'Adding trend charts to the combined view opens the stacked page',
		HISTORY_MEASUREMENTS,
		async ({ page }) => {
			test.slow();

			const historyPage = new HistoryPage(page);
			const measurements = measurementCase();

			await given(
				'I open the history page for a path with measurements in the trend charts mode',
				async () => {
					await historyPage.gotoWithTestPath(measurements.testPath, {
						...dateRange(),
						mode: 'measurements'
					});
					await historyPage.expectModeReady('measurements');
					await expect(historyPage.charts().first()).toBeVisible({
						timeout: 60_000
					});
				}
			);
			await when('I add the first chart to the combined view', () =>
				historyPage.addChartToCombined(0)
			);
			await and('I open the stacked view from the selection', () =>
				historyPage.openStackedFromSelection()
			);
			await then(
				'the stacked mode is open with the selected chart in the URL',
				async () => {
					await expect(page).toHaveURL(/combinedPlots=/, { timeout: 30_000 });
					await expect(historyPage.root).toHaveAttribute(
						'data-history-mode',
						'measurements-combined'
					);
				}
			);
		}
	);

	test(
		'The stacked view asks for a selection when none was made',
		HISTORY,
		async ({ page }) => {
			const historyPage = new HistoryPage(page);
			const measurements = measurementCase();

			await when(
				'I open the history page in the stacked charts mode with nothing selected',
				async () => {
					await historyPage.gotoWithTestPath(measurements.testPath, {
						...dateRange(),
						mode: 'measurements-combined'
					});
					await historyPage.expectReady();
				}
			);
			await then('the page reports that no plots were selected', () =>
				expect(page.getByText('You have not selected plots')).toBeVisible({
					timeout: 60_000
				})
			);
		}
	);

	/*
	 * Modes
	 */

	test.describe('The history page renders every result mode', () => {
		// The row names must be static for the feature/spec checker, so the
		// Examples rows are spelled out instead of generated in a loop.
		test.slow();

		async function expectModeRendered(page: Page, mode: HistoryMode) {
			const historyPage = new HistoryPage(page);
			const measurements = measurementCase();

			await given(
				'the fixture manifest describes a path with measurements',
				() => expect(measurements.testPath).toBeTruthy()
			);
			await when(
				'I open the history page for that path in the given mode',
				() =>
					historyPage.gotoWithTestPath(measurements.testPath, {
						...dateRange(),
						mode
					})
			);
			await then('the history page reports that mode as its layout', () =>
				historyPage.expectModeReady(mode)
			);
		}

		// Assertions are encapsulated by HistoryPage.
		/* eslint-disable playwright/expect-expect */
		test('linear', HISTORY, ({ page }) => expectModeRendered(page, 'linear'));

		test('aggregation', HISTORY, ({ page }) =>
			expectModeRendered(page, 'aggregation')
		);

		test('measurements', HISTORY, ({ page }) =>
			expectModeRendered(page, 'measurements')
		);

		test('measurements-by-iteration', HISTORY, ({ page }) =>
			expectModeRendered(page, 'measurements-by-iteration')
		);

		test('measurements-combined', HISTORY, ({ page }) =>
			expectModeRendered(page, 'measurements-combined')
		);
		/* eslint-enable playwright/expect-expect */
	});

	/*
	 * Project scoping
	 */

	test(
		'Selecting a project in the sidebar scopes the history results to it',
		HISTORY,
		async ({ page, request }) => {
			test.slow();

			const historyPage = new HistoryPage(page);
			const picker = new ProjectPicker(page);
			const pair = requireCapability(
				historyProjectPair(requireManifest()),
				'Fixture manifest contains no two projects with distinct test paths.'
			);
			let projectId = 0;

			await given(
				'two projects with test paths that do not overlap',
				async () => {
					expect(pair.selected.testPath).not.toBe(pair.other.testPath);
					projectId = requireCapability(
						await projectIdByName(request, pair.selected.project),
						`Project "${pair.selected.project}" is not registered.`
					);
				}
			);
			await when('I select the first project in the sidebar', async () => {
				await historyPage.goto();
				await historyPage.expectReady();
				await picker.select(projectId);
			});

			const historyResponse = waitForHistoryResponse(
				page,
				pair.selected.testPath
			);

			await and("I open the history page for that project's test path", () =>
				historyPage.gotoWithTestPath(pair.selected.testPath, {
					...dateRange(),
					project: String(projectId)
				})
			);
			await then('the history request carries that project', async () => {
				const response = await historyResponse;

				expect(new URL(response.url()).searchParams.get('project')).toBe(
					String(projectId)
				);
			});
			await and('the results table lists results', async () => {
				await historyPage.expectModeReady('linear');
				await historyPage.expectHasResults();
			});
			await when(
				"I open the history page for the other project's test path",
				() =>
					historyPage.gotoWithTestPath(pair.other.testPath, {
						...dateRange(),
						project: String(projectId)
					})
			);
			await then('the page reports that there are no results', () =>
				historyPage.expectNoResults()
			);
			await when('I select All projects in the sidebar', async () => {
				await picker.selectAll();
			});
			await then('the results table lists results', async () => {
				await historyPage.expectModeReady('linear');
				await historyPage.expectHasResults();
			});
		}
	);

	test.describe('Every history mode stays scoped to the selected project', () => {
		// The row names must be static for the feature/spec checker, so the
		// Examples rows are spelled out instead of generated in a loop.
		test.slow();

		async function expectModeScoped(
			page: Page,
			request: APIRequestContext,
			mode: HistoryMode
		) {
			const historyPage = new HistoryPage(page);
			const picker = new ProjectPicker(page);
			const measurements = measurementCase();
			let projectId = 0;

			await given(
				'a project with a test path that reports measurements',
				async () => {
					projectId = requireCapability(
						await projectIdByName(request, measurements.project),
						`Project "${measurements.project}" is not registered.`
					);
				}
			);
			await when('I select that project in the sidebar', async () => {
				await historyPage.goto();
				await historyPage.expectReady();
				await picker.select(projectId);
			});

			const historyResponse = waitForHistoryResponse(
				page,
				measurements.testPath
			);

			await and('I open the history page for that path in the given mode', () =>
				historyPage.gotoWithTestPath(measurements.testPath, {
					...dateRange(),
					mode,
					project: String(projectId)
				})
			);
			await then('the history request carries that project', async () => {
				const response = await historyResponse;

				expect(new URL(response.url()).searchParams.get('project')).toBe(
					String(projectId)
				);
				await historyPage.expectModeReady(mode);
			});
		}

		// Assertions are encapsulated by HistoryPage.
		/* eslint-disable playwright/expect-expect */
		test('List Of Results', HISTORY, ({ page, request }) =>
			expectModeScoped(page, request, 'linear')
		);

		test('Groups Of Results', HISTORY, ({ page, request }) =>
			expectModeScoped(page, request, 'aggregation')
		);

		test('Trend Charts', HISTORY, ({ page, request }) =>
			expectModeScoped(page, request, 'measurements')
		);
		/* eslint-enable playwright/expect-expect */
	});
});
