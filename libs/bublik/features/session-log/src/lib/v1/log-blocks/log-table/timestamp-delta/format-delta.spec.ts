/* SPDX-License-Identifier: Apache-2.0 */
/* SPDX-FileCopyrightText: 2021-2023 OKTET Labs Ltd. */
import { describe, test, expect } from 'vitest';

import { formatDelta } from './timestamp-delta';

describe('format delta', () => {
	test('should display zero difference properly', () => {
		expect(formatDelta(0, 0)).toBe('00:00:00.0');
	});

	test('should display positive 100ms difference properly', () => {
		expect(formatDelta(0, 0.1)).toBe('+ 00:00:00.100');
	});

	test('should display negative 100ms difference properly', () => {
		expect(formatDelta(0.1, 0)).toBe('- 00:00:00.100');
	});

	test('should display positive seconds difference properly', () => {
		expect(formatDelta(0, 1)).toBe('+ 00:00:01.0');
	});

	test('should display negative seconds difference properly', () => {
		expect(formatDelta(1, 0)).toBe('- 00:00:01.0');
	});

	test('should display positive minutes difference properly', () => {
		expect(formatDelta(0, 60)).toBe('+ 00:01:00.0');
	});

	test('should display negative minutes difference properly', () => {
		expect(formatDelta(60, 0)).toBe('- 00:01:00.0');
	});

	test('should display positive hours difference properly', () => {
		expect(formatDelta(0, 3600)).toBe('+ 01:00:00.0');
	});

	test('should display negative hours difference properly', () => {
		expect(formatDelta(3600, 0)).toBe('- 01:00:00.0');
	});

	test('should display positive difference for', () => {
		expect(formatDelta(0, 4356.12)).toBe('+ 01:12:36.120');
	});

	test('should display negative difference for', () => {
		expect(formatDelta(4356.12, 0)).toBe('- 01:12:36.120');
	});
});
