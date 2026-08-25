/* SPDX-License-Identifier: Apache-2.0 */
/* SPDX-FileCopyrightText: 2024-2026 OKTET LTD */
import { expect, Page } from '@playwright/test';

/**
 * Reading the query string is the same job on every page, and it has enough
 * traps to be worth doing in one place:
 *
 * - `null` means the key is absent, `''` means present but empty. The app uses
 *   both, deliberately — the history search form writes its whole block with
 *   empty values on every submit, while `duration` and `page` are deleted
 *   outright when they go back to their defaults.
 * - Lists come in two encodings that must never be mixed: `;`-joined values
 *   (`runData`, `combinedPlots`, every history list — `config.queryDelimiter`)
 *   and repeated keys (`project`, `selectedCharts`, `selected-records`,
 *   `globalRequirements`, `runIds`). Asserting the wrong one passes against a
 *   filter that matches nothing.
 * - Several parameters are lz-string compressed blobs. Only "it is written" and
 *   "it changed" are assertable; the value itself is proved by reloading and
 *   finding the same rendered state.
 * - Assertions must name the keys they read. `navigateWithProject` injects
 *   `project`, `_s` and `hide-sidebar` into every programmatic navigation, so
 *   comparing whole query strings is flaky by construction.
 *
 * Everything polls: every write is an async history replace.
 */

/** `null` = the key must be absent, `''` = present but empty. */
type ParamExpectation = string | null;

const POLL = { timeout: 15_000 } as const;

/** `config.queryDelimiter` — the app joins list values with this. */
const QUERY_DELIMITER = ';';

class UrlParams {
	constructor(private readonly page: Page) {}

	private search(): URLSearchParams {
		return new URL(this.page.url()).searchParams;
	}

	get(key: string): string | null {
		return this.search().get(key);
	}

	getAll(key: string): string[] {
		return this.search().getAll(key);
	}

	/** Splits a `;`-joined value, dropping the empty segments an empty key gives. */
	private delimited(key: string): string[] {
		return (this.get(key) ?? '')
			.split(QUERY_DELIMITER)
			.filter((value) => value.length > 0);
	}

	async expect(expected: Record<string, ParamExpectation>): Promise<void> {
		for (const [key, value] of Object.entries(expected)) {
			await expect
				.poll(() => this.get(key), {
					...POLL,
					message: `URL parameter "${key}"`
				})
				.toBe(value);
		}
	}

	/**
	 * Asserts the keys are in the query string whatever their values — the
	 * contract for a block a page writes wholesale, most of it empty. A
	 * parameter that silently stopped being serialized fails here.
	 */
	async expectPresent(keys: readonly string[]): Promise<void> {
		await expect
			.poll(
				() => {
					const params = this.search();

					return keys.filter((key) => !params.has(key));
				},
				{ ...POLL, message: 'URL parameters that are not written' }
			)
			.toEqual([]);
	}

	async expectAbsent(keys: readonly string[]): Promise<void> {
		await expect
			.poll(
				() => {
					const params = this.search();

					return keys.filter((key) => params.has(key));
				},
				{ ...POLL, message: 'URL parameters that should not be written' }
			)
			.toEqual([]);
	}

	/**
	 * `ArrayParam` / `NumericArrayParam` repeat the key once per value rather
	 * than joining them. Order is not part of the contract.
	 */
	async expectRepeated(key: string, values: readonly string[]): Promise<void> {
		const expected = [...values].sort();

		await expect
			.poll(() => [...this.getAll(key)].sort(), {
				...POLL,
				message: `repeated URL parameter "${key}"`
			})
			.toEqual(expected);
	}

	/**
	 * Membership in a `;`-joined list. The whole string is not assertable for
	 * every list: `runData` is deduped and `localeCompare`-sorted on write, so
	 * the order is the app's to choose.
	 */
	async expectDelimitedContains(
		key: string,
		...values: string[]
	): Promise<void> {
		for (const value of values) {
			await expect
				.poll(() => this.delimited(key), {
					...POLL,
					message: `URL parameter "${key}" should carry "${value}"`
				})
				.toContain(value);
		}
	}

	/** The exact membership of a `;`-joined list, order-insensitively. */
	async expectDelimitedExactly(
		key: string,
		values: readonly string[]
	): Promise<void> {
		const expected = [...values].sort();

		await expect
			.poll(() => [...this.delimited(key)].sort(), {
				...POLL,
				message: `URL parameter "${key}"`
			})
			.toEqual(expected);
	}

	/**
	 * The only assertion a compressed parameter supports. Its value is an
	 * lz-string blob — reading it would pin the encoding rather than the state,
	 * so scenarios prove the round trip by reloading and re-reading the rows.
	 */
	async expectWritten(key: string): Promise<void> {
		await expect
			.poll(() => this.get(key), {
				...POLL,
				message: `URL parameter "${key}" should be written`
			})
			.not.toBeNull();
	}

	/** The compressed-parameter equivalent of "the control changed something". */
	async expectChangedWhile(
		key: string,
		action: () => Promise<void>
	): Promise<void> {
		const before = this.get(key);

		await action();

		await expect
			.poll(() => this.get(key), {
				...POLL,
				message: `URL parameter "${key}" should have changed`
			})
			.not.toBe(before);
	}

	/**
	 * "An unrelated control preserved the rest of the view." Named keys only —
	 * the sidebar writes `_s` on most navigations, so a whole-query comparison
	 * would fail on a parameter the scenario is not about.
	 *
	 * Settles rather than polls: the contract is that nothing happened, and
	 * polling for equality would pass on the first tick, before the write this
	 * is meant to catch had a chance to land.
	 */
	async expectUnchangedWhile(
		keys: readonly string[],
		action: () => Promise<void>,
		settleMs = 2_000
	): Promise<void> {
		const before = this.snapshot(keys);

		await action();
		// eslint-disable-next-line playwright/no-wait-for-timeout
		await this.page.waitForTimeout(settleMs);

		expect(this.snapshot(keys)).toEqual(before);
	}

	snapshot(keys: readonly string[]): Record<string, string[]> {
		const params = this.search();

		return Object.fromEntries(keys.map((key) => [key, params.getAll(key)]));
	}
}

function urlParams(page: Page): UrlParams {
	return new UrlParams(page);
}

export { QUERY_DELIMITER, UrlParams, urlParams };
export type { ParamExpectation };
