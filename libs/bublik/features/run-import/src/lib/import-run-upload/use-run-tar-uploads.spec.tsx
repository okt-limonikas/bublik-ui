/* SPDX-License-Identifier: Apache-2.0 */
/* SPDX-FileCopyrightText: 2026 OKTET LTD */
import { PropsWithChildren } from 'react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { UploadRunTarError } from '@/services/bublik-api';

import { useRunTarUploads } from './use-run-tar-uploads';

const { uploadRunTar, refetchMe } = vi.hoisted(() => ({
	uploadRunTar: vi.fn(),
	refetchMe: vi.fn()
}));

vi.mock('@/services/bublik-api', async (importOriginal) => {
	const original = await importOriginal<
		typeof import('@/services/bublik-api')
	>();
	return {
		...original,
		uploadRunTar,
		bublikAPI: {
			...original.bublikAPI,
			useLazyMeQuery: () => [refetchMe],
			util: {
				...original.bublikAPI.util,
				invalidateTags: (tags: unknown) => ({ type: 'test/invalidate', tags })
			}
		}
	};
});

const response = (url: string) => ({ job_id: 1, job_tasks_data: [], url });

const setup = () => {
	const actions: { type: string }[] = [];
	const store = configureStore({
		reducer: (state = null, action) => {
			actions.push(action);
			return state;
		}
	});
	const wrapper = ({ children }: PropsWithChildren) => (
		<Provider store={store}>{children}</Provider>
	);
	const hook = renderHook(() => useRunTarUploads(), { wrapper });
	return { hook, actions };
};

describe('useRunTarUploads', () => {
	beforeEach(() => {
		uploadRunTar.mockReset();
		refetchMe.mockReset();
	});

	it('uploads queued files one at a time and refreshes import events', async () => {
		uploadRunTar
			.mockResolvedValueOnce(response('s3://b/a/'))
			.mockResolvedValueOnce(response('s3://b/b/'));
		const { hook, actions } = setup();

		act(() =>
			hook.result.current.addFiles([
				new File(['a'], 'a.tar'),
				new File(['b'], 'b.tar')
			])
		);
		let responses: unknown[] = [];
		await act(async () => {
			responses = await hook.result.current.start({ project: 7, force: false });
		});

		expect(responses).toHaveLength(2);
		expect(
			uploadRunTar.mock.calls.map(([args]) => [args.file.name, args.project])
		).toEqual([
			['a.tar', 7],
			['b.tar', 7]
		]);
		expect(hook.result.current.uploads.map((u) => u.status)).toEqual([
			'done',
			'done'
		]);
		expect(actions.filter((a) => a.type === 'test/invalidate')).toHaveLength(2);
	});

	it('ignores a file that is already in the list', () => {
		const { hook } = setup();
		const file = new File(['a'], 'a.tar');
		act(() => hook.result.current.addFiles([file]));
		act(() => hook.result.current.addFiles([new File(['a'], 'a.tar')]));
		expect(hook.result.current.uploads).toHaveLength(1);
	});

	it('refreshes an expired session and retries once', async () => {
		uploadRunTar
			.mockRejectedValueOnce(
				new UploadRunTarError('Not Authenticated', 403, {
					messages: ['Not Authenticated']
				})
			)
			.mockResolvedValueOnce(response('s3://b/a/'));
		const { hook } = setup();

		act(() => hook.result.current.addFiles([new File(['a'], 'a.tar')]));
		await act(async () => {
			await hook.result.current.start({ project: null, force: false });
		});

		expect(refetchMe).toHaveBeenCalledTimes(1);
		expect(uploadRunTar).toHaveBeenCalledTimes(2);
		expect(hook.result.current.uploads[0].status).toBe('done');
	});

	it('keeps going after a failed file and reports its error', async () => {
		uploadRunTar
			.mockRejectedValueOnce(new UploadRunTarError('already uploaded', 409))
			.mockResolvedValueOnce(response('s3://b/b/'));
		const { hook } = setup();

		act(() =>
			hook.result.current.addFiles([
				new File(['a'], 'a.tar'),
				new File(['b'], 'b.tar')
			])
		);
		let responses: unknown[] = [];
		await act(async () => {
			responses = await hook.result.current.start({
				project: null,
				force: false
			});
		});

		expect(refetchMe).not.toHaveBeenCalled();
		expect(responses).toHaveLength(1);
		expect(hook.result.current.uploads.map((u) => [u.status, u.error])).toEqual(
			[
				['error', 'already uploaded'],
				['done', undefined]
			]
		);
	});
});
