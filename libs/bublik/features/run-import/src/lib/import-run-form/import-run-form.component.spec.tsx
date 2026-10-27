/* SPDX-License-Identifier: Apache-2.0 */
/* SPDX-FileCopyrightText: 2024-2026 OKTET LTD */
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeAll, describe, expect, it, vi } from 'vitest';

import { Dialog, TooltipProvider } from '@/shared/tailwind-ui';

import { ImportRunForm } from './import-run-form.component';

beforeAll(() => {
	vi.stubGlobal(
		'ResizeObserver',
		class ResizeObserver {
			observe = () => undefined;
			unobserve = () => undefined;
			disconnect = () => undefined;
		}
	);
});

const setup = (project: number | null = null, force = false) => {
	const onImportRunsSubmit = vi.fn();
	const onStatsChange = vi.fn();
	const user = userEvent.setup();

	render(
		<TooltipProvider>
			<Dialog open>
				<ImportRunForm
					id="import-form"
					project={project}
					force={force}
					onImportRunsSubmit={onImportRunsSubmit}
					onStatsChange={onStatsChange}
				/>
				{/* The dialog's footer holds the submit, outside the form. */}
				<button type="submit" form="import-form">
					Import
				</button>
			</Dialog>
		</TooltipProvider>
	);

	return { onImportRunsSubmit, onStatsChange, user };
};

const urlInputs = () =>
	screen.getAllByRole('textbox', { name: /^Log folder URL/ });

describe('ImportRunForm', () => {
	it('keeps one empty row last, growing as rows are filled', async () => {
		const { user } = setup();
		expect(urlInputs()).toHaveLength(1);

		await user.type(urlInputs()[0], 'https://example.test/run-1');
		expect(urlInputs()).toHaveLength(2);
		expect(urlInputs()[1]).toHaveValue('');

		await user.click(screen.getByRole('button', { name: 'Remove row 1' }));
		expect(urlInputs()).toHaveLength(1);
	});

	it('imports every filled row into the given project, forced', async () => {
		const { onImportRunsSubmit, user } = setup(7, true);

		await user.type(urlInputs()[0], 'https://example.test/run-1');
		await user.type(urlInputs()[1], 'https://example.test/run-2');
		await user.click(screen.getByRole('button', { name: 'Import' }));

		await waitFor(() => expect(onImportRunsSubmit).toHaveBeenCalledOnce());
		expect(onImportRunsSubmit).toHaveBeenCalledWith({
			runs: [
				{
					url: 'https://example.test/run-1',
					force: true,
					range: null,
					project: 7
				},
				{
					url: 'https://example.test/run-2',
					force: true,
					range: null,
					project: 7
				}
			]
		});
	});

	it('adds a row per pasted URL, keeping their force and dates', async () => {
		const { onImportRunsSubmit, user } = setup();

		await user.click(urlInputs()[0]);
		await user.paste(
			'https://example.test/run-1?force=true\nhttps://example.test/logs/?from=2022-11-01&to=2022-11-14'
		);

		expect(
			urlInputs().map((input) => (input as HTMLInputElement).value)
		).toEqual(['https://example.test/run-1', 'https://example.test/logs/', '']);
		expect(
			screen.getByRole('button', {
				name: /^Dates of row 2: Nov 01 – Nov 14, 2022$/
			})
		).toBeInTheDocument();

		await user.click(screen.getByRole('button', { name: 'Import' }));

		await waitFor(() => expect(onImportRunsSubmit).toHaveBeenCalledOnce());
		const [{ runs }] = onImportRunsSubmit.mock.calls[0];
		expect(runs.map((run: { force: boolean }) => run.force)).toEqual([
			true,
			false
		]);
		expect(runs[1].range).not.toBeNull();
	});

	it('tags s3:// rows', async () => {
		const { user } = setup();

		await user.type(urlInputs()[0], 's3://bublik-logs/uploads/my-ts/');
		expect(screen.getByText('S3')).toBeInTheDocument();
	});

	it('flags text that is not a URL once the row is left, and counts rows', async () => {
		const { onStatsChange, user } = setup();

		await user.type(urlInputs()[0], 'example.test/run-1');
		expect(screen.queryByText(/Enter the full URL/)).toBeNull();

		await user.tab();
		expect(screen.getByText(/Enter the full URL/)).toBeInTheDocument();
		expect(urlInputs()[0]).toHaveAttribute('aria-invalid', 'true');
		expect(onStatsChange).toHaveBeenLastCalledWith({ ready: 0, invalid: 1 });

		await user.clear(urlInputs()[0]);
		await user.type(urlInputs()[0], 'https://example.test/run-1');
		expect(onStatsChange).toHaveBeenLastCalledWith({ ready: 1, invalid: 0 });
	});
});
