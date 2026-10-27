/* SPDX-License-Identifier: Apache-2.0 */
/* SPDX-FileCopyrightText: 2026 OKTET LTD */
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { TooltipProvider } from '@/shared/tailwind-ui';

import { ImportRunFormContainer } from './import-run-form.container';

const auth = vi.hoisted(() => ({ isAdmin: true }));
const api = vi.hoisted(() => ({ importRuns: vi.fn() }));
const tarUploads = vi.hoisted(() => ({
	uploads: [] as { id: string; file: File; status: string; progress: number }[],
	start: vi.fn()
}));

vi.mock('@/bublik/features/auth', () => ({ useAuth: () => auth }));

vi.mock('@/bublik/features/analytics', () => ({
	analyticsEventNames: {},
	trackEvent: vi.fn()
}));

vi.mock('@/services/bublik-api', () => ({
	bublikAPI: {
		useGetAllProjectsQuery: () => ({
			data: [{ id: 7, name: 'Project A' }],
			error: undefined,
			isLoading: false
		})
	},
	getUploadRunTarUrl: () => 'https://bublik.example/api/v2/importruns/upload/',
	useImportRunsMutation: () => [api.importRuns, { isLoading: false }]
}));

vi.mock('../import-events-table', async (importOriginal) => ({
	...(await importOriginal<typeof import('../import-events-table')>()),
	useImportLog: () => ({ toggle: vi.fn() })
}));

vi.mock('../import-run-upload/use-run-tar-uploads', () => ({
	useRunTarUploads: () => ({
		uploads: tarUploads.uploads,
		isUploading: false,
		addFiles: vi.fn(),
		remove: vi.fn(),
		reset: vi.fn(),
		start: tarUploads.start
	})
}));

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
	// Radix Select reaches for these, which jsdom lacks.
	Element.prototype.hasPointerCapture = () => false;
	Element.prototype.releasePointerCapture = () => undefined;
	Element.prototype.scrollIntoView = () => undefined;
});

beforeEach(() => {
	auth.isAdmin = true;
	tarUploads.uploads = [];
	tarUploads.start.mockReset().mockResolvedValue([]);
	api.importRuns.mockReset().mockReturnValue({
		unwrap: () => Promise.resolve([])
	});
});

const setup = () =>
	render(
		<MemoryRouter>
			<TooltipProvider>
				<ImportRunFormContainer />
			</TooltipProvider>
		</MemoryRouter>
	);

const open = async () => {
	setup();
	await userEvent.click(screen.getByRole('button', { name: 'Import' }));
	return screen.getByRole('dialog');
};

const pick = async (testId: string, option: string) => {
	await userEvent.click(
		within(screen.getByTestId(testId)).getByRole('combobox')
	);
	await userEvent.click(screen.getByRole('option', { name: option }));
};

describe('ImportRunFormContainer', () => {
	it('has one Import button, opening on log server URLs', async () => {
		setup();
		expect(
			screen.getAllByRole('button', { name: /^(Import|Upload)$/ })
		).toHaveLength(1);

		await userEvent.click(screen.getByRole('button', { name: 'Import' }));
		const dialog = screen.getByRole('dialog');

		expect(
			within(dialog).getByRole('tab', { name: 'Log server URLs' })
		).toHaveAttribute('aria-selected', 'true');
		expect(
			within(dialog).getByRole('textbox', { name: 'Log folder URL 1' })
		).toBeInTheDocument();
		expect(
			within(dialog).getByRole('button', { name: 'Import' })
		).toBeDisabled();
	});

	it('switches the body and the footer with the tabs', async () => {
		const dialog = await open();

		await userEvent.click(
			within(dialog).getByRole('tab', { name: 'Upload .tar' })
		);
		expect(within(dialog).getByTestId('file-dropzone')).toBeInTheDocument();
		expect(
			within(dialog).getByRole('button', { name: /upload and import/i })
		).toBeDisabled();

		await userEvent.click(
			within(dialog).getByRole('tab', { name: 'From a script' })
		);
		expect(
			within(dialog).getByTestId('curl-upload-command')
		).toBeInTheDocument();
		expect(
			within(dialog).getByRole('button', { name: 'Close' })
		).toBeInTheDocument();
		expect(
			within(dialog).queryByRole('button', {
				name: /^(Import|Upload and import)/
			})
		).toBeNull();
	});

	it('imports URLs into the picked project, forced, then shows the jobs', async () => {
		const dialog = await open();

		await pick('import-project', 'Project A');
		await userEvent.click(
			within(dialog).getByRole('checkbox', {
				name: 'Force import for all runs'
			})
		);
		await userEvent.type(
			within(dialog).getByRole('textbox', { name: 'Log folder URL 1' }),
			'https://example.test/run-1'
		);
		await userEvent.type(
			within(dialog).getByRole('textbox', { name: 'Log folder URL 2' }),
			'not a url'
		);
		expect(within(dialog).getByTestId('import-summary')).toHaveTextContent(
			'1 URL ready · 1 URL needs fixing'
		);
		await userEvent.click(
			within(dialog).getByRole('button', { name: 'Import' })
		);

		await waitFor(() => expect(api.importRuns).toHaveBeenCalledOnce());
		expect(api.importRuns).toHaveBeenCalledWith([
			{
				url: 'https://example.test/run-1',
				force: true,
				range: null,
				project: 7
			}
		]);
		expect(
			await within(dialog).findByText(
				'Scheduled runs will be imported in the background'
			)
		).toBeInTheDocument();

		await userEvent.click(
			within(dialog).getByRole('button', { name: 'Import more' })
		);
		expect(
			within(dialog).getByRole('textbox', { name: 'Log folder URL 1' })
		).toHaveValue('');
	});

	it('uploads with the same project and force, which the script tab follows', async () => {
		tarUploads.uploads = [
			{
				id: 'a',
				file: new File(['x'], 'te_logs.tar'),
				status: 'queued',
				progress: 0
			}
		];
		const dialog = await open();

		await userEvent.click(
			within(dialog).getByRole('tab', { name: 'Upload .tar' })
		);
		await pick('import-project', 'Project A');
		await userEvent.click(
			within(dialog).getByRole('checkbox', {
				name: 'Force import for all runs'
			})
		);
		expect(within(dialog).getByTestId('import-summary')).toHaveTextContent(
			'1 file ready'
		);

		await userEvent.click(
			within(dialog).getByRole('button', { name: /upload and import/i })
		);
		expect(tarUploads.start).toHaveBeenCalledWith({ project: 7, force: true });

		await userEvent.click(
			within(dialog).getByRole('tab', { name: 'From a script' })
		);
		expect(within(dialog).getByTestId('curl-upload-command')).toHaveTextContent(
			'-F project=7 -F force=true'
		);
	});

	it('shows only the URL form to non-admins, who cannot upload', async () => {
		auth.isAdmin = false;
		const dialog = await open();

		expect(within(dialog).queryByRole('tablist')).toBeNull();
		expect(
			within(dialog).getByRole('textbox', { name: 'Log folder URL 1' })
		).toBeInTheDocument();
	});
});
