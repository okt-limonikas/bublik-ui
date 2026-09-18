/* SPDX-License-Identifier: Apache-2.0 */
/* SPDX-FileCopyrightText: 2024-2026 OKTET LTD */
import { describe, expect, it, vi } from 'vitest';

import {
	isLoginPromptOpen,
	requestLogin,
	resolveLogin,
	subscribeLoginPrompt
} from './login-prompt';

describe('login prompt', () => {
	it('shares one prompt between concurrent callers', async () => {
		const listener = vi.fn();
		const unsubscribe = subscribeLoginPrompt(listener);

		const first = requestLogin();
		const second = requestLogin();

		expect(first).toBe(second);
		expect(isLoginPromptOpen()).toBe(true);

		resolveLogin(true);

		await expect(Promise.all([first, second])).resolves.toEqual([true, true]);
		expect(isLoginPromptOpen()).toBe(false);
		// opened once, closed once
		expect(listener).toHaveBeenCalledTimes(2);

		unsubscribe();
	});

	it('opens a fresh prompt after the previous one was dismissed', async () => {
		const dismissed = requestLogin();
		resolveLogin(false);
		await expect(dismissed).resolves.toBe(false);

		const next = requestLogin();
		expect(next).not.toBe(dismissed);
		resolveLogin(true);
		await expect(next).resolves.toBe(true);
	});

	it('ignores resolve without an open prompt', () => {
		expect(() => resolveLogin(true)).not.toThrow();
		expect(isLoginPromptOpen()).toBe(false);
	});
});
