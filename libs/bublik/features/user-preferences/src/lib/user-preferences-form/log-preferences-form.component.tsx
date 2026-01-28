/* SPDX-License-Identifier: Apache-2.0 */
/* SPDX-FileCopyrightText: 2024 OKTET LTD */
import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';

import {
	Checkbox,
	RadioGroup,
	RadioGroupItemWithLabel
} from '@/shared/tailwind-ui';

import { useUserPreferences } from './user-preferences.hooks';
import { UserPreferencesSchema } from './user-preference.types';

function LogPreferencesForm() {
	const { userPreferences, setUserPreferences } = useUserPreferences();
	const { control } = useForm({
		defaultValues: userPreferences,
		resolver: zodResolver(UserPreferencesSchema)
	});

	return (
		<div className="flex flex-col gap-6 max-w-md">
			<Controller
				name="log.preferLegacyLog"
				control={control}
				render={({ field }) => (
					<div>
						<div className="flex items-center">
							<Checkbox
								id="legacy-logs"
								checked={field.value}
								onCheckedChange={(checked) => {
									field.onChange(checked);
									setUserPreferences({
										...userPreferences,
										log: {
											...userPreferences.log,
											preferLegacyLog: checked === true
										}
									});
								}}
							/>
							<label htmlFor="legacy-logs" className="pl-2 text-sm font-normal">
								Legacy Logs
							</label>
						</div>
						<p className="text-xs text-text-menu ml-8">
							Make legacy logs your default choice
						</p>
					</div>
				)}
			/>
			<Controller
				name="log.defaultExpandLevel"
				control={control}
				render={({ field }) => (
					<div className="flex flex-col gap-4">
						<label className="text-sm font-medium leading-none">
							Default Expansion Level
						</label>
						<p className="text-xs text-text-menu">
							Set the initial nesting level when opening log pages
						</p>
						<RadioGroup
							onValueChange={(value) => {
								const numValue = parseInt(value, 10);
								field.onChange(numValue);
								setUserPreferences({
									...userPreferences,
									log: {
										...userPreferences.log,
										defaultExpandLevel: numValue
									}
								});
							}}
							defaultValue={String(field.value)}
							className="flex flex-wrap gap-2"
						>
							{[0, 1, 2, 3, 4, 5].map((level) => (
								<RadioGroupItemWithLabel
									key={level}
									id={`expand-level-${level}`}
									value={String(level)}
									label={String(level)}
									description={
										level === 0
											? 'All collapsed'
											: level === 1
											? 'Default'
											: undefined
									}
								/>
							))}
						</RadioGroup>
					</div>
				)}
			/>
		</div>
	);
}

export { LogPreferencesForm };
