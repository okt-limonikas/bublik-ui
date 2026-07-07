/* SPDX-License-Identifier: Apache-2.0 */
/* SPDX-FileCopyrightText: 2024-2026 OKTET LTD */
import { useRef } from 'react';
import { useFormContext } from 'react-hook-form';

import { config } from '@/bublik/config';
import { TextField, FilterExpressionField } from '@/shared/tailwind-ui';

import {
	FieldResetButton,
	FormSection,
	TestPathComboboxField
} from '../components';
import { HistoryGlobalSearchFormValues } from '../global-search-form.types';
import { useSearchSuggestions } from '../hooks/use-search-suggestions';

export type TestSectionProps = {
	onResetTestSectionClick: () => void;
	onResetTestSectionDefaultClick: () => void;
};

export const TestSection = (props: TestSectionProps) => {
	const portalRef = useRef<HTMLDivElement>(null);
	const { control, setValue } =
		useFormContext<HistoryGlobalSearchFormValues>();
	const suggestions = useSearchSuggestions();

	return (
		<FormSection className="flex flex-col">
			<FormSection.Bar className="bg-bg-ok" />
			<FormSection.Header name="Test">
				<FormSection.ResetToDefaultButton
					helpMessage="Reset test section to defaults"
					onClick={props.onResetTestSectionDefaultClick}
				/>
				<FormSection.ResetButton
					helpMessage="Clear test section"
					onClick={props.onResetTestSectionClick}
				/>
			</FormSection.Header>
			<div className="flex flex-col gap-4">
				<div className="grid gap-4 md:grid-cols-2" ref={portalRef}>
					<TestPathComboboxField
						name="testName"
						label="Test Path"
						placeholder="default_buff"
						control={control}
						container={portalRef}
					/>
					<TextField
						name="hash"
						label="Hash"
						type="text"
						placeholder="3c447d65a665c0eee17a0a20827e9"
						control={control}
					/>
				</div>
				<FilterExpressionField
					control={control}
					tokensName="parameters"
					exprName="testArgExpr"
					modeName="fieldModes.parameters"
					label="Parameters"
					placeholder="time_limit:30"
					suggestions={suggestions.parameters}
					keyValueDisplayDelimiter={config.keyValueDisplayDelimiter}
					keyValueSubmitDelimiter={config.keyValueSubmitDelimiter}
					labelTrailingContent={
						<FieldResetButton
							helpMessage="Clear parameters"
							onClick={(event) => {
								event.stopPropagation();
								setValue('parameters', [], {
									shouldDirty: true,
									shouldTouch: true
								});
								setValue('testArgExpr', '', {
									shouldDirty: true,
									shouldTouch: true
								});
							}}
						/>
					}
				/>
			</div>
		</FormSection>
	);
};
