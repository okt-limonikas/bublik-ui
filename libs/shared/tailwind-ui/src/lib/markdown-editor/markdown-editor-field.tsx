/* SPDX-License-Identifier: Apache-2.0 */
/* SPDX-FileCopyrightText: 2024-2026 OKTET LTD */
import { Control, FieldValues, Path, useController } from 'react-hook-form';

import { MarkdownEditor, MarkdownEditorProps } from './markdown-editor';

export interface MarkdownEditorFieldProps<T extends FieldValues>
	extends Omit<MarkdownEditorProps, 'value' | 'onChange' | 'error'> {
	name: Path<T>;
	control: Control<T, unknown>;
}

export const MarkdownEditorField = <T extends FieldValues>(
	props: MarkdownEditorFieldProps<T>
) => {
	const { field, fieldState } = useController({
		name: props.name,
		control: props.control
	});
	const fieldValue = typeof field.value === 'string' ? field.value : '';

	return (
		<MarkdownEditor
			{...props}
			name={field.name}
			value={fieldValue}
			onChange={field.onChange}
			onBlur={field.onBlur}
			error={fieldState.error?.message}
			ref={field.ref}
		/>
	);
};
