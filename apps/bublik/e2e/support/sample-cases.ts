/* SPDX-License-Identifier: Apache-2.0 */
/* SPDX-FileCopyrightText: 2024-2026 OKTET LTD */
import { readManifest } from './manifest';
import type {
	Bundle,
	E2EManifest,
	ExpectedRun,
	IterationEntry
} from './manifest';

interface ProjectRun {
	project: string;
	runId: number;
}

interface SampleCase {
	label: string;
	runIndex: number;
	testName: string;
	testPath: string;
	sample: IterationEntry;
}

const labelsByCategory: Record<string, string> = {
	expectedPassed: 'Expected PASSED',
	unexpectedPassed: 'Unexpected PASSED',
	expectedFailed: 'Expected FAILED',
	unexpectedFailed: 'Unexpected FAILED',
	expectedSkipped: 'Expected SKIPPED',
	unexpectedSkipped: 'Unexpected SKIPPED',
	expectedKilled: 'Expected KILLED',
	expectedCored: 'Expected CORED',
	abnormal: 'ABNORMAL'
};

function sampleCases(bundle: Bundle): SampleCase[] {
	return bundle.expectedRuns.flatMap((expectedRun, runIndex) =>
		Object.entries(labelsByCategory).flatMap(([category, label]) =>
			(expectedRun.sampleTests[category] ?? []).slice(0, 1).map((sample) => ({
				label,
				runIndex,
				testName: sample.name || sample.pathStr,
				testPath: sample.pathStr || sample.path.join('/'),
				sample
			}))
		)
	);
}

function representativeRun(manifest: E2EManifest): {
	bundle: Bundle;
	expectedRun: ExpectedRun;
} {
	for (const bundle of manifest.bundles) {
		const expectedRun = bundle.expectedRuns[0];
		if (expectedRun) return { bundle, expectedRun };
	}

	throw new Error('Fixture manifest does not contain an expected run.');
}

function representativeNokRun(manifest: E2EManifest): {
	bundle: Bundle;
	expectedRun: ExpectedRun;
	sampleNames: string[];
} | null {
	for (const bundle of manifest.bundles) {
		for (const expectedRun of bundle.expectedRuns) {
			const sampleNames = Object.entries(expectedRun.sampleTests)
				.filter(
					([category]) =>
						category.startsWith('unexpected') || category === 'abnormal'
				)
				.flatMap(([, samples]) => samples)
				.map((sample) => sample.name || sample.pathStr)
				.filter(Boolean)
				.slice(0, 2);

			if (sampleNames.length) return { bundle, expectedRun, sampleNames };
		}
	}

	return null;
}

/**
 * Two imported runs sharing a dashboard date *and* a project, so a single
 * runs-page query lists both — what the selection popover, /compare and
 * /multiple scenarios need. The project has to match because the runs table is
 * scoped to the selected project.
 */
function runPairOnSameDate(manifest: E2EManifest): {
	date: string;
	project: string;
	bundles: [Bundle, Bundle];
} | null {
	const byDateAndProject = new Map<string, Bundle[]>();

	for (const bundle of manifest.bundles) {
		const date = bundle.expectedRuns[0]?.dashboardDate;
		if (!bundle.runId || !date) continue;

		const key = `${date} ${bundle.project}`;
		const bundles = byDateAndProject.get(key) ?? [];
		bundles.push(bundle);
		byDateAndProject.set(key, bundles);

		if (bundles.length >= 2) {
			return {
				date,
				project: bundle.project,
				bundles: [bundles[0], bundles[1]]
			};
		}
	}

	return null;
}

/**
 * Two imported runs on the same dashboard date but from *different* projects,
 * so selecting one project in the sidebar has to drop the other run from the
 * table.
 */
function runPairOnDifferentProjects(manifest: E2EManifest): {
	date: string;
	runs: [ProjectRun, ProjectRun];
} | null {
	const byDate = new Map<string, ProjectRun[]>();

	for (const bundle of manifest.bundles) {
		const date = bundle.expectedRuns[0]?.dashboardDate;
		if (!bundle.runId || !date) continue;

		const runs = byDate.get(date) ?? [];
		const other = runs.find((run) => run.project !== bundle.project);

		if (other) {
			return {
				date,
				runs: [other, { project: bundle.project, runId: bundle.runId }]
			};
		}

		runs.push({ project: bundle.project, runId: bundle.runId });
		byDate.set(date, runs);
	}

	return null;
}

/**
 * A project with imported runs on more than one dashboard date. "Today" is
 * resolved per project, so pressing it from an older day has to land on this
 * project's latest day — and only its runs.
 */
function projectSpanningDays(manifest: E2EManifest): {
	project: string;
	latestDate: string;
	latestRunIds: number[];
	earlierDate: string;
	earlierRunId: number;
} | null {
	const byProject = new Map<string, Map<string, number[]>>();

	for (const bundle of manifest.bundles) {
		const date = bundle.expectedRuns[0]?.dashboardDate;
		if (!bundle.runId || !date) continue;

		const dates = byProject.get(bundle.project) ?? new Map<string, number[]>();
		dates.set(date, [...(dates.get(date) ?? []), bundle.runId]);
		byProject.set(bundle.project, dates);
	}

	for (const [project, dates] of byProject) {
		if (dates.size < 2) continue;

		const sorted = [...dates.keys()].sort();
		const earlierDate = sorted[0];
		const latestDate = sorted[sorted.length - 1];

		return {
			project,
			latestDate,
			// Capped: the step shows that the day switched, it does not enumerate
			// everything the lab ran that day.
			latestRunIds: (dates.get(latestDate) ?? []).slice(0, 3),
			earlierDate,
			earlierRunId: (dates.get(earlierDate) ?? [])[0]
		};
	}

	return null;
}

interface HistoryProject {
	project: string;
	testPath: string;
	runIds: number[];
}

/**
 * Every sampled test path of a project that has imported runs, paired with
 * those run ids. The fixtures give each project its own test suite
 * (`example-ci/*`, `net-drv-ts/*`, `dpdk-ethdev-ts/*`), so a path is proof of
 * which project a history row came from.
 */
function historyProjects(manifest: E2EManifest): HistoryProject[] {
	const byProject = new Map<
		string,
		{ counts: Map<string, number>; runIds: number[] }
	>();

	for (const bundle of manifest.bundles) {
		if (!bundle.runId) continue;

		const entry = byProject.get(bundle.project) ?? {
			counts: new Map<string, number>(),
			runIds: []
		};
		entry.runIds.push(bundle.runId);

		for (const expectedRun of bundle.expectedRuns) {
			for (const samples of Object.values(expectedRun.sampleTests)) {
				for (const sample of samples) {
					const path = sample.pathStr || sample.path.join('/');
					// Prologues and epilogues are session bookkeeping, not a test an
					// engineer would ever ask the history of.
					if (!path || /\/(?:prologue|epilogue)$/.test(path)) continue;

					entry.counts.set(path, (entry.counts.get(path) ?? 0) + 1);
				}
			}
		}

		byProject.set(bundle.project, entry);
	}

	return [...byProject]
		.map(([project, entry]) => ({
			project,
			// The most sampled path is the one with the richest history, which the
			// pagination and grouping scenarios need.
			testPath: [...entry.counts]
				.sort(([, a], [, b]) => b - a)
				.map(([path]) => path)[0],
			runIds: entry.runIds
		}))
		.filter((entry): entry is HistoryProject => Boolean(entry.testPath));
}

/**
 * A date range that spans every fixture run, padded by a day on each side. The
 * search form defaults to the last three months, which on a seeded instance
 * whose fixtures are dated in the past would answer every query with nothing —
 * so scenarios about results have to state the range explicitly.
 */
function historyDateRange(manifest: E2EManifest): {
	startDate: string;
	finishDate: string;
} {
	const dates = manifest.bundles
		.map((bundle) => bundle.expectedRuns[0]?.dashboardDate || bundle.date)
		.filter(Boolean)
		.sort();

	if (!dates.length) {
		throw new Error('Fixture manifest does not contain a dated run.');
	}

	return {
		startDate: shiftDate(dates[0], -1),
		finishDate: shiftDate(dates[dates.length - 1], 1)
	};
}

function shiftDate(date: string, days: number): string {
	const shifted = new Date(`${date}T00:00:00Z`);
	shifted.setUTCDate(shifted.getUTCDate() + days);

	return shifted.toISOString().slice(0, 10);
}

function historyTestPathForProject(
	manifest: E2EManifest,
	project: string
): string | null {
	return (
		historyProjects(manifest).find((entry) => entry.project === project)
			?.testPath ?? null
	);
}

/**
 * Two projects whose test paths do not overlap, so selecting one in the sidebar
 * has to leave the other project's path without any history results.
 */
function historyProjectPair(manifest: E2EManifest): {
	selected: HistoryProject;
	other: HistoryProject;
} | null {
	const projects = historyProjects(manifest);

	for (const selected of projects) {
		const other = projects.find(
			(candidate) =>
				candidate.project !== selected.project &&
				candidate.testPath !== selected.testPath
		);

		if (other) return { selected, other };
	}

	return null;
}

/**
 * A test path whose results carry measurements — what the trend, series and
 * stacked chart modes need to render anything at all.
 */
function historyMeasurementTestPath(manifest: E2EManifest): {
	project: string;
	testPath: string;
} | null {
	for (const bundle of manifest.bundles) {
		if (!bundle.runId) continue;

		for (const expectedRun of bundle.expectedRuns) {
			for (const samples of Object.values(expectedRun.sampleTests)) {
				for (const sample of samples) {
					if (!sample.measurements?.length) continue;

					return {
						project: bundle.project,
						testPath: sample.pathStr || sample.path.join('/')
					};
				}
			}
		}
	}

	return null;
}

/**
 * A run that a test may mutate (mark compromised, comment on) without
 * disturbing any other spec.
 *
 * `representativeRun` takes the FIRST bundle and `representativeNokRun` the
 * first one with unexpected results, so picking the LAST healthy bundle of the
 * representative run's project can never collide with either. Preferring the
 * latest date also keeps the run on the dashboard's default window, which the
 * compromised scenario needs.
 */
function mutableRun(manifest: E2EManifest): {
	bundle: Bundle;
	expectedRun: ExpectedRun;
} | null {
	const { bundle: representative } = representativeRun(manifest);

	const candidates = manifest.bundles.filter(
		(bundle) =>
			bundle.runId &&
			bundle.project === representative.project &&
			bundle.conclusionSpec === 'ok' &&
			bundle.id !== representative.id &&
			bundle.expectedRuns[0]
	);

	const latest = candidates.reduce<Bundle | null>((best, bundle) => {
		if (!best) return bundle;
		return bundle.date >= best.date ? bundle : best;
	}, null);

	if (!latest) return null;

	return { bundle: latest, expectedRun: latest.expectedRuns[0] };
}

/**
 * The NOK counter on the dashboard and the runs table is the backend's
 * `unexpected` stat: every result carrying an "err" meta. In the fixture
 * manifest those are the `unexpected*` matrix entries plus `abnormal`.
 */
function expectedNokCount(expectedRun: ExpectedRun): number {
	return Object.entries(expectedRun.expectedMatrix)
		.filter(
			([category]) =>
				category.startsWith('unexpected') || category === 'abnormal'
		)
		.reduce((total, [, count]) => total + count, 0);
}

function firstHistoryTestPath(fallback = 'net-drv-ts/rx_path/rx_fcs'): string {
	const manifest = readManifest();

	for (const bundle of manifest.bundles) {
		for (const run of bundle.expectedRuns) {
			const failed =
				run.sampleTests.expectedFailed || run.sampleTests.unexpectedFailed;
			if (failed && failed.length > 0) {
				return failed[0].pathStr || failed[0].path.join('/');
			}

			const passed =
				run.sampleTests.expectedPassed || run.sampleTests.unexpectedPassed;
			if (passed && passed.length > 0) {
				return passed[0].pathStr || passed[0].path.join('/');
			}
		}
	}

	return fallback;
}

export {
	expectedNokCount,
	firstHistoryTestPath,
	historyDateRange,
	historyMeasurementTestPath,
	historyProjectPair,
	historyProjects,
	historyTestPathForProject,
	mutableRun,
	projectSpanningDays,
	representativeNokRun,
	representativeRun,
	runPairOnDifferentProjects,
	runPairOnSameDate,
	sampleCases
};
export type { HistoryProject, ProjectRun, SampleCase };
