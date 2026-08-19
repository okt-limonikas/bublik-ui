/* SPDX-License-Identifier: Apache-2.0 */
/* SPDX-FileCopyrightText: 2024-2026 OKTET LTD */
import { expect, Locator, Page } from '@playwright/test';

/** Radix opens a hover card after a delay, so one hover has to be given time. */
const HOVER_CARD_OPEN_TIMEOUT = 5_000;

/**
 * The conclusion indicator of a run row is icon-only: the state is carried by
 * `data-conclusion` and the wording lives in a Radix hover card. The runs table
 * and the dashboard render the same indicator, so both read it the same way.
 *
 * One `hover()` is not enough. The card opens on `pointerenter`, and Firefox
 * does not re-fire that event for a freshly mounted node sitting under a cursor
 * that has not moved — which is exactly what happens when a scenario hovers a
 * badge on the runs page and then hovers the same run's badge on the dashboard,
 * where the two sit at the same coordinates. Gecko keeps the stale node as its
 * hover target, the trigger stays `data-state="closed"` forever, and only an
 * actual pointer movement recovers it.
 *
 * So the pointer is parked away from the row before every attempt, and the
 * attempt is retried until the card is really up.
 */
async function expectConclusionHoverCard(
	page: Page,
	indicator: Locator,
	conclusion: string
): Promise<void> {
	await expect(indicator).toHaveAttribute(
		'data-conclusion',
		`run-${conclusion}`,
		{ timeout: 30_000 }
	);

	const label = page.getByText('Conclusion:').first();

	await expect
		.poll(
			async () => {
				await page.mouse.move(0, 0);
				await indicator.hover({ timeout: 5_000 }).catch(() => undefined);

				// waitFor, not isVisible: the card is only up once the open delay
				// has elapsed, and an instant check would restart the hover before
				// Radix ever got there.
				return label
					.waitFor({ state: 'visible', timeout: HOVER_CARD_OPEN_TIMEOUT })
					.then(() => true)
					.catch(() => false);
			},
			{
				timeout: 30_000,
				intervals: [250],
				message: `expected the conclusion hover card of a "${conclusion}" run to open`
			}
		)
		.toBe(true);

	await expect(page.getByText(conclusion, { exact: true }).first()).toBeVisible(
		{
			timeout: 15_000
		}
	);
}

export { expectConclusionHoverCard };
