/* SPDX-License-Identifier: Apache-2.0 */
/* SPDX-FileCopyrightText: 2024 OKTET LTD */
import { useMemo } from 'react';
import { skipToken } from '@reduxjs/toolkit/query';
import { useParams, useSearchParams } from 'react-router-dom';

import {
	generateTableOfContents,
	ReportStackedContextProvider,
	RunReportContainer,
	RunReportStackedSelectedContainer,
	RunReportStackedChartContainer,
	TocProvider,
	TocPanel,
	useTocContext
} from '@/bublik/features/run-report';
import { formatTimeToDot } from '@/shared/utils';
import {
	useGetRunDetailsQuery,
	useGetRunReportQuery
} from '@/services/bublik-api';

import { useTabTitleWithPrefix } from '@/bublik/features/projects';

function RunReportPage() {
	const [searchParams] = useSearchParams();
	const { runId } = useParams<{ runId: string }>();
	const configId = searchParams.get('config');
	useRunReportPageName({ runId: runId ? Number(runId) : undefined });

	const { data: reportData } = useGetRunReportQuery(
		configId && runId
			? { configId: Number(configId), runId: Number(runId) }
			: skipToken
	);

	const tocContents = useMemo(() => {
		if (!reportData) return [];
		return generateTableOfContents(reportData);
	}, [reportData]);

	if (!configId) {
		return <div className="flex flex-col gap-1 p-2">No config id found!</div>;
	}

	if (!runId) {
		return <div className="flex flex-col gap-1 p-2">No run id found!</div>;
	}

	return (
		<TocProvider contents={tocContents}>
			<RunReportPageContent runId={Number(runId)} configId={Number(configId)} />
		</TocProvider>
	);
}

interface RunReportPageContentProps {
	runId: number;
	configId: number;
}

function RunReportPageContent({ runId, configId }: RunReportPageContentProps) {
	const { displayMode } = useTocContext();

	if (displayMode === 'sidebar') {
		return (
			<div className="flex">
				<div className="flex-1 flex flex-col gap-1 p-2 min-w-0">
					<ReportStackedContextProvider runId={runId} configId={configId}>
						<RunReportContainer runId={runId} configId={configId} />
						<RunReportStackedSelectedContainer />
						<RunReportStackedChartContainer />
					</ReportStackedContextProvider>
				</div>
				<TocPanel />
			</div>
		);
	}

	return (
		<>
			<TocPanel />
			<div className="flex flex-col gap-1 p-2">
				<ReportStackedContextProvider runId={runId} configId={configId}>
					<RunReportContainer runId={runId} configId={configId} />
					<RunReportStackedSelectedContainer />
					<RunReportStackedChartContainer />
				</ReportStackedContextProvider>
			</div>
		</>
	);
}

interface UseRunReportPageNameConfig {
	runId?: number;
}

function useRunReportPageName({ runId }: UseRunReportPageNameConfig) {
	const { data: details } = useGetRunDetailsQuery(runId ?? skipToken);

	let title = 'Report - Bublik';

	if (runId && details) {
		const { main_package: name, start } = details;
		const formattedTime = formatTimeToDot(start);
		title = `${name} | ${formattedTime} | ${runId} | Report - Bublik`;
	}

	useTabTitleWithPrefix(title);
}

export { RunReportPage };
