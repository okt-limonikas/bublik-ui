/* SPDX-License-Identifier: Apache-2.0 */
/* SPDX-FileCopyrightText: 2026 OKTET LTD */
import {
	ImportUploadResponse,
	ImportUploadResponseSchema
} from '@/shared/types';

import { getAPIConfig, withApiV2 } from '../../config';

export type UploadRunTarArgs = {
	file: File;
	/** Project id; without it the backend uses the tarball's PROJECT meta */
	project?: number | null;
	force?: boolean;
	/** Upload progress, from 0 to 1 */
	onProgress?: (fraction: number) => void;
	signal?: AbortSignal;
};

/** A failed upload: `status` is the HTTP status (0 for a network error) */
export class UploadRunTarError extends Error {
	constructor(
		message: string,
		readonly status: number,
		readonly data?: unknown
	) {
		super(message);
		this.name = 'UploadRunTarError';
	}
}

export const UPLOAD_RUN_TAR_URL = withApiV2('/importruns/upload');

/** The upload endpoint's URL, relative to the app's root URL */
const uploadRunTarUrl = () => `${getAPIConfig().baseUrl}${UPLOAD_RUN_TAR_URL}`;

/** The upload endpoint's absolute URL, e.g. for a curl example */
export const getUploadRunTarUrl = () =>
	new URL(uploadRunTarUrl(), window.location.origin).href;

function flattenMessages(value: unknown): string[] {
	if (typeof value === 'string') return [value];
	if (Array.isArray(value)) return value.flatMap(flattenMessages);
	if (value && typeof value === 'object') {
		return Object.entries(value).flatMap(([field, messages]) =>
			flattenMessages(messages).map((message) =>
				field === 'non_field_errors' ? message : `${field}: ${message}`
			)
		);
	}
	return [];
}

/** The message a Bublik error response carries, whatever its shape */
export function getUploadErrorMessage(data: unknown, status: number): string {
	if (data && typeof data === 'object') {
		const { message, messages, detail } = data as Record<string, unknown>;
		const found = flattenMessages(message ?? messages ?? detail);
		if (found.length) return found.join('\n');
	}
	if (typeof data === 'string' && data.trim()) return data.trim();
	if (status === 0) return 'Network error: the upload did not reach Bublik';
	if (status === 413) return 'The tarball is larger than Bublik accepts';
	return `Upload failed with HTTP ${status}`;
}

function parseBody(xhr: XMLHttpRequest): unknown {
	if (!xhr.responseText) return undefined;
	try {
		return JSON.parse(xhr.responseText);
	} catch {
		return xhr.responseText;
	}
}

/**
 * Upload a TE log tarball to `POST /api/v2/importruns/upload/`.
 *
 * Uses XMLHttpRequest rather than RTK Query's fetch: fetch cannot report
 * upload progress, and the base query's auth retry would resend the whole
 * file. Callers handle an expired session themselves (see `status`).
 */
export function uploadRunTar({
	file,
	project,
	force,
	onProgress,
	signal
}: UploadRunTarArgs): Promise<ImportUploadResponse> {
	const body = new FormData();
	body.append('file', file, file.name);
	if (project != null) body.append('project', String(project));
	if (force) body.append('force', 'true');

	return new Promise((resolve, reject) => {
		const xhr = new XMLHttpRequest();
		xhr.open('POST', uploadRunTarUrl());
		xhr.withCredentials = true;
		xhr.setRequestHeader('Accept', 'application/json');

		xhr.upload.onprogress = (event) => {
			if (event.lengthComputable) onProgress?.(event.loaded / event.total);
		};

		xhr.onload = () => {
			const data = parseBody(xhr);
			if (xhr.status < 200 || xhr.status >= 300) {
				reject(
					new UploadRunTarError(
						getUploadErrorMessage(data, xhr.status),
						xhr.status,
						data
					)
				);
				return;
			}
			const parsed = ImportUploadResponseSchema.safeParse(data);
			if (!parsed.success) {
				reject(
					new UploadRunTarError(
						'Unexpected response from Bublik',
						xhr.status,
						data
					)
				);
				return;
			}
			onProgress?.(1);
			resolve(parsed.data);
		};
		xhr.onerror = () => {
			reject(new UploadRunTarError(getUploadErrorMessage(undefined, 0), 0));
		};
		xhr.onabort = () => {
			reject(new UploadRunTarError('Upload cancelled', 0));
		};

		if (signal) {
			if (signal.aborted) {
				xhr.abort();
				return;
			}
			signal.addEventListener('abort', () => xhr.abort(), { once: true });
		}

		xhr.send(body);
	});
}
