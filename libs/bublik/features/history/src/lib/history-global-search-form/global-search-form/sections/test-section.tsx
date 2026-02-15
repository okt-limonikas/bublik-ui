/* SPDX-License-Identifier: Apache-2.0 */
/* SPDX-FileCopyrightText: 2021-2023 OKTET Labs Ltd. */
import { useState } from 'react';
import { useFormContext } from 'react-hook-form';

import { TextField, BadgeField } from '@/shared/tailwind-ui';

import {
	ExpressionToggleButton,
	FormSectionHeader,
	IconButton
} from '../components';
import { HistoryGlobalSearchFormValues } from '../global-search-form.types';

export type TestSectionProps = {
	onResetTestSectionClick: () => void;
	onResetTestSectionDefaultClick: () => void;
};

export const TestSection = (props: TestSectionProps) => {
	const { control, watch } = useFormContext<HistoryGlobalSearchFormValues>();
	const [isParametersExpressionVisible, setIsParametersExpressionVisible] =
		useState(() => Boolean(watch('testArgExpr')));

	return (
		<fieldset className="flex flex-col rounded-2xl border border-border-primary bg-white px-4 py-4 transition-colors hover:border-primary focus-within:border-primary motion-safe:animate-fade-in md:px-5 md:py-5">
			<FormSectionHeader name="Test">
				<IconButton
					name="Refresh"
					size={18}
					helpMessage="Reset test section to defaults"
					onClick={props.onResetTestSectionDefaultClick}
				/>
				<IconButton
					name="Bin"
					size={18}
					helpMessage="Clear test section"
					onClick={props.onResetTestSectionClick}
				/>
			</FormSectionHeader>
			<div className="flex flex-col gap-4">
				<div className="grid gap-4 md:grid-cols-2">
					<TextField
						name="testName"
						label="Test Name"
						type="text"
						placeholder="default_buff"
						control={control}
					/>
					<TextField
						name="hash"
						label="Hash"
						type="text"
						placeholder="3c447d65a665c0eee17a0a20827e9"
						control={control}
					/>
				</div>
				<div className="flex gap-2">
					<div className="flex-1">
						<BadgeField
							name="parameters"
							label="Parameters"
							placeholder="time_limit:30"
							control={control}
						/>
					</div>
					<ExpressionToggleButton
						label="parameter expression"
						isOpen={isParametersExpressionVisible}
						onClick={() =>
							setIsParametersExpressionVisible((previous) => !previous)
						}
					/>
				</div>
				{isParametersExpressionVisible ? (
					<TextField
						name={'testArgExpr'}
						label="Parameter Expression"
						placeholder={'argument1 != 5 & argument2 >= 10'}
						control={control}
					/>
				) : null}
			</div>
		</fieldset>
	);
};
