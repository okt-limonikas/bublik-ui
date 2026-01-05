/* SPDX-License-Identifier: Apache-2.0 */
/* SPDX-FileCopyrightText: 2021-2023 OKTET Labs Ltd. */
import { PropsWithChildren } from 'react';

import {
	ChangePasswordFormContainer,
	EditUserProfileContainer,
	HistoryPreferencesForm,
	LogPreferencesForm
} from '@/bublik/features/user-preferences';

interface SettingsSectionProps {
	title: string;
}

const SettingsSection = (props: PropsWithChildren<SettingsSectionProps>) => {
	return (
		<div className="flex flex-col gap-6">
			<h2 className="text-2xl font-semibold leading-5">{props.title}</h2>
			{props.children}
		</div>
	);
};

interface SettingsPaneProps {
	header: string;
	description: string;
	children: React.ReactNode;
}

const SettingsPane = (props: SettingsPaneProps) => {
	return (
		<div className="flex flex-col gap-6">
			<div className="flex flex-col gap-2">
				<h1 className="text-3xl font-semibold leading-8">{props.header}</h1>
				<p className="text-sm text-text-menu">{props.description}</p>
			</div>
			{props.children}
		</div>
	);
};

export const SettingsProfilePage = () => {
	return (
		<div className="flex flex-col gap-8">
			<SettingsSection title="Profile">
				<EditUserProfileContainer />
			</SettingsSection>
			<SettingsSection title="Security">
				<div className="flex items-center gap-4">
					<ChangePasswordFormContainer />
				</div>
			</SettingsSection>
			<SettingsPane
				header="Preferences"
				description="Configure default behaviors and page settings"
			>
				<SettingsSection title="History">
					<HistoryPreferencesForm />
				</SettingsSection>
				<SettingsSection title="Logs">
					<LogPreferencesForm />
				</SettingsSection>
			</SettingsPane>
		</div>
	);
};
