/* SPDX-License-Identifier: Apache-2.0 */
/* SPDX-FileCopyrightText: 2024-2026 OKTET LTD */
import { expect, Page } from '@playwright/test';
import { decompressFromEncodedURIComponent } from 'lz-string';

/**
 * `_s` is the sidebar's memory: the address it should return you to on each
 * page, the mode each page was last in, and — the reason this helper exists —
 * the set of runs selected for Compare and Multiple. No page owns it, and no
 * page object should decode it on its own.
 *
 * The payload is the compact tuple `[3, { alias: value }]`, lz-string
 * compressed. Aliases and the length budget mirror `SIDEBAR_KEY_REGISTRY` in
 * `libs/bublik/features/sidebar/src/lib/sidebar-url.utils.ts`; a rename there
 * that is not mirrored here fails the scenarios that read a specific alias,
 * which is the point.
 *
 * The selection is the one piece of state a user builds up by clicking and
 * would expect a link to carry, but which is not a query parameter of its own.
 * Asserting "the Compare link points at both runs" does not pin where it is
 * stored; reading `rs` does.
 */

const SIDEBAR_STATE_PARAM = '_s';

/**
 * `SIDEBAR_STATE_MAX_LENGTH`. Over budget, keys are dropped front to back in
 * registry order — `du` goes first, `rs` and `cr` last — so a scenario that
 * visits many pages and then asserts an early alias is asserting a value the
 * encoder is allowed to have thrown away.
 */
const SIDEBAR_STATE_MAX_LENGTH = 1500;

const SIDEBAR_STATE_VERSION = 3;

/** The aliases the scenarios name, in registry (prune) order. */
const SIDEBAR_ALIASES = {
	dashboardLastUrl: 'du',
	historyLastLinear: 'hl',
	measurementsLast: 'mmu',
	logLast: 'll',
	runLastReport: 'rr',
	runLastDetails: 'rd',
	runsLastMultiple: 'rlm',
	runsLastCompare: 'rlp',
	runsLastList: 'rll',
	logLastMode: 'lm',
	runsSelected: 'rs',
	currentRunId: 'cr'
} as const;

/**
 * Aliases whose value is stored as a bare search string, with the pathname
 * re-attached on read (`fromCompactValue`). A value already starting with `/`
 * is a full URL and passes through.
 */
const SIDEBAR_ALIAS_PATHNAMES: Record<string, string> = {
	du: '/dashboard',
	hk: '/history',
	hs: '/history',
	ht: '/history',
	ha: '/history',
	hl: '/history',
	rlm: '/multiple',
	rlp: '/compare',
	rlpr: '/runs',
	rlc: '/runs',
	rll: '/runs'
};

type SidebarStateValue = string | string[];

function isStringArray(value: unknown): value is string[] {
	return Array.isArray(value) && value.every((it) => typeof it === 'string');
}

/** Mirrors `fromCompactValue` — a bare search string regains its pathname. */
function expandAliasValue(alias: string, value: string): string {
	if (value.startsWith('/')) return value;

	const pathname = SIDEBAR_ALIAS_PATHNAMES[alias];
	if (!pathname) return value;

	return value ? `${pathname}?${value}` : pathname;
}

/**
 * Decodes `_s` out of a URL into `{ alias: value }`. An absent, unreadable or
 * wrong-version payload decodes to `{}` rather than throwing — that is what
 * the app does with it, and a scenario asserting "no selection" must not be
 * able to pass by way of a decode failure it never notices.
 */
function decodeSidebarState(url: string): Record<string, SidebarStateValue> {
	const encoded = new URL(url).searchParams.get(SIDEBAR_STATE_PARAM);
	if (!encoded) return {};

	let parsed: unknown;
	try {
		const json = decompressFromEncodedURIComponent(encoded);
		parsed = json ? JSON.parse(json) : null;
	} catch {
		return {};
	}

	if (
		!Array.isArray(parsed) ||
		parsed.length !== 2 ||
		parsed[0] !== SIDEBAR_STATE_VERSION ||
		!parsed[1] ||
		typeof parsed[1] !== 'object' ||
		Array.isArray(parsed[1])
	) {
		return {};
	}

	const values: Record<string, SidebarStateValue> = {};

	for (const [alias, entry] of Object.entries(
		parsed[1] as Record<string, unknown>
	)) {
		if (typeof entry === 'string') {
			values[alias] = expandAliasValue(alias, entry);
		} else if (isStringArray(entry)) {
			values[alias] = entry;
		}
	}

	return values;
}

class SidebarState {
	constructor(private readonly page: Page) {}

	values(): Record<string, SidebarStateValue> {
		return decodeSidebarState(this.page.url());
	}

	/** The runs picked for Compare and Multiple. */
	selectedRunIds(): string[] {
		const selected = this.values()[SIDEBAR_ALIASES.runsSelected];

		return isStringArray(selected) ? selected : [];
	}

	async expectSelectedRunIds(runIds: readonly number[]): Promise<void> {
		const expected = runIds.map(String).sort();

		await expect
			.poll(() => [...this.selectedRunIds()].sort(), {
				timeout: 15_000,
				message: 'runs selected in the compressed sidebar state'
			})
			.toEqual(expected);
	}

	async expectNoSelection(): Promise<void> {
		await expect
			.poll(() => this.selectedRunIds(), {
				timeout: 15_000,
				message: 'runs selected in the compressed sidebar state'
			})
			.toEqual([]);
	}

	async expectAlias(
		alias: string,
		value: SidebarStateValue | null
	): Promise<void> {
		await expect
			.poll(() => this.values()[alias] ?? null, {
				timeout: 15_000,
				message: `compressed sidebar state "${alias}"`
			})
			.toEqual(value);
	}

	/** The address an alias remembers, for "return me where I left" scenarios. */
	async expectAliasCarries(alias: string, fragment: string): Promise<void> {
		await expect
			.poll(() => String(this.values()[alias] ?? ''), {
				timeout: 15_000,
				message: `compressed sidebar state "${alias}"`
			})
			.toContain(fragment);
	}

	/**
	 * A payload that no longer decodes at the version the app writes is a
	 * silent reset of everything the sidebar remembers.
	 */
	async expectVersion(): Promise<void> {
		await expect
			.poll(() => Object.keys(this.values()).length, {
				timeout: 15_000,
				message: 'compressed sidebar state should decode at the current version'
			})
			.toBeGreaterThan(0);
	}

	encodedLength(): number {
		return (
			new URL(this.page.url()).searchParams.get(SIDEBAR_STATE_PARAM)?.length ??
			0
		);
	}

	async expectWithinBudget(): Promise<void> {
		expect(this.encodedLength()).toBeLessThanOrEqual(SIDEBAR_STATE_MAX_LENGTH);
	}
}

function sidebarState(page: Page): SidebarState {
	return new SidebarState(page);
}

export {
	decodeSidebarState,
	SIDEBAR_ALIASES,
	SIDEBAR_STATE_MAX_LENGTH,
	SIDEBAR_STATE_PARAM,
	SIDEBAR_STATE_VERSION,
	SidebarState,
	sidebarState
};
