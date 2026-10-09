/* SPDX-License-Identifier: Apache-2.0 */
/* SPDX-FileCopyrightText: 2021-2023 OKTET Labs Ltd. */
import { useState } from 'react';
import { getRouteApi } from '@tanstack/react-router';

import { analyticsEventNames, trackEvent } from '@/bublik/features/analytics';
import { DefineCompromiseContainer } from '@/bublik/features/compromised-form';
import { LinkToSourceContainer } from '@/bublik/features/link-to-source';
import {
	GlobalRequirementsProvider,
	RunTableContainer
} from '@/bublik/features/run';
import { RunDetailsContainer } from '@/bublik/features/run-details';
import {
	ApplyRulesButton,
	ResultSelectionProvider
} from '@/bublik/features/result-classification';
import { DiffFormContainer } from '@/bublik/features/run-diff';
import { CopyShortUrlButtonContainer } from '@/bublik/features/copy-url';
import {
	CardHeader,
	RunModeToggle,
	ScrollToTopPage,
	Separator
} from '@/shared/tailwind-ui';
import { NewBugContainer } from '@/bublik/features/log-preview-drawer';

const runRoute = getRouteApi('/_app/runs/$runId/');

export interface RunHeaderProps {
	runId: number;
}

const RunHeader = ({ runId }: RunHeaderProps) => {
	const [isModeFull, setIsModeFull] = useState(false);

	const handleModeToggle = () => {
		trackEvent(analyticsEventNames.runModeToggle, {
			enabled: !isModeFull
		});

		setIsModeFull((prev) => !prev);
	};

	return (
		<header className="flex flex-col bg-bg-primary rounded">
			<CardHeader label="Info">
				<div className="flex h-full gap-3">
					<RunModeToggle
						isFullMode={isModeFull}
						onToggleClick={handleModeToggle}
					/>
					<Separator orientation="vertical" className="h-5 self-center" />
					<DiffFormContainer defaultValues={{ leftRunId: String(runId) }} />
					<LinkToSourceContainer runId={runId} />
					<DefineCompromiseContainer runId={runId} />
					<NewBugContainer runId={runId} resultId={runId} />
					<ApplyRulesButton runId={runId} />
					<Separator orientation="vertical" className="h-5 self-center" />
					<CopyShortUrlButtonContainer />
				</div>
			</CardHeader>
			<RunDetailsContainer runId={runId} isFullMode={isModeFull} />
		</header>
	);
};

export const RunPage = () => {
	const { runId } = runRoute.useParams();

	return (
		<div className="flex flex-col gap-1 p-2">
			<RunHeader runId={runId} />
			<GlobalRequirementsProvider>
				{/* One selection across every open result table, so results of
				    several tests go into one bulk classification; it is the
				    run's own, as the run issues page's is. */}
				<ResultSelectionProvider scope={`run:${runId}`}>
					{/* The run table, shared with /multiple, takes the ids as strings */}
					<RunTableContainer runId={String(runId)} />
				</ResultSelectionProvider>
			</GlobalRequirementsProvider>
			<ScrollToTopPage offset={158} />
		</div>
	);
};
