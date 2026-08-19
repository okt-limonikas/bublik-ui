/* SPDX-License-Identifier: Apache-2.0 */
/* SPDX-FileCopyrightText: 2024-2026 OKTET LTD */
/* Implements apps/bublik/e2e/features/log.feature */
/* Assertions are encapsulated by LogPage. */
/* eslint-disable playwright/expect-expect */
import { expect, test } from '@playwright/test';

import { LogPage } from './pages/log-page';
import { requireManifest } from './support/manifest';
import { requireCapability } from './support/capabilities';
import {
	firstErrorResultNode,
	firstMeasurementResultNode,
	firstResultNode,
	importedRunId,
	representativeImportedRun
} from './support/e2e-data';
import { and, given, then, when } from './support/gherkin';
import { representativeNokRun } from './support/sample-cases';

test.describe('Log Page', () => {
	test(
		'The log layout follows the selected mode',
		{ tag: ['@smoke'] },
		async ({ page }) => {
			const runCase = representativeImportedRun(requireManifest());
			const logPage = new LogPage(page);

			await given('the fixture manifest describes an imported run', () =>
				expect(runCase.runId).toBeGreaterThan(0)
			);
			await when('I open its log in the tree-and-info mode', async () => {
				await logPage.goto(runCase.runId, 'mode=treeAndinfoAndlog');
				await logPage.expectLoaded();
			});
			await then('both the tree and the info panel are shown', async () => {
				await logPage.expectTreeVisible();
				await logPage.expectInfoVisible();
			});
			await when('I open its log in the log-only mode', async () => {
				await logPage.goto(runCase.runId, 'mode=log');
				await logPage.expectLoaded();
			});
			await then('neither the tree nor the info panel is shown', async () => {
				await logPage.expectTreeHidden();
				await logPage.expectInfoHidden();
			});
		}
	);

	test("Focusing a tree item loads that result's log", async ({
		page,
		request
	}) => {
		const runCase = representativeImportedRun(requireManifest());
		const logPage = new LogPage(page);
		const result = requireCapability(
			await firstResultNode(request, runCase),
			'Fixture tree contains no test result node.'
		);

		await given("the run's tree contains a test result", () =>
			expect(result.node.id).toBeTruthy()
		);
		await when('I open the log focused on that result', async () => {
			await logPage.goto(
				runCase.runId,
				`mode=treeAndlog&focusId=${result.node.id}`
			);
			await logPage.expectLoaded();
			await logPage.expectTreeVisible();
		});
		await then('the tree marks that result as focused', () =>
			logPage.expectFocusedTreeItem(result.node.id)
		);
		await and('the JSON log is rendered', () => logPage.expectJsonLogVisible());
		await when('I go back to the run log', () => logPage.showRunLog());
		await then('the JSON log is rendered', () =>
			logPage.expectJsonLogVisible()
		);
	});

	test(
		'The NOK-only tree keeps the focused error result reachable',
		{ tag: ['@needs-nok'] },
		async ({ page, request }) => {
			const logPage = new LogPage(page);
			const representative = requireCapability(
				representativeNokRun(requireManifest()),
				'Fixture manifest contains no NOK samples.'
			);
			const runCase = {
				bundle: representative.bundle,
				expectedRun: representative.expectedRun,
				runId: importedRunId(representative.bundle)
			};
			const result = requireCapability(
				await firstErrorResultNode(request, runCase),
				'Fixture tree contains no error result node.'
			);

			await given(
				'a run with unexpected results has an error result in its tree',
				() => expect(result.node.id).toBeTruthy()
			);
			await when('I open the log focused on that error result', async () => {
				await logPage.goto(
					runCase.runId,
					`mode=treeAndlog&focusId=${result.node.id}`
				);
				await logPage.expectLoaded();
			});
			await and('I turn on the NOK-only tree', () => logPage.toggleOnlyNok());
			await and('I scroll to the focused result', () =>
				logPage.scrollToFocus()
			);
			await then('the tree marks that result as focused', () =>
				logPage.expectFocusedTreeItem(result.node.id)
			);
		}
	);

	test('The legacy toggle switches the log renderer', async ({ page }) => {
		const runCase = representativeImportedRun(requireManifest());
		const logPage = new LogPage(page);

		await given('I open the log of an imported run', () =>
			logPage.goto(runCase.runId)
		);
		await then('the JSON log is rendered', () =>
			logPage.expectJsonLogVisible()
		);
		await when('I turn on the legacy log', async () => {
			await logPage.toggleLegacyLog();
			await expect(page).toHaveURL(/legacy=true/, { timeout: 15_000 });
		});
		await then('the legacy log frame is shown', () =>
			logPage.expectLegacyLogVisible()
		);
		await when('I turn off the legacy log', async () => {
			await logPage.toggleLegacyLog();
			await expect(page).toHaveURL(/legacy=false/, { timeout: 15_000 });
		});
		await then('the JSON log is rendered', () =>
			logPage.expectJsonLogVisible()
		);
	});

	test('Bookmarking a log line survives a reload', async ({
		page,
		request
	}) => {
		const runCase = representativeImportedRun(requireManifest());
		const logPage = new LogPage(page);
		const result = requireCapability(
			await firstResultNode(request, runCase),
			'Fixture tree contains no test result node.'
		);
		let line = '1';

		await given('I open the log focused on a test result', async () => {
			await logPage.goto(runCase.runId, `focusId=${result.node.id}`);
			await logPage.expectJsonLogVisible();
		});
		await when('I click a log line number', async () => {
			line = await logPage.bookmarkFirstLine();
		});
		await and('I reload the page', async () => {
			await page.reload();
			await logPage.expectJsonLogVisible();
		});
		await then('the bookmarked line is still recorded in the URL', () =>
			expect(page).toHaveURL(new RegExp(`lineNumber=.*_${line}`), {
				timeout: 15_000
			})
		);
	});

	test(
		'A result with measurements links to its measurements page',
		{ tag: ['@needs-measurements'] },
		async ({ page, request }) => {
			const logPage = new LogPage(page);
			const result = requireCapability(
				await firstMeasurementResultNode(request, requireManifest()),
				'Fixture manifest contains no result with measurements.'
			);

			await given(
				'the fixture manifest describes a result with measurements',
				() => expect(result.node.id).toBeTruthy()
			);
			await when('I open the log focused on that result', async () => {
				await logPage.goto(
					result.runCase.runId,
					`mode=treeAndinfoAndlog&focusId=${result.node.id}`
				);
				await logPage.expectLoaded();
			});
			await and('I follow the Result link', () =>
				logPage.openFocusedResultMeasurements()
			);
			await then('the measurements page is open', () =>
				expect(page).toHaveURL(/\/measurements(?:$|\?)/, { timeout: 15_000 })
			);
		}
	);
	/* ------------------------------------------------------------------ *
	 * URL parameters
	 * ------------------------------------------------------------------ */

	test(
		'A log link restores the focused result and the layout',
		{ tag: ['@log', '@url-params'] },
		async ({ page, request }) => {
			const runCase = representativeImportedRun(requireManifest());
			const logPage = new LogPage(page);
			const result = requireCapability(
				await firstResultNode(request, runCase),
				'Fixture tree contains no test result node.'
			);
			const link = {
				mode: 'treeAndlog',
				focusId: String(result.node.id)
			};

			await given(
				'a link that focuses one result of a run in the tree-and-log layout',
				() => expect(result.node.id).toBeTruthy()
			);
			await when('I open that link', async () => {
				await logPage.gotoWithParams(runCase.runId, link);
				await logPage.expectLoaded();
			});
			await then('the tree marks that result as focused', () =>
				logPage.expectFocusedTreeItem(result.node.id)
			);
			await and('the tree is shown and the info panel is not', () =>
				logPage.expectModeLayout('treeAndlog')
			);
			await and('the link still carries the focused result and the layout', () =>
				logPage.expectParams(link)
			);
		}
	);

	test(
		'Focusing a result clears the bookmarked line and the page',
		{ tag: ['@log', '@url-params'] },
		async ({ page, request }) => {
			const runCase = representativeImportedRun(requireManifest());
			const logPage = new LogPage(page);
			const result = requireCapability(
				await firstResultNode(request, runCase),
				'Fixture tree contains no test result node.'
			);

			// The combination is one the UI would never write itself — `setFocusId`
			// is what clears these — so it is built by hand to prove the clearing
			// happens on the way in as well as on the way out.
			await given('I open a log carrying a bookmarked line and a page', async () => {
				await logPage.gotoWithParams(runCase.runId, {
					mode: 'treeAndlog',
					page: '2',
					lineNumber: '0_5'
				});
				await logPage.expectLoaded();
				await logPage.expectParams({ page: '2', lineNumber: '0_5' });
			});
			await when('I focus a result in the tree', () =>
				logPage.focusTreeItem(result.node.id)
			);
			await then('the focused result is recorded in the URL', () =>
				logPage.expectParams({ focusId: String(result.node.id) })
			);
			await and('the bookmarked line and the page are dropped from the URL', () =>
				logPage.expectParams({ lineNumber: null, page: null })
			);
		}
	);

	test(
		'Going back to the run log drops the focus, the line and the page',
		{ tag: ['@log', '@url-params'] },
		async ({ page, request }) => {
			const runCase = representativeImportedRun(requireManifest());
			const logPage = new LogPage(page);
			const result = requireCapability(
				await firstResultNode(request, runCase),
				'Fixture tree contains no test result node.'
			);

			await given('I open a log focused on a result with a bookmarked line', async () => {
				await logPage.gotoWithParams(runCase.runId, {
					mode: 'treeAndlog',
					focusId: String(result.node.id),
					lineNumber: `${result.node.id}_1`,
					page: '2'
				});
				await logPage.expectLoaded();
				await logPage.expectTreeVisible();
			});
			await when('I go back to the run log', () => logPage.showRunLog());
			await then(
				'the focused result, the bookmarked line and the page are all dropped from the URL',
				() =>
					logPage.expectParams({
						focusId: null,
						lineNumber: null,
						page: null
					})
			);
			await and('the JSON log is rendered', () =>
				logPage.expectJsonLogVisible()
			);
		}
	);

	test(
		'An unknown log layout in the link renders the log on its own',
		{ tag: ['@log', '@url-params'] },
		async ({ page }) => {
			const runCase = representativeImportedRun(requireManifest());
			const logPage = new LogPage(page);
			const unknownMode = 'treeAndeverything';

			await given(
				'a link whose layout is not a layout the log renders',
				() => expect(unknownMode).not.toBe('treeAndinfoAndlog')
			);
			await when('I open that link', async () => {
				await logPage.gotoWithParams(runCase.runId, { mode: unknownMode });
				await logPage.expectLoaded();
			});
			// `log` is what an unrecognised value renders, because neither panel's
			// condition matches it — not because anything normalised it.
			await then('neither the tree nor the info panel is shown', () =>
				logPage.expectModeLayout('log')
			);
			await and('the URL still carries the unknown layout', async () => {
				await logPage.expectParams({ mode: unknownMode });
				await logPage.expectRawMode(unknownMode);
			});
		}
	);

	test(
		'Turning on the legacy log records it in the URL and survives a reload',
		{ tag: ['@log', '@url-params'] },
		async ({ page }) => {
			const runCase = representativeImportedRun(requireManifest());
			const logPage = new LogPage(page);

			await given('I open the log of an imported run', async () => {
				await logPage.goto(runCase.runId);
				await logPage.expectJsonLogVisible();
			});
			await when('I turn on the legacy log', () => logPage.toggleLegacyLog());
			await then('the URL records the legacy renderer', () =>
				logPage.expectParams({ legacy: 'true' })
			);
			await when('I reload the page', () => page.reload());
			await then('the legacy log frame is shown', () =>
				logPage.expectLegacyLogVisible()
			);
			// Off is written as `false`, not as a deleted key: the parameter also
			// has to override the user preference, which an absent key would not.
			await when('I turn off the legacy log', () => logPage.toggleLegacyLog());
			await then('the URL records the legacy renderer as off', () =>
				logPage.expectParams({ legacy: 'false' })
			);
		}
	);

	test(
		'A link using the deprecated experimental parameter still opens the legacy log',
		{ tag: ['@log', '@url-params'] },
		async ({ page }) => {
			const runCase = representativeImportedRun(requireManifest());
			const logPage = new LogPage(page);

			const link = { experimental: 'false' };

			await given(
				'a link that asks for the legacy log through the deprecated parameter',
				() => expect(link.experimental).toBe('false')
			);
			await when('I open that link', async () => {
				await logPage.gotoWithParams(runCase.runId, link);
				await logPage.expectLoaded();
			});
			await then('the legacy log frame is shown', () =>
				logPage.expectLegacyLogVisible()
			);
			await when('I turn off the legacy log', () => logPage.toggleLegacyLog());
			// Leaving both would leave two parameters disagreeing about the
			// renderer, and `experimental` wins on read — so the toggle would
			// appear not to work at all.
			await then('the deprecated parameter is dropped from the URL', () =>
				logPage.expectParams({ experimental: null })
			);
			await and('the URL records the legacy renderer as off', () =>
				logPage.expectParams({ legacy: 'false' })
			);
		}
	);

	test(
		'The NOK-only tree toggle is not recorded in the URL',
		{ tag: ['@log', '@url-params', '@needs-nok'] },
		async ({ page }) => {
			const logPage = new LogPage(page);
			const representative = requireCapability(
				representativeNokRun(requireManifest()),
				'Fixture manifest contains no NOK samples.'
			);
			const runId = importedRunId(representative.bundle);
			let before = 0;

			await given('I open the log of a run with unexpected results', async () => {
				await logPage.gotoWithParams(runId, { mode: 'treeAndlog' });
				await logPage.expectLoaded();
				await logPage.expectTreeVisible();
				await expect
					.poll(() => logPage.treeItems().count(), { timeout: 30_000 })
					.toBeGreaterThan(0);
				before = await logPage.treeItems().count();
			});
			await when('I turn on the NOK-only tree', () => logPage.toggleOnlyNok());
			await then('the tree lists fewer results', () =>
				expect
					.poll(() => logPage.treeItems().count(), {
						timeout: 30_000,
						message: 'tree items after filtering to NOK only'
					})
					.toBeLessThan(before)
			);
			// Named keys only: the sidebar is free to write `_s` here, and a
			// whole-query comparison would fail on a parameter this is not about.
			await and('the log parameters are unchanged', () =>
				logPage.expectParams({
					focusId: null,
					lineNumber: null,
					page: null,
					mode: 'treeAndlog'
				})
			);
		}
	);
});
