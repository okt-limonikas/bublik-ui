/* SPDX-License-Identifier: Apache-2.0 */
/* SPDX-FileCopyrightText: 2026 OKTET LTD */
import { useCallback, useRef, useState } from 'react';
import { useDispatch } from 'react-redux';

import {
	BUBLIK_TAG,
	bublikAPI,
	isNotAuthenticatedError,
	uploadRunTar,
	UploadRunTarArgs,
	UploadRunTarError
} from '@/services/bublik-api';
import { ImportUploadResponse } from '@/shared/types';

export type TarUploadStatus = 'queued' | 'uploading' | 'done' | 'error';

export type TarUpload = {
	id: string;
	file: File;
	status: TarUploadStatus;
	/** Upload progress, from 0 to 1 */
	progress: number;
	error?: string;
	response?: ImportUploadResponse;
};

export type TarUploadOptions = {
	project: number | null;
	force: boolean;
};

let nextUploadId = 0;

const toUpload = (file: File): TarUpload => ({
	id: `upload-${nextUploadId++}`,
	file,
	status: 'queued',
	progress: 0
});

const isSessionExpired = (error: unknown) =>
	error instanceof UploadRunTarError &&
	isNotAuthenticatedError({ status: error.status, data: error.data });

/**
 * Uploads TE log tarballs one at a time, tracking each file's progress.
 *
 * An upload rejected as "Not Authenticated" refreshes the session through the
 * API's shared refresh (by refetching `me`) and is retried once.
 */
export function useRunTarUploads() {
	const dispatch = useDispatch();
	// Refetching `me` goes through the base query's shared silent refresh.
	const [refetchMe] = bublikAPI.useLazyMeQuery();
	const [uploads, setUploads] = useState<TarUpload[]>([]);
	const [isUploading, setIsUploading] = useState(false);
	const abortRef = useRef<AbortController | null>(null);

	const update = useCallback((id: string, patch: Partial<TarUpload>) => {
		setUploads((current) =>
			current.map((upload) =>
				upload.id === id ? { ...upload, ...patch } : upload
			)
		);
	}, []);

	const addFiles = useCallback((files: File[]) => {
		setUploads((current) => {
			const known = new Set(
				current.map((u) => `${u.file.name}:${u.file.size}`)
			);
			const added = files.filter((f) => !known.has(`${f.name}:${f.size}`));
			return [...current, ...added.map(toUpload)];
		});
	}, []);

	const remove = useCallback((id: string) => {
		setUploads((current) => current.filter((upload) => upload.id !== id));
	}, []);

	const reset = useCallback(() => {
		abortRef.current?.abort();
		setUploads([]);
	}, []);

	const uploadOnce = useCallback(
		async (args: UploadRunTarArgs) => {
			try {
				return await uploadRunTar(args);
			} catch (error) {
				if (!isSessionExpired(error)) throw error;
				await refetchMe();
				return uploadRunTar(args);
			}
		},
		[refetchMe]
	);

	/** Upload every queued (or failed) file; resolves with the successful responses */
	const start = useCallback(
		async ({ project, force }: TarUploadOptions) => {
			const pending = uploads.filter(
				(u) => u.status === 'queued' || u.status === 'error'
			);
			const responses: ImportUploadResponse[] = [];
			const controller = new AbortController();
			abortRef.current = controller;
			setIsUploading(true);

			try {
				for (const upload of pending) {
					if (controller.signal.aborted) break;
					update(upload.id, {
						status: 'uploading',
						progress: 0,
						error: undefined
					});
					try {
						const response = await uploadOnce({
							file: upload.file,
							project,
							force,
							signal: controller.signal,
							onProgress: (progress) => update(upload.id, { progress })
						});
						responses.push(response);
						update(upload.id, { status: 'done', progress: 1, response });
						dispatch(bublikAPI.util.invalidateTags([BUBLIK_TAG.importEvents]));
					} catch (error) {
						update(upload.id, {
							status: 'error',
							error: error instanceof Error ? error.message : 'Upload failed'
						});
					}
				}
			} finally {
				setIsUploading(false);
				abortRef.current = null;
			}

			return responses;
		},
		[dispatch, update, uploadOnce, uploads]
	);

	return { uploads, isUploading, addFiles, remove, reset, start };
}
