/* SPDX-License-Identifier: Apache-2.0 */
/* SPDX-FileCopyrightText: 2024-2026 OKTET LTD */
import { fireEvent, render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { BadgeQueryInput } from './badge-query-input';

describe('BadgeQueryInput', () => {
	it('renders successfully', () => {
		const { getByTestId } = render(<BadgeQueryInput label="Tags" />);

		expect(getByTestId('tw-badge-query-input')).toBeVisible();
	});

	it('adds badge from suggestions in uncontrolled mode', () => {
		const { getByPlaceholderText, getByText } = render(
			<BadgeQueryInput
				label="Tags"
				placeholder="tag"
				sections={[
					{
						id: 'tags',
						label: 'Tags',
						options: [{ value: 'foo' }, { value: 'bar' }]
					}
				]}
			/>
		);

		const input = getByPlaceholderText('tag');
		fireEvent.focus(input);
		fireEvent.mouseDown(getByText('foo'));

		expect(getByText('foo')).toBeVisible();
	});

	it('creates custom value from input', () => {
		const { getByPlaceholderText, getByText } = render(
			<BadgeQueryInput label="Tags" placeholder="tag" sections={[]} />
		);

		const input = getByPlaceholderText('tag');
		fireEvent.change(input, { target: { value: 'custom-tag' } });
		fireEvent.keyDown(input, { key: 'Enter' });

		expect(getByText('custom-tag')).toBeVisible();
	});

	it('calls onValueChange in controlled mode', () => {
		const handleValueChange = vi.fn();

		const { getByPlaceholderText, getByText } = render(
			<BadgeQueryInput
				label="Tags"
				placeholder="tag"
				value={{ mode: 'simple', badges: [], expression: '' }}
				onValueChange={handleValueChange}
				sections={[
					{
						id: 'tags',
						label: 'Tags',
						options: [{ value: 'foo' }]
					}
				]}
			/>
		);

		const input = getByPlaceholderText('tag');
		fireEvent.focus(input);
		fireEvent.mouseDown(getByText('foo'));

		expect(handleValueChange).toHaveBeenCalled();
		const lastCallArg = handleValueChange.mock.calls.at(-1)?.[0];
		expect(lastCallArg.badges).toHaveLength(1);
		expect(lastCallArg.expression).toEqual('foo');
	});
});
