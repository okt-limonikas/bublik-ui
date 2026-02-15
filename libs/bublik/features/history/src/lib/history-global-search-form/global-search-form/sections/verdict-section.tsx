/* SPDX-License-Identifier: Apache-2.0 */
/* SPDX-FileCopyrightText: 2021-2023 OKTET Labs Ltd. */
import { useState } from 'react';
import { useFormContext } from 'react-hook-form';

import { VERDICT_TYPE } from '@/shared/types';
import { RadioField, BadgeField, TextField } from '@/shared/tailwind-ui';

import { ExpressionToggleButton, FormSectionHeader } from '../components';
import { HistoryGlobalSearchFormValues } from '../global-search-form.types';

export const VerdictSection = () => {
	const { control, watch } = useFormContext<HistoryGlobalSearchFormValues>();
	const [isVerdictExpressionVisible, setIsVerdictExpressionVisible] = useState(
		() => Boolean(watch('verdictExpr'))
	);

	const verdictLookup = watch('verdictLookup');

	return (
		<fieldset className="rounded-2xl border border-border-primary bg-white px-4 py-4 transition-colors hover:border-primary focus-within:border-primary motion-safe:animate-fade-in md:px-5 md:py-5">
			<FormSectionHeader name="Verdict" />
			<div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
				<RadioField
					name="verdictLookup"
					value={VERDICT_TYPE.String}
					label="String"
					control={control}
				/>
				<RadioField
					name="verdictLookup"
					value={VERDICT_TYPE.Regex}
					label="Regex"
					control={control}
				/>
				<RadioField
					name="verdictLookup"
					value={VERDICT_TYPE.None}
					label="None"
					control={control}
				/>
			</div>
			<div className="flex flex-col gap-4">
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
					disabled={watch('verdictLookup') === VERDICT_TYPE.None}
					control={control}
				/>
				<ExpressionToggleButton
					label="verdict expression"
					isOpen={isVerdictExpressionVisible}
					onClick={() => setIsVerdictExpressionVisible((previous) => !previous)}
				/>
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
