/* SPDX-License-Identifier: Apache-2.0 */
/* SPDX-FileCopyrightText: 2024-2026 OKTET LTD */
import { Control, FieldValues, Path, useController } from 'react-hook-form';

import { BadgeQueryInput } from './badge-query-input';
import { BadgeQueryInputProps } from './types';

export type BadgeQueryFieldProps<T extends FieldValues> = Omit<
	BadgeQueryInputProps,
	'value' | 'defaultValue' | 'onValueChange' | 'onBlur' | 'name'
> & {
	name: Path<T>;
	control: Control<T, unknown>;
};

export const BadgeQueryField = <T extends FieldValues>(
	props: BadgeQueryFieldProps<T>
) => {
	const { field, fieldState } = useController<T>({
		name: props.name,
		control: props.control
	});

	return (
		<BadgeQueryInput
			{...props}
			name={field.name}
			value={field.value}
			onValueChange={field.onChange}
			onBlur={field.onBlur}
			error={fieldState.error?.message}
			ref={field.ref}
		/>
	);
};
