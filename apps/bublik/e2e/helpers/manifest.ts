/* SPDX-License-Identifier: Apache-2.0 */
/* SPDX-FileCopyrightText: 2024-2026 OKTET LTD */
import { readFileSync } from 'fs';
import path from 'path';

interface SampleTest {
	name: string;
	tin: unknown;
	path: string[];
	pathStr: string;
	status: string;
	expectedStatus: string;
	unexpected: boolean;
	verdicts: unknown[];
	artifacts: unknown[];
	measurements: unknown[];
}

interface ExpectedMatrix {
	expectedPassed: number;
	unexpectedPassed: number;
	expectedFailed: number;
	unexpectedFailed: number;
	expectedSkipped: number;
	unexpectedSkipped: number;
	expectedKilled: number;
	unexpectedKilled: number;
	expectedCored: number;
	unexpectedCored: number;
	abnormal: number;
}

interface ExpectedRun {
	name: string;
	dashboardDate: string;
	iterationCount: number;
	expectedMatrix: ExpectedMatrix;
	sampleTests: Record<string, SampleTest[]>;
}

interface BundleEntry {
	id: string;
	importUrl: string;
	project: string;
	e2eRunId: string;
	runId?: number;
	expectedRuns: ExpectedRun[];
}

interface E2eManifest {
	version: number;
	baseUrl: string;
	uiBaseUrl: string;
	bundles: BundleEntry[];
}

let _manifest: E2eManifest | null = null;

function resolveManifestPath(): string {
	if (process.env['BUBLIK_E2E_RUN_OVERVIEW']) {
		return path.resolve(process.env['BUBLIK_E2E_RUN_OVERVIEW']);
	}
	const cwd = process.cwd();
	return path.resolve(cwd, '..', '..', '.e2e', 'e2e-manifest.json');
}

export function readManifest(): E2eManifest | null {
	if (_manifest) return _manifest;

	const manifestPath = resolveManifestPath();

	try {
		const raw = readFileSync(manifestPath, 'utf-8');
		_manifest = JSON.parse(raw) as E2eManifest;
		return _manifest;
	} catch {
		return null;
	}
}

export type {
	E2eManifest,
	BundleEntry,
	ExpectedRun,
	ExpectedMatrix,
	SampleTest
};
