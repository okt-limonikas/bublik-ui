/* SPDX-License-Identifier: Apache-2.0 */
/* SPDX-FileCopyrightText: 2021-2023 OKTET Labs Ltd. */
import { useFormContext } from 'react-hook-form';

import { CheckboxField } from '@/shared/tailwind-ui';
import { RESULT_PROPERTIES, RESULT_TYPE } from '@/shared/types';

import { FormSection, FormSectionSubheader } from '../components';
import { HistoryGlobalSearchFormValues } from '../global-search-form.types';

export type ResultSectionProps = {
	onResetResultSectionClick: () => void;
	onResetResultSectionDefaultClick: () => void;
};

export const ResultSection = (props: ResultSectionProps) => {
	const { control, formState, getFieldState } =
		useFormContext<HistoryGlobalSearchFormValues>();

	const resultPropsError =
		formState.errors.resultProperties &&
		getFieldState('resultProperties').isTouched
			? formState.errors.resultProperties.message
			: undefined;

	const resultsError =
		formState.errors.results && getFieldState('results').isTouched
			? formState.errors.results.message
			: undefined;

	const resultSectionError = (resultPropsError || resultsError || undefined) as
		| string
		| undefined;

	return (
		<FormSection>
			<FormSection.Bar className="bg-bg-warning" />
			<div className="mb-5">
				<FormSection.Header
					className="mb-0"
					name="Result"
					error={resultSectionError}
				>
					<FormSection.ResetToDefaultButton
						helpMessage="Reset result section to defaults"
						onClick={props.onResetResultSectionDefaultClick}
					/>
					<FormSection.ResetButton
						helpMessage="Clear result section"
						onClick={props.onResetResultSectionClick}
					/>
				</FormSection.Header>
				<FormSectionSubheader name="Result type classification" />
				<div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
					<CheckboxField
						iconName="TriangleExclamationMark"
						iconClassName="rdx-state-checked:text-text-unexpected"
						iconSize={16}
						name="resultProperties"
						value={RESULT_PROPERTIES.Unexpected}
						label="Unexpected"
						control={control}
					/>
					<CheckboxField
						iconName="TriangleQuestionMark"
						iconClassName="rdx-state-checked:text-text-expected"
						iconSize={16}
						name="resultProperties"
						value={RESULT_PROPERTIES.Expected}
						label="Expected"
						control={control}
					/>
					<CheckboxField
						iconName="TriangleQuestionMark"
						iconSize={16}
						name="resultProperties"
						value={RESULT_PROPERTIES.NotRun}
						label="Not Run"
						control={control}
					/>
				</div>
			</div>
			<div>
				<FormSectionSubheader name="Obtained result" />
				<div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
					<CheckboxField
						iconName="BoxCheckmark"
						iconSize={16}
						name="results"
						value={RESULT_TYPE.Passed}
						label="PASSED"
						control={control}
					/>
					<CheckboxField
						iconName="BoxCrossMark"
						iconSize={16}
						name="results"
						value={RESULT_TYPE.Failed}
						label="FAILED"
						control={control}
					/>
					<CheckboxField
						iconName="BoxCrossMark"
						iconSize={16}
						name="results"
						value={RESULT_TYPE.Killed}
						label="KILLED"
						control={control}
					/>
					<CheckboxField
						iconName="BoxCrossMark"
						iconSize={16}
						name="results"
						value={RESULT_TYPE.Cored}
						label="CORED"
						control={control}
					/>
					<CheckboxField
						iconName="BoxExclamationMark"
						iconSize={16}
						name="results"
						value={RESULT_TYPE.Skipped}
						label="SKIPPED"
						control={control}
					/>
					<CheckboxField
						iconName="BoxQuestionMark"
						iconSize={16}
						name="results"
						value={RESULT_TYPE.Faked}
						label="FAKED"
						control={control}
					/>
					<CheckboxField
						iconName="BoxExclamationMark"
						iconSize={16}
						name="results"
						value={RESULT_TYPE.Incomplete}
						label="INCOMPLETE"
						control={control}
					/>
				</div>
			</div>
		</FormSection>
	);
};
