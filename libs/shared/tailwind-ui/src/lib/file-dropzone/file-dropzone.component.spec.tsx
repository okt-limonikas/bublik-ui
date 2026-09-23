/* SPDX-License-Identifier: Apache-2.0 */
/* SPDX-FileCopyrightText: 2026 OKTET LTD */
import { fireEvent, render, screen } from '@testing-library/react';

import {
	FileDropzone,
	partitionFilesByExtension
} from './file-dropzone.component';

const file = (name: string) => new File(['x'], name);

describe('partitionFilesByExtension', () => {
	it('accepts matching extensions case-insensitively', () => {
		const { accepted, rejected } = partitionFilesByExtension(
			[
				file('te_logs.tar'),
				file('RUN.TAR'),
				file('log.tar.gz'),
				file('notes.txt')
			],
			['.tar']
		);

		expect(accepted.map((f) => f.name)).toEqual(['te_logs.tar', 'RUN.TAR']);
		expect(rejected.map((f) => f.name)).toEqual(['log.tar.gz', 'notes.txt']);
	});

	it('accepts everything without extensions', () => {
		const files = [file('a.bin')];
		expect(partitionFilesByExtension(files).accepted).toEqual(files);
	});
});

describe('FileDropzone', () => {
	it('reports dropped files split by extension', () => {
		const onFiles = vi.fn();
		render(<FileDropzone onFiles={onFiles} accept={['.tar']} multiple />);

		const dropzone = screen.getByTestId('file-dropzone');
		const files = [file('a.tar'), file('b.zip')];
		fireEvent.dragEnter(dropzone, { dataTransfer: { files } });
		expect(dropzone).toHaveAttribute('data-dragging', 'true');
		fireEvent.drop(dropzone, { dataTransfer: { files } });

		expect(dropzone).not.toHaveAttribute('data-dragging');
		expect(onFiles).toHaveBeenCalledWith([files[0]], [files[1]]);
	});

	it('keeps only the first file when not multiple', () => {
		const onFiles = vi.fn();
		render(<FileDropzone onFiles={onFiles} accept={['.tar']} />);

		fireEvent.drop(screen.getByTestId('file-dropzone'), {
			dataTransfer: { files: [file('a.tar'), file('b.tar')] }
		});

		expect(onFiles).toHaveBeenCalledWith(
			[expect.objectContaining({ name: 'a.tar' })],
			[]
		);
	});

	it('ignores drops while disabled', () => {
		const onFiles = vi.fn();
		render(<FileDropzone onFiles={onFiles} disabled />);

		fireEvent.drop(screen.getByTestId('file-dropzone'), {
			dataTransfer: { files: [file('a.tar')] }
		});

		expect(onFiles).not.toHaveBeenCalled();
	});

	it('reports files picked with the file input', () => {
		const onFiles = vi.fn();
		render(<FileDropzone onFiles={onFiles} accept={['.tar']} multiple />);

		fireEvent.change(screen.getByTestId('file-dropzone-input'), {
			target: { files: [file('a.tar')] }
		});

		expect(onFiles).toHaveBeenCalledWith(
			[expect.objectContaining({ name: 'a.tar' })],
			[]
		);
	});
});
