/* SPDX-License-Identifier: Apache-2.0 */
/* SPDX-FileCopyrightText: 2026 OKTET LTD */
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeAll, describe, expect, it, vi } from 'vitest';

import { Dialog, TooltipProvider } from '@/shared/tailwind-ui';

import {
	CurlUploadGuide,
	formatSize,
	getCurlCommand,
	getWaitScript,
	ImportRunUploadForm
} from './import-run-upload.component';
import type { TarUpload } from './use-run-tar-uploads';

const UPLOAD_URL = 'https://bublik.example/api/v2/importruns/upload/';

// The highlighter loads asynchronously; the plain code shows until it does.
vi.mock('react-shiki', () => ({ useShikiHighlighter: () => null }));

beforeAll(() => {
	// useTheme reads the system theme.
	vi.stubGlobal(
		'matchMedia',
		vi.fn(() => ({
			matches: false,
			addEventListener: vi.fn(),
			removeEventListener: vi.fn()
		}))
	);
	vi.stubGlobal(
		'ResizeObserver',
		class ResizeObserver {
			observe = () => undefined;
			unobserve = () => undefined;
			disconnect = () => undefined;
		}
	);
});

const upload = (overrides: Partial<TarUpload> = {}): TarUpload => ({
	id: 'upload-1',
	file: new File(['x'.repeat(2048)], 'te_logs.tar'),
	status: 'queued',
	progress: 0,
	...overrides
});

const setup = (uploads: TarUpload[] = [], isUploading = false) => {
	const props = { onFiles: vi.fn(), onRemove: vi.fn() };
	render(
		<TooltipProvider>
			<Dialog open>
				<ImportRunUploadForm
					uploads={uploads}
					isUploading={isUploading}
					{...props}
				/>
			</Dialog>
		</TooltipProvider>
	);
	return props;
};

const setupGuide = (project: number | null = null, force = false) =>
	render(
		<MemoryRouter initialEntries={['/import?page=2']}>
			<TooltipProvider>
				<CurlUploadGuide
					uploadUrl={UPLOAD_URL}
					project={project}
					force={force}
				/>
			</TooltipProvider>
		</MemoryRouter>
	);

describe('ImportRunUploadForm', () => {
	it('passes dropped files on, split by extension', () => {
		const { onFiles } = setup();
		const files = [new File(['x'], 'a.tar'), new File(['x'], 'b.zip')];

		fireEvent.drop(screen.getByTestId('file-dropzone'), {
			dataTransfer: { files }
		});

		expect(onFiles).toHaveBeenCalledWith([files[0]], [files[1]]);
	});

	it('shows progress, per-file errors, and lets queued files be removed', async () => {
		const { onRemove } = setup([
			upload({ id: 'a', status: 'uploading', progress: 0.42 }),
			upload({
				id: 'b',
				file: new File(['x'], 'dup.tar'),
				status: 'error',
				error: 'these logs are already uploaded'
			})
		]);

		expect(screen.getByRole('progressbar')).toHaveAttribute(
			'aria-valuenow',
			'42'
		);
		expect(screen.getByText('Uploading 42%')).toBeInTheDocument();
		expect(
			screen.getByText('these logs are already uploaded')
		).toBeInTheDocument();

		await userEvent.click(
			screen.getByRole('button', { name: 'Remove dup.tar' })
		);
		expect(onRemove).toHaveBeenCalledWith('b');
		expect(
			screen.queryByRole('button', { name: 'Remove te_logs.tar' })
		).toBeNull();
	});
});

describe('CurlUploadGuide', () => {
	it('shows a curl command for this instance, taking the project from meta_data.json', () => {
		setupGuide();

		const command = screen.getByTestId('curl-upload-command');
		expect(command).toHaveTextContent(UPLOAD_URL);
		expect(command).toHaveTextContent('Authorization: Bearer $BUBLIK_TOKEN');
		expect(command).not.toHaveTextContent('-F project=');
	});

	it('puts the project and force into the curl command', () => {
		setupGuide(7, true);

		expect(screen.getByTestId('curl-upload-command')).toHaveTextContent(
			'-F file=@logs.tar -F project=7 -F force=true'
		);
	});

	it('copies the curl command', async () => {
		const user = userEvent.setup();
		setupGuide();

		await user.click(screen.getByRole('button', { name: 'Copy curl command' }));

		expect(await navigator.clipboard.readText()).toBe(
			getCurlCommand({ uploadUrl: UPLOAD_URL, project: null, force: false })
		);
	});

	it('links to the access tokens settings, keeping the page params', () => {
		setupGuide();

		const href = screen
			.getByRole('link', { name: 'Settings → Access Tokens' })
			.getAttribute('href');
		const params = new URL(href ?? '', 'http://x').searchParams;
		expect(params.get('settings-open')).toBe('1');
		expect(params.get('settings-tab')).toBe('tokens');
		expect(params.get('page')).toBe('2');
	});
});

describe('getCurlCommand', () => {
	it('keeps the token in an env var and the URL on its own line', () => {
		expect(
			getCurlCommand({ uploadUrl: UPLOAD_URL, project: 7, force: false })
		).toBe(
			[
				'curl -H "Authorization: Bearer $BUBLIK_TOKEN" \\',
				'  -F file=@logs.tar -F project=7 \\',
				`  ${UPLOAD_URL}`
			].join('\n')
		);
	});
});

describe('getWaitScript', () => {
	it('uploads, then polls the job on the same instance until it finishes', () => {
		const script = getWaitScript({
			uploadUrl: UPLOAD_URL,
			project: 7,
			force: true
		});

		expect(script).toContain(
			'job=$(curl -s -H "Authorization: Bearer $BUBLIK_TOKEN"'
		);
		expect(script).toContain('-F file=@logs.tar -F project=7 -F force=true');
		expect(script).toContain('| jq -r .job_id)');
		expect(script).toContain(
			'"https://bublik.example/api/v2/session_import/?job=$job"'
		);
		expect(script).toContain('SUCCESS|FAILURE) break');
	});
});

describe('formatSize', () => {
	it('uses readable units', () => {
		expect(formatSize(512)).toBe('512 B');
		expect(formatSize(2048)).toBe('2.0 KB');
		expect(formatSize(3 * 1024 ** 3)).toBe('3.0 GB');
	});
});
