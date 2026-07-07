/* SPDX-License-Identifier: Apache-2.0 */
/* SPDX-FileCopyrightText: 2024-2026 OKTET LTD */
import {
	Control,
	FieldPathByValue,
	FieldValues,
	Path,
	useController
} from 'react-hook-form';

import { BadgeItem } from '../badge-input';
import { FilterExpressionInput } from './filter-expression-input';
import {
	FilterExpressionInputProps,
	FilterMode
} from './filter-expression-input.types';

export type FilterExpressionFieldProps<T extends FieldValues> = {
	control: Control<T, unknown>;
	/** BadgeItem[] form field populated in tokens mode */
	tokensName: FieldPathByValue<T, BadgeItem[]>;
	/** Expression string form field populated in builder/expression modes */
	exprName: FieldPathByValue<T, string>;
	/** FilterMode form field deciding which of the two is submitted */
	modeName: Path<T>;
} & Pick<
	FilterExpressionInputProps,
	| 'label'
	| 'placeholder'
	| 'suggestions'
	| 'grammar'
	| 'hideBuilder'
	| 'keyValueDisplayDelimiter'
	| 'keyValueSubmitDelimiter'
	| 'onValidate'
	| 'disabled'
	| 'labelTrailingContent'
>;

export const FilterExpressionField = <T extends FieldValues>({
	control,
	tokensName,
	exprName,
	modeName,
	...inputProps
}: FilterExpressionFieldProps<T>) => {
	const { field: tokensField } = useController<T>({
		name: tokensName,
		control
	});
	const { field: exprField } = useController<T>({ name: exprName, control });
	const { field: modeField } = useController<T>({ name: modeName, control });

	return (
		<FilterExpressionInput
			{...inputProps}
			name={tokensName}
			mode={(modeField.value as FilterMode) ?? 'tokens'}
			onModeChange={modeField.onChange}
			badges={(tokensField.value as BadgeItem[]) ?? []}
			onBadgesChange={tokensField.onChange}
			expression={(exprField.value as string) ?? ''}
			onExpressionChange={exprField.onChange}
		/>
	);
};
