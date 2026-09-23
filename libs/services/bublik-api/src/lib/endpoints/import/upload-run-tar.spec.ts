/* SPDX-License-Identifier: Apache-2.0 */
/* SPDX-FileCopyrightText: 2026 OKTET LTD */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
	getUploadErrorMessage,
	uploadRunTar,
	UploadRunTarError
} from './upload-run-tar';

type Listener = ((event: ProgressEvent) => void) | null;

class FakeXhr {
	static last: FakeXhr;
	method = '';
	url = '';
	withCredentials = false;
	status = 0;
	responseText = '';
	body: FormData | null = null;
	headers: Record<string, string> = {};
	upload: { onprogress: Listener } = { onprogress: null };
	onload: (() => void) | null = null;
	onerror: (() => void) | null = null;
	onabort: (() => void) | null = null;

	constructor() {
		FakeXhr.last = this;
	}

	open(method: string, url: string) {
		this.method = method;
		this.url = url;
	}

	setRequestHeader(name: string, value: string) {
		this.headers[name] = value;
	}

	send(body: FormData) {
		this.body = body;
	}

	abort() {
		this.onabort?.();
	}

	respond(status: number, body: unknown) {
		this.status = status;
		this.responseText = typeof body === 'string' ? body : JSON.stringify(body);
		this.onload?.();
	}
}

const tar = () => new File(['tar'], 'te_logs.tar');

const RESPONSE = {
	job_id: 3,
	job_tasks_data: [
		{
			run_source_url: 's3://bublik-logs/uploads/ts/2026/09/23/cfg-10:00:00/',
			celery_task_id: 'task-1',
			flower: null,
			import_log: null
		}
	],
	url: 's3://bublik-logs/uploads/ts/2026/09/23/cfg-10:00:00/'
};

describe('uploadRunTar', () => {
	beforeEach(() => {
		vi.stubGlobal('XMLHttpRequest', FakeXhr);
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it('posts the file, project and force as multipart with credentials', async () => {
		const onProgress = vi.fn();
		const promise = uploadRunTar({
			file: tar(),
			project: 7,
			force: true,
			onProgress
		});
		const xhr = FakeXhr.last;

		expect(xhr.method).toBe('POST');
		expect(xhr.url).toMatch(/\/api\/v2\/importruns\/upload\/$/);
		expect(xhr.withCredentials).toBe(true);
		expect((xhr.body?.get('file') as File).name).toBe('te_logs.tar');
		expect(xhr.body?.get('project')).toBe('7');
		expect(xhr.body?.get('force')).toBe('true');

		xhr.upload.onprogress?.({
			lengthComputable: true,
			loaded: 5,
			total: 10
		} as ProgressEvent);
		expect(onProgress).toHaveBeenCalledWith(0.5);

		xhr.respond(200, RESPONSE);
		await expect(promise).resolves.toEqual(RESPONSE);
		expect(onProgress).toHaveBeenLastCalledWith(1);
	});

	it('leaves out an absent project and force', () => {
		void uploadRunTar({ file: tar() }).catch(() => undefined);
		expect(FakeXhr.last.body?.has('project')).toBe(false);
		expect(FakeXhr.last.body?.has('force')).toBe(false);
	});

	it('rejects with the backend message and status', async () => {
		const promise = uploadRunTar({ file: tar() });
		FakeXhr.last.respond(409, { message: 'these logs are already uploaded' });

		await expect(promise).rejects.toMatchObject({
			name: 'UploadRunTarError',
			status: 409,
			message: 'these logs are already uploaded'
		});
	});

	it('rejects on network errors and aborts', async () => {
		const failed = uploadRunTar({ file: tar() });
		FakeXhr.last.onerror?.();
		await expect(failed).rejects.toBeInstanceOf(UploadRunTarError);

		const controller = new AbortController();
		const aborted = uploadRunTar({ file: tar(), signal: controller.signal });
		controller.abort();
		await expect(aborted).rejects.toMatchObject({
			message: 'Upload cancelled'
		});
	});
});

describe('getUploadErrorMessage', () => {
	it('reads every error shape Bublik answers with', () => {
		expect(getUploadErrorMessage({ message: 'invalid tarball' }, 400)).toBe(
			'invalid tarball'
		);
		expect(
			getUploadErrorMessage({ messages: ['Not Authenticated'] }, 403)
		).toBe('Not Authenticated');
		expect(
			getUploadErrorMessage(
				{ messages: { project: ['Project 9 does not exist'] } },
				400
			)
		).toBe('project: Project 9 does not exist');
		expect(
			getUploadErrorMessage('<html>Request Entity Too Large</html>', 413)
		).toContain('Request Entity Too Large');
		expect(getUploadErrorMessage(undefined, 413)).toBe(
			'The tarball is larger than Bublik accepts'
		);
		expect(getUploadErrorMessage(undefined, 0)).toMatch(/Network error/);
	});
});
