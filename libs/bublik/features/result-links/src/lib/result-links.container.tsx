/* SPDX-License-Identifier: Apache-2.0 */
/* SPDX-FileCopyrightText: 2021-2023 OKTET Labs Ltd. */
import { useCallback, useState } from 'react';
import { Link } from 'react-router-dom';

import {
	HistoryMode,
	RunDataResults,
	RunDetailsAPIResponse
} from '@/shared/types';
import {
	getErrorMessage,
	useGetLogJsonQuery,
	useGetRunDetailsQuery,
	useGetTreeByRunIdQuery,
	usePrefetch
} from '@/services/bublik-api';
import { routes } from '@/router';
import {
	ButtonTw,
	CardHeader,
	cn,
	DialogClose,
	DialogOverlay,
	dialogOverlayStyles,
	DialogPortal,
	DrawerContent,
	DrawerRoot,
	DrawerTrigger,
	getBugProps,
	Icon,
	NewBugButton,
	Skeleton
} from '@/shared/tailwind-ui';
import { useUserPreferences } from '@/bublik/features/user-preferences';
import {
	LogTableContextProvider,
	SessionRoot
} from '@/bublik/features/session-log';

import { LinkToHistory } from './link-to-history';

export interface ResultLinksProps {
	runId: string;
	resultId: number;
	result: RunDataResults;
	runInfo: RunDetailsAPIResponse;
	userPreferredHistoryMode?: HistoryMode;
	hasMeasurements?: boolean;
	onMeasurementLinkMouseEnter?: () => void;
	onLogLinkMouseEnter?: () => void;
	showLinkToRun?: boolean;
}

export const ResultLinks = (props: ResultLinksProps) => {
	const {
		runId,
		resultId,
		hasMeasurements,
		result,
		runInfo,
		userPreferredHistoryMode = 'linear',
		onLogLinkMouseEnter,
		onMeasurementLinkMouseEnter,
		showLinkToRun = false
	} = props;

	return (
		<div className="flex flex-col justify-start gap-3 text-primary text-[0.6875rem] font-semibold leading-[0.875rem]">
			<ul className="flex flex-col items-start gap-3">
				{showLinkToRun ? (
					<li className="pl-2">
						<Link
							className="flex items-center w-full gap-1"
							to={routes.run({ runId })}
						>
							<Icon name="Paper" className="size-5" />
							Run {runId}
						</Link>
					</li>
				) : null}
				<li className="pl-2">
					<Link
						className="flex items-center w-full gap-1"
						onMouseEnter={onLogLinkMouseEnter}
						to={routes.log({ runId, focusId: resultId })}
					>
						<Icon name="BoxArrowRight" className="grid place-items-center" />
						Log
					</Link>
				</li>
				<li className="pl-2">
					<LinkToHistory
						result={result}
						runDetails={runInfo}
						userPreferredHistoryMode={userPreferredHistoryMode}
					/>
				</li>
				{hasMeasurements && (
					<li className="pl-2">
						<Link
							className="flex items-center gap-1"
							to={routes.measurements({ runId, resultId })}
							onMouseEnter={onMeasurementLinkMouseEnter}
						>
							<Icon name="BoxArrowRight" className="grid place-items-center" />
							Measure
						</Link>
					</li>
				)}
				<li className="pl-2">
					<LogPreviewContainer
						logName={result.name}
						resultId={resultId}
						runId={Number(runId)}
					/>
				</li>
			</ul>
		</div>
	);
};

interface LogPreviewContainerProps {
	resultId: number;
	runId: number;
	logName: string;
}

function LogPreviewContainer(props: LogPreviewContainerProps) {
	const { resultId, runId, logName } = props;
	const [open, setOpen] = useState(false);

	return (
		<DrawerRoot onOpenChange={setOpen}>
			<DrawerTrigger asChild>
				<button className="flex items-center w-full gap-1">
					<Icon
						name="ExpandSelection"
						size={20}
						className="grid place-items-center"
					/>
					<span>Preview</span>
				</button>
			</DrawerTrigger>
			<DialogOverlay className={dialogOverlayStyles()} />
			<DialogPortal>
				<DrawerContent asChild>
					<div className="bg-white flex flex-col h-[95vh] w-[80vw]">
						{/* To fetch only on mount. Do not remove check */}
						{open ? (
							<div className="h-full flex flex-col overflow-hidden">
								<div className="flex-1">
									<CardHeader label={logName}>
										<div className="flex items-center gap-4">
											<ButtonTw asChild variant="secondary" size="xss">
												<Link
													to={routes.log({ runId, focusId: resultId })}
													target="_blank"
												>
													<Icon name="BoxArrowRight" className="mr-1.5" />
													Log
												</Link>
											</ButtonTw>
											<NewBug runId={runId} resultId={resultId} />
											<DialogClose asChild>
												<ButtonTw variant={'secondary'} size={'xss'}>
													<Icon name="CrossSimple" size={20} />
												</ButtonTw>
											</DialogClose>
										</div>
									</CardHeader>
								</div>
								<LogPreview resultId={resultId} />
							</div>
						) : null}
					</div>
				</DrawerContent>
			</DialogPortal>
		</DrawerRoot>
	);
}

interface NewBugProps {
	runId: number;
	resultId: number;
}

function NewBug(props: NewBugProps) {
	const { data: details } = useGetRunDetailsQuery(props.runId);
	const { data: log } = useGetLogJsonQuery({ id: props.resultId });
	const { data: tree } = useGetTreeByRunIdQuery(String(props.runId));

	if (!details || !tree || !log) return null;

	return (
		<NewBugButton
			{...getBugProps({
				runId: props.runId,
				id: props.resultId ?? Number(props.runId),
				log,
				tree,
				details
			})}
		/>
	);
}

interface LogPreviewProps {
	resultId: number;
}

function LogPreview(props: LogPreviewProps) {
	const { resultId } = props;
	const [page, setPage] = useState<number | undefined>();
	const { data, error, isLoading, isFetching } = useGetLogJsonQuery({
		id: resultId,
		page: typeof page !== 'undefined' ? page.toString() : undefined
	});

	const handlePageClick = useCallback(
		(_: string, page: number) => {
			setPage(page);
		},
		[setPage]
	);

	if (isLoading) {
		return <LogPreviewLoading />;
	}

	if (error) {
		return <LogPreviewError error={error} />;
	}

	if (!data) {
		return <LogPreviewEmpty />;
	}

	return (
		<div
			className={cn(
				'overflow-auto flex-grow px-2 isolate',
				isFetching && 'pointer-events-none opacity-40'
			)}
		>
			<LogTableContextProvider onPageClick={handlePageClick}>
				<SessionRoot root={data} />
			</LogTableContextProvider>
		</div>
	);
}

interface LogPreviewErrorProps {
	error: unknown;
}

function LogPreviewError({ error }: LogPreviewErrorProps) {
	const { description, status, title } = getErrorMessage(error);

	return (
		<div className="mx-auto w-full h-full grid place-items-center">
			<div className="flex items-center gap-4">
				<Icon
					name="TriangleExclamationMark"
					size={48}
					className="text-text-unexpected"
				/>
				<div className="">
					<h1 className="text-2xl font-semibold">
						{status} {title}
					</h1>
					<p>{description}</p>
				</div>
			</div>
		</div>
	);
}

function LogPreviewLoading() {
	return (
		<div className="w-full h-full p-2">
			<Skeleton className="w-full h-full rounded" />
		</div>
	);
}

function LogPreviewEmpty() {
	return <div>No log data...</div>;
}

export interface ActionLinksProps {
	runId: string;
	resultId: number;
	result: RunDataResults;
	showLinkToRun?: boolean;
}

export const ResultLinksContainer = (props: ActionLinksProps) => {
	const { runId, resultId, result, showLinkToRun = false } = props;
	const { has_measurements: hasMeasurements } = result;
	const { data: runInfo } = useGetRunDetailsQuery(runId);
	const { userPreferences } = useUserPreferences();

	const prefetchLogURL = usePrefetch('getLogUrlByResultId');
	const prefetchHistory = usePrefetch('getHistoryLinkDefaults');
	const prefetchMeasurements = usePrefetch('getSingleMeasurement');
	const prefetchMeasurementsHeader = usePrefetch('getResultInfo');

	const handleLogLinkMouseEnter = () => {
		prefetchLogURL(resultId);
		prefetchHistory(resultId);
	};

	const handleMeasurementLinkMouseEnter = () => {
		prefetchMeasurements(resultId);
		prefetchMeasurementsHeader(resultId);
	};

	if (!runInfo) return null;

	return (
		<ResultLinks
			resultId={resultId}
			runId={runId}
			runInfo={runInfo}
			result={result}
			userPreferredHistoryMode={userPreferences.history.defaultMode}
			hasMeasurements={hasMeasurements}
			onLogLinkMouseEnter={handleLogLinkMouseEnter}
			onMeasurementLinkMouseEnter={handleMeasurementLinkMouseEnter}
			showLinkToRun={showLinkToRun}
		/>
	);
};
