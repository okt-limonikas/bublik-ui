/* SPDX-License-Identifier: Apache-2.0 */
/* SPDX-FileCopyrightText: 2024-2026 OKTET LTD */
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { MarkdownPreview } from './markdown-preview';

describe('MarkdownPreview', () => {
	it('should render empty state for empty markdown', () => {
		const { getByText } = render(
			<MarkdownPreview markdown="" emptyState="Empty markdown" />
		);

		expect(getByText('Empty markdown')).toBeVisible();
	});

	it('should render markdown content', () => {
		const markdown = '## Title\n\n- Item';
		const { getByText } = render(<MarkdownPreview markdown={markdown} />);

		expect(getByText('Title')).toBeVisible();
		expect(getByText('Item')).toBeVisible();
	});
});
