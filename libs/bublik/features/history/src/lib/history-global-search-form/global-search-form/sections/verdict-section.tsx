/* SPDX-License-Identifier: Apache-2.0 */
/* SPDX-FileCopyrightText: 2021-2023 OKTET Labs Ltd. */
import { useState } from 'react';
import { useFormContext } from 'react-hook-form';

import { VERDICT_TYPE } from '@/shared/types';
import { BadgeField, TextField, cn } from '@/shared/tailwind-ui';

import {
	ExpressionToggleButton,
	FormSectionHeader,
	IconButton
} from '../components';
import { HistoryGlobalSearchFormValues } from '../global-search-form.types';

export const VerdictSection = () => {
	const { control, watch, setValue } =
		useFormContext<HistoryGlobalSearchFormValues>();
	const [isVerdictExpressionVisible, setIsVerdictExpressionVisible] = useState(
		() => Boolean(watch('verdictExpr'))
	);

	const verdictLookup = watch('verdictLookup');

	const setVerdictLookup = (lookup: VERDICT_TYPE) => {
		setValue('verdictLookup', lookup, {
			shouldDirty: true,
			shouldTouch: true
		});
	};

	const lookupToggleClassName = (lookup: VERDICT_TYPE) =>
		cn(
			'h-7 w-7 border rounded-md',
			verdictLookup === lookup
				? 'border-primary bg-primary-wash text-primary'
				: 'border-transparent text-text-menu hover:bg-primary-wash hover:text-primary'
		);

	const lookupButtons = (
		<div className="flex items-center gap-0.5">
			<IconButton
				name="TextWrap"
				size={14}
				helpMessage="Lookup as string"
				onClick={() => setVerdictLookup(VERDICT_TYPE.String)}
				className={lookupToggleClassName(VERDICT_TYPE.String)}
			/>
			<IconButton
				name="Filter"
				size={14}
				helpMessage="Lookup as regex"
				onClick={() => setVerdictLookup(VERDICT_TYPE.Regex)}
				className={lookupToggleClassName(VERDICT_TYPE.Regex)}
			/>
			<IconButton
				name="CrossSimple"
				size={14}
				helpMessage="Disable verdict lookup"
				onClick={() => setVerdictLookup(VERDICT_TYPE.None)}
				className={lookupToggleClassName(VERDICT_TYPE.None)}
			/>
		</div>
	);

	return (
		<fieldset className="relative rounded-2xl border border-border-primary bg-white px-4 pt-6 pb-4 transition-colors hover:border-primary focus-within:border-primary motion-safe:animate-fade-in md:px-5 md:pt-6 md:pb-5">
			<FormSectionHeader name="Verdict" />
			<div className="flex flex-col gap-4">
				<div className="flex gap-2">
					<div className="flex-1">
						<BadgeField
							label="String Verdict"
							name="verdict"
							placeholder={
								verdictLookup === VERDICT_TYPE.String
									? 'Unexpectedly failed with errno ENOPROTOOPT'
									: verdictLookup === VERDICT_TYPE.Regex
									? '.\\*'
									: ''
							}
							disabled={verdictLookup === VERDICT_TYPE.None}
							control={control}
							trailingContent={lookupButtons}
						/>
					</div>
					<ExpressionToggleButton
						label="verdict expression"
						isOpen={isVerdictExpressionVisible}
						onClick={() =>
							setIsVerdictExpressionVisible((previous) => !previous)
						}
					/>
				</div>
				{isVerdictExpressionVisible ? (
					<TextField
						name={'verdictExpr'}
						label="Verdict Expression"
						placeholder={'None | "Verdict"'}
						control={control}
					/>
				) : null}
			</div>
		</fieldset>
	);
};
