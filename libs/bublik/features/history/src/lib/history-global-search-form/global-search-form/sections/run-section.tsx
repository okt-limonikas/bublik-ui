/* SPDX-License-Identifier: Apache-2.0 */
/* SPDX-FileCopyrightText: 2024-2026 OKTET LTD */
import { useFormContext } from 'react-hook-form';

import { config } from '@/bublik/config';
import {
	TextField,
	AriaDateRangeField,
	CheckboxField,
	FilterExpressionField
} from '@/shared/tailwind-ui';
import { RUN_PROPERTIES } from '@/shared/types';

import {
	FieldResetButton,
	FormSection,
	FormSectionSubheader,
	FormError
} from '../components';
import { HistoryGlobalSearchFormValues } from '../global-search-form.types';
import { useSearchSuggestions } from '../hooks/use-search-suggestions';

export type RunSectionProps = {
	onResetRunSectionClick: () => void;
	onResetRunSectionDefaultClick: () => void;
};

export const RunSection = (props: RunSectionProps) => {
	const { control, formState, setValue } =
		useFormContext<HistoryGlobalSearchFormValues>();
	const suggestions = useSearchSuggestions();

	const runPropsError = formState.errors.runProperties?.message as
		| string
		| undefined;

	const clearField = (
		tokensName: 'labels' | 'branches' | 'revisions' | 'runData',
		exprName: 'labelExpr' | 'branchExpr' | 'revisionExpr' | 'tagExpr'
	) => {
		setValue(tokensName, [], { shouldDirty: true, shouldTouch: true });
		setValue(exprName, '', { shouldDirty: true, shouldTouch: true });
	};

	return (
		<FormSection>
			<FormSection.Bar className="bg-primary" />
			<FormSection.Header name="Run">
				<FormSection.ResetToDefaultButton
					helpMessage="Reset run section to defaults"
					onClick={props.onResetRunSectionDefaultClick}
				/>
				<FormSection.ResetButton
					helpMessage="Clear run section"
					onClick={props.onResetRunSectionClick}
				/>
			</FormSection.Header>
			<div className="flex flex-col gap-4">
				<div className="grid items-center gap-4 md:grid-cols-2">
					<AriaDateRangeField label="Dates" name="dates" control={control} />
					<TextField
						name="runIds"
						label="Run ID"
						placeholder="1"
						control={control}
					/>
				</div>
				<FilterExpressionField
					control={control}
					tokensName="labels"
					exprName="labelExpr"
					modeName="fieldModes.labels"
					label="Labels"
					placeholder="label"
					suggestions={suggestions.labels}
					keyValueDisplayDelimiter={config.keyValueDisplayDelimiter}
					keyValueSubmitDelimiter={config.keyValueSubmitDelimiter}
					labelTrailingContent={
						<FieldResetButton
							helpMessage="Clear labels"
							onClick={(event) => {
								event.stopPropagation();
								clearField('labels', 'labelExpr');
							}}
						/>
					}
				/>
				<FilterExpressionField
					control={control}
					tokensName="branches"
					exprName="branchExpr"
					modeName="fieldModes.branches"
					label="Branches"
					placeholder="master"
					suggestions={suggestions.branches}
					keyValueDisplayDelimiter={config.keyValueDisplayDelimiter}
					keyValueSubmitDelimiter={config.keyValueSubmitDelimiter}
					labelTrailingContent={
						<FieldResetButton
							helpMessage="Clear branches"
							onClick={(event) => {
								event.stopPropagation();
								clearField('branches', 'branchExpr');
							}}
						/>
					}
				/>
				<FilterExpressionField
					control={control}
					tokensName="revisions"
					exprName="revisionExpr"
					modeName="fieldModes.revisions"
					label="Revisions"
					placeholder="8af383125f20cc5ecdb8393bf"
					suggestions={suggestions.revisions}
					keyValueDisplayDelimiter={config.keyValueDisplayDelimiter}
					keyValueSubmitDelimiter={config.keyValueSubmitDelimiter}
					labelTrailingContent={
						<FieldResetButton
							helpMessage="Clear revisions"
							onClick={(event) => {
								event.stopPropagation();
								clearField('revisions', 'revisionExpr');
							}}
						/>
					}
				/>
				<FilterExpressionField
					control={control}
					tokensName="runData"
					exprName="tagExpr"
					modeName="fieldModes.runData"
					label="Tags"
					placeholder="medford"
					suggestions={suggestions.runData}
					keyValueDisplayDelimiter={config.keyValueDisplayDelimiter}
					keyValueSubmitDelimiter={config.keyValueSubmitDelimiter}
					labelTrailingContent={
						<FieldResetButton
							helpMessage="Clear tags"
							onClick={(event) => {
								event.stopPropagation();
								clearField('runData', 'tagExpr');
							}}
						/>
					}
				/>
			</div>
			<div className="mt-4">
				<FormSectionSubheader name="Compromise Status" />
				{runPropsError ? (
					<div className="mb-3">
						<FormError subtitle={runPropsError} />
					</div>
				) : null}
				<div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
					<CheckboxField
						iconName="InformationCircleForbidden"
						iconSize={16}
						name="runProperties"
						value={RUN_PROPERTIES.Compromised}
						label="Compromised"
						control={control}
					/>
					<CheckboxField
						iconName="InformationCircleCheckmark"
						iconSize={16}
						name="runProperties"
						value={RUN_PROPERTIES.NotCompromised}
						label="Not Compromised"
						control={control}
					/>
				</div>
			</div>
		</FormSection>
	);
};
