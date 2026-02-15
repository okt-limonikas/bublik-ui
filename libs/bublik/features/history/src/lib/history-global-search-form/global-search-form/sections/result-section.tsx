/* SPDX-License-Identifier: Apache-2.0 */
/* SPDX-FileCopyrightText: 2021-2023 OKTET Labs Ltd. */
import { useFormContext } from 'react-hook-form';

import { CheckboxField } from '@/shared/tailwind-ui';
import { RESULT_PROPERTIES, RESULT_TYPE } from '@/shared/types';

import {
	FormSectionHeader,
	IconButton,
	FormSectionSubheader
} from '../components';
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
		<fieldset className="rounded-2xl border border-border-primary bg-white px-4 py-4 transition-colors hover:border-primary focus-within:border-primary motion-safe:animate-fade-in md:px-5 md:py-5">
			<div className="mb-5">
				<FormSectionHeader
					name="Result"
					error={resultSectionError}
					style={{ marginBottom: 0 }}
				>
					<IconButton
						name="Bin"
						size={18}
						helpMessage="Clear result section"
						onClick={props.onResetResultSectionClick}
					/>
					<IconButton
						name="Refresh"
						size={18}
						helpMessage="Reset result section to defaults"
						onClick={props.onResetResultSectionDefaultClick}
					/>
				</FormSectionHeader>
				<FormSectionSubheader name="Result type classification" />
				<div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
					<CheckboxField
						iconName="TriangleExclamationMark"
						iconClassName="text-text-unexpected rdx-state-unchecked:text-text-unexpected rdx-state-checked:text-text-unexpected"
						iconSize={16}
						name="resultProperties"
						value={RESULT_PROPERTIES.Unexpected}
						label="Unexpected"
						control={control}
					/>
					<CheckboxField
						iconName="TriangleQuestionMark"
						iconClassName="text-text-expected rdx-state-unchecked:text-text-expected rdx-state-checked:text-text-expected"
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
		</fieldset>
	);
};
