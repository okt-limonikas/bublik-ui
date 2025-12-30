/* SPDX-License-Identifier: Apache-2.0 */
/* SPDX-FileCopyrightText: 2024 OKTET LTD */
import { useMemo, memo } from 'react';
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
	useTocUI
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
			<RunReportPageLayout runId={Number(runId)} configId={Number(configId)} />
		</TocProvider>
	);
}

interface RunReportPageContentProps {
	runId: number;
	configId: number;
}

// Memoized report content - never re-renders due to TOC state changes
const ReportContent = memo(function ReportContent({
	runId,
	configId
}: RunReportPageContentProps) {
	return (
		<ReportStackedContextProvider runId={runId} configId={configId}>
			<RunReportContainer runId={runId} configId={configId} />
			<RunReportStackedSelectedContainer />
			<RunReportStackedChartContainer />
		</ReportStackedContextProvider>
	);
});

// Sidebar layout component
function SidebarLayout({ runId, configId }: RunReportPageContentProps) {
	return (
		<div className="flex">
			<div className="flex-1 flex flex-col gap-1 p-2 min-w-0">
				<ReportContent runId={runId} configId={configId} />
			</div>
			<TocPanel />
		</div>
	);
}

// Floating layout component
function FloatingLayout({ runId, configId }: RunReportPageContentProps) {
	return (
		<>
			<TocPanel />
			<div className="flex flex-col gap-1 p-2">
				<ReportContent runId={runId} configId={configId} />
			</div>
		</>
	);
}

// Layout switcher - only subscribes to UI context (displayMode)
// This is the ONLY component that needs to know about displayMode
function RunReportPageLayout({ runId, configId }: RunReportPageContentProps) {
	// Only subscribe to UI context - NOT active context
	const { displayMode } = useTocUI();

	if (displayMode === 'sidebar') {
		return <SidebarLayout runId={runId} configId={configId} />;
	}

	return <FloatingLayout runId={runId} configId={configId} />;
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
