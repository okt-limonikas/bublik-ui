/* SPDX-License-Identifier: Apache-2.0 */
/* SPDX-FileCopyrightText: 2024-2026 OKTET LTD */
/* Implements features/measurements.feature */
import { expect, test } from '@playwright/test';
import type { APIRequestContext, Page } from '@playwright/test';

import { MeasurementsPage } from './pages/measurements-page';
import { requireManifest } from './support/manifest';
import { requireCapability } from './support/capabilities';
import { firstMeasurementResultNode } from './support/e2e-data';
import { and, given, then, when } from './support/gherkin';

test.describe('Measurements Page', () => {
	test.describe('The measurements page renders every layout mode', () => {
		// The scenario names must be static for the feature/spec checker, so the
		// Examples rows are spelled out instead of generated in a loop.
		async function expectModeRendered(
			page: Page,
			request: APIRequestContext,
			mode: string
		) {
			const measurementsPage = new MeasurementsPage(page);
			const result = requireCapability(
				await firstMeasurementResultNode(request, requireManifest()),
				'Fixture manifest contains no result with measurements.'
			);

			await when('I open the measurements page in the given mode', () =>
				measurementsPage.goto(
					result.runCase.runId,
					result.node.id,
					`mode=${mode}`
				)
			);
			await then('the page reports that mode as its layout', () =>
				measurementsPage.expectLoaded(mode)
			);
		}

		// Assertions are encapsulated by MeasurementsPage.
		/* eslint-disable playwright/expect-expect */
		test('default', { tag: ['@needs-measurements'] }, ({ page, request }) =>
			expectModeRendered(page, request, 'default')
		);

		test('charts', { tag: ['@needs-measurements'] }, ({ page, request }) =>
			expectModeRendered(page, request, 'charts')
		);

		test('tables', { tag: ['@needs-measurements'] }, ({ page, request }) =>
			expectModeRendered(page, request, 'tables')
		);

		test('split', { tag: ['@needs-measurements'] }, ({ page, request }) =>
			expectModeRendered(page, request, 'split')
		);

		test('overlay', { tag: ['@needs-measurements'] }, ({ page, request }) =>
			expectModeRendered(page, request, 'overlay')
		);
		/* eslint-enable playwright/expect-expect */
	});

	// Assertions are encapsulated by MeasurementsPage.
	// eslint-disable-next-line playwright/expect-expect
	test(
		'The measurements header links back to the run and the log',
		{ tag: ['@needs-measurements'] },
		async ({ page, request }) => {
			const measurementsPage = new MeasurementsPage(page);
			const result = requireCapability(
				await firstMeasurementResultNode(request, requireManifest()),
				'Fixture manifest contains no result with measurements.'
			);

			await when('I open the measurements page', async () => {
				await measurementsPage.goto(result.runCase.runId, result.node.id);
				await measurementsPage.expectLoaded();
			});
			await and('I follow the Log link', () => measurementsPage.openLog());
			await then('the log page is open', () =>
				expect(page).toHaveURL(/\/log\/\d+/)
			);
			await when('I open the measurements page again', async () => {
				await measurementsPage.goto(result.runCase.runId, result.node.id);
				await measurementsPage.expectLoaded();
			});
			await and('I follow the Run link', () => measurementsPage.openRun());
			await then('the run page is open', () =>
				expect(page).toHaveURL(/\/runs\/\d+/)
			);
		}
	);

	test(
		'The measurement tables list every measurement reported for the result',
		{ tag: ['@needs-measurements'] },
		async ({ page, request }) => {
			const measurementsPage = new MeasurementsPage(page);
			const result = requireCapability(
				await firstMeasurementResultNode(request, requireManifest()),
				'Fixture manifest contains no result with measurements.'
			);
			let tables: { tool: string; name: string }[] = [];

			await given(
				'the API reports measurement tables for that result',
				async () => {
					const response = await request.get(
						`/api/v2/results/${result.node.id}/measurements`
					);
					expect(response.ok()).toBeTruthy();

					const payload = (await response.json()) as {
						tables?: { tool: string; name: string }[];
					};
					tables = requireCapability(
						payload.tables?.length ? payload.tables : null,
						`Result ${result.node.id} reports no measurement tables.`
					);
				}
			);
			await when(
				'I open the measurements page in the tables mode',
				async () => {
					await measurementsPage.goto(
						result.runCase.runId,
						result.node.id,
						'mode=tables'
					);
					await measurementsPage.expectLoaded('tables');
				}
			);
			await then(
				'every reported measurement is listed with its tool and name',
				async () => {
					for (const table of tables) {
						const row = page
							.getByRole('row')
							.filter({ hasText: table.tool })
							.filter({ hasText: table.name });

						await expect(row.first()).toBeVisible({ timeout: 30_000 });
					}
				}
			);
		}
	);
});
