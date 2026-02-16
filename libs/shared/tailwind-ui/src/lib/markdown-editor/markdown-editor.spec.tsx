/* SPDX-License-Identifier: Apache-2.0 */
/* SPDX-FileCopyrightText: 2024-2026 OKTET LTD */
import { useState } from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { MarkdownEditor } from './markdown-editor';

interface MarkdownEditorHarnessProps {
	initialValue: string;
}

const MarkdownEditorHarness = (props: MarkdownEditorHarnessProps) => {
	const { initialValue } = props;
	const [value, setValue] = useState(initialValue);

	return <MarkdownEditor value={value} onChange={setValue} />;
};

describe('MarkdownEditor', () => {
	it('should switch to preview mode', () => {
		const { getByRole, queryByTestId } = render(
			<MarkdownEditorHarness initialValue="Some value" />
		);

		expect(queryByTestId('markdown-editor-textarea')).toBeVisible();

		fireEvent.click(getByRole('button', { name: 'Preview' }));

		expect(queryByTestId('markdown-editor-textarea')).toBeNull();
		expect(queryByTestId('markdown-editor-preview')).toBeVisible();
	});

	it('should apply bold formatter to selected text', async () => {
		const { getByRole, getByTestId } = render(
			<MarkdownEditorHarness initialValue="hello" />
		);
		const textArea = getByTestId(
			'markdown-editor-textarea'
		) as HTMLTextAreaElement;

		textArea.focus();
		textArea.setSelectionRange(0, 5);

		fireEvent.click(getByRole('button', { name: 'Bold' }));

		await waitFor(() => {
			expect(textArea.value).toBe('**hello**');
		});
	});
});
