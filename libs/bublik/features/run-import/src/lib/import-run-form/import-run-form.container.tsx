/* SPDX-License-Identifier: Apache-2.0 */
/* SPDX-FileCopyrightText: 2021-2023 OKTET Labs Ltd. */
import { ReactNode, useRef, useState } from 'react';
import { z } from 'zod';
import type { Path } from 'react-hook-form';
import { CodeIcon, Link2Icon, UploadIcon } from '@radix-ui/react-icons';

import { analyticsEventNames, trackEvent } from '@/bublik/features/analytics';
import { useAuth } from '@/bublik/features/auth';
import { ImportRunsJobResponse, ImportRunsFormValues } from '@/shared/types';
import {
	bublikAPI,
	getUploadRunTarUrl,
	useImportRunsMutation
} from '@/services/bublik-api';
import {
	ButtonTw,
	Checkbox,
	cn,
	DialogClose,
	FormAlertError,
	Icon,
	SelectInput,
	toast
} from '@/shared/tailwind-ui';
import { setErrorsOnForm } from '@/shared/utils';

import {
	CurlUploadGuide,
	ImportRunUploadForm,
	useRunTarUploads
} from '../import-run-upload';

import {
	ImportRunForm,
	ImportRunFormHandle,
	ImportUrlStats
} from './import-run-form.component';
import { ImportRunFormModal } from './import-run-form-modal.component';
import { RunImportResult } from './import-run-form-result-list.component';
import type { ImportSource } from './import-run-form.types';

type FormState = 'form' | 'result';
type ImportRunsErrorPath = Path<ImportRunsFormValues> | 'root';

type ImportRunsIndexedError = {
	failedRunIndex?: number;
	data?: {
		messages?: string | string[] | Record<string, string | string[]>;
	};
	description?: string;
	failedRunErrors?: ImportRunsIndexedError[];
};

const isImportRunsBatchError = (
	error: unknown
): error is ImportRunsIndexedError => {
	return (
		typeof error === 'object' &&
		error !== null &&
		'failedRunErrors' in error &&
		Array.isArray(error.failedRunErrors)
	);
};

const getImportRunErrorPath = (
	field: string,
	runIndex: number
): ImportRunsErrorPath => {
	if (field === 'url') return `runs.${runIndex}.url`;

	return 'root';
};

const getFirstMessage = (message: string | string[]) =>
	Array.isArray(message) ? message[0] ?? 'Unknown error!' : message;

export const useImportTasks = () => {
	const [importRuns, { isLoading: isImporting }] = useImportRunsMutation();
	const [step, setStep] = useState<FormState>('form');
	const [importJobs, setImportJobs] = useState<ImportRunsJobResponse[]>([]);
	const importFormRef = useRef<ImportRunFormHandle>(null);

	const onFormSubmit = async ({ runs }: ImportRunsFormValues) => {
		const form = importFormRef.current?.form;
		if (!form) return;

		const validRunIndexes = runs.reduce<number[]>(
			(indexes, run, index) =>
				z.string().url().safeParse(run.url).success
					? [...indexes, index]
					: indexes,
			[]
		);
		const onlyUrls = validRunIndexes.map((index) => runs[index]);

		try {
			trackEvent(analyticsEventNames.importRunsSubmit, {
				providedRunsCount: runs.length,
				validRunsCount: onlyUrls.length
			});

			if (!onlyUrls.length) {
				form.setError('root', {
					message: 'You must enter at least one valid URL'
				});
				return;
			}

			const results = await importRuns(onlyUrls).unwrap();

			const taskCount = results.reduce(
				(sum, job) => sum + job.job_tasks_data.length,
				0
			);

			trackEvent(analyticsEventNames.importRunsSubmit, {
				providedRunsCount: runs.length,
				validRunsCount: onlyUrls.length,
				status: 'success',
				taskCount
			});

			setStep('result');
			setImportJobs(results);
		} catch (e: unknown) {
			trackEvent(analyticsEventNames.importRunsSubmit, {
				providedRunsCount: runs.length,
				status: 'error'
			});

			if (!isImportRunsBatchError(e)) {
				setErrorsOnForm(e, { handle: form });
				return;
			}

			e.failedRunErrors?.forEach((requestError) => {
				const messages = requestError.data?.messages;

				if (typeof messages === 'string' || Array.isArray(messages)) {
					form.setError('root', {
						type: 'custom',
						message: getFirstMessage(messages)
					});
					return;
				}

				if (!messages) {
					form.setError('root', {
						type: 'custom',
						message: requestError.description ?? 'Unknown error!'
					});
					return;
				}

				Object.entries(messages).forEach(([field, message]) => {
					const runIndex =
						typeof requestError.failedRunIndex === 'number'
							? validRunIndexes[requestError.failedRunIndex]
							: undefined;
					const path =
						runIndex == null ? 'root' : getImportRunErrorPath(field, runIndex);

					form.setError(path, {
						type: 'custom',
						message: getFirstMessage(message)
					});
				});
			});
		}
	};

	const onFormClose = () => {
		setStep('form');
		setImportJobs([]);
	};

	const showResults = (jobs: ImportRunsJobResponse[]) => {
		setImportJobs(jobs);
		setStep('result');
	};

	return {
		step,
		onFormClose,
		showResults,
		onFormSubmit,
		importJobs,
		importFormRef,
		isImporting
	};
};

const URL_FORM_ID = 'import-runs-form';
const META_PROJECT_VALUE = 'meta';

const SOURCES: { value: ImportSource; label: string; icon: ReactNode }[] = [
	{ value: 'url', label: 'Log server URLs', icon: <Link2Icon /> },
	{ value: 'upload', label: 'Upload .tar', icon: <UploadIcon /> },
	{ value: 'script', label: 'From a script', icon: <CodeIcon /> }
];

const plural = (count: number, one: string, many = `${one}s`) =>
	`${count} ${count === 1 ? one : many}`;

interface SourceTabsProps {
	value: ImportSource;
	disabled: boolean;
	onChange: (value: ImportSource) => void;
}

function SourceTabs({ value, disabled, onChange }: SourceTabsProps) {
	return (
		<div
			role="tablist"
			aria-label="Import source"
			className="flex gap-1 p-1 mx-8 mt-5 w-fit rounded-[10px] bg-bg-body"
		>
			{SOURCES.map((source) => (
				<button
					key={source.value}
					type="button"
					role="tab"
					aria-selected={value === source.value}
					disabled={disabled}
					onClick={() => onChange(source.value)}
					className={cn(
						'flex items-center gap-2 h-9 px-3.5 rounded-[7px] text-sm font-medium transition-colors',
						'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 disabled:cursor-not-allowed',
						value === source.value
							? 'bg-primary text-white'
							: 'text-text-secondary enabled:hover:bg-primary-wash enabled:hover:text-primary'
					)}
				>
					{source.icon}
					{source.label}
				</button>
			))}
		</div>
	);
}

function Footer({ children }: { children: ReactNode }) {
	return (
		<footer className="flex items-center justify-between gap-6 px-8 py-4 border-t border-border-primary">
			{children}
		</footer>
	);
}

export const ImportRunFormContainer = () => {
	const {
		step,
		onFormClose,
		onFormSubmit,
		showResults,
		importJobs,
		importFormRef,
		isImporting
	} = useImportTasks();
	const tarUploads = useRunTarUploads();
	const { isAdmin } = useAuth();
	const [source, setSource] = useState<ImportSource>('url');
	const [project, setProject] = useState<number | null>(null);
	const [force, setForce] = useState(false);
	const [urlStats, setUrlStats] = useState<ImportUrlStats>({
		ready: 0,
		invalid: 0
	});
	const { data, error, isLoading } = bublikAPI.useGetAllProjectsQuery();

	const handleClose = () => {
		onFormClose();
		tarUploads.reset();
		setForce(false);
	};

	const handleFiles = (accepted: File[], rejected: File[]) => {
		tarUploads.addFiles(accepted);
		if (rejected.length) {
			toast.error(
				`Only .tar files can be uploaded: ${rejected
					.map((f) => f.name)
					.join(', ')}`
			);
		}
	};

	const pendingCount = tarUploads.uploads.filter(
		(u) => u.status === 'queued' || u.status === 'error'
	).length;

	const handleUploadSubmit = async () => {
		const responses = await tarUploads.start({ project, force });
		// Stay on the form while any file failed, so its error stays visible.
		if (responses.length && responses.length === pendingCount)
			showResults(responses);
	};

	const isBusy = isImporting || tarUploads.isUploading;
	// Uploading takes an admin, and so does the script's token.
	const activeSource: ImportSource = isAdmin ? source : 'url';

	const projectOptions = [
		{
			value: META_PROJECT_VALUE,
			displayValue: "Auto · from each run's meta_data.json"
		},
		...(data ?? []).map((p) => ({
			value: p.id.toString(),
			displayValue: p.name
		}))
	];

	if (step === 'result') {
		return (
			<ImportRunFormModal
				description="Scheduled runs will be imported in the background"
				onClose={handleClose}
				preventClose={isBusy}
			>
				<main className="flex-1 min-h-0 overflow-y-auto px-8 py-6">
					<RunImportResult results={importJobs} />
				</main>
				<Footer>
					<span />
					<div className="flex items-center gap-3">
						<ButtonTw
							variant="secondary"
							onClick={() => {
								onFormClose();
								tarUploads.reset();
							}}
						>
							Import more
						</ButtonTw>
						<DialogClose asChild>
							<ButtonTw variant="primary">Done</ButtonTw>
						</DialogClose>
					</div>
				</Footer>
			</ImportRunFormModal>
		);
	}

	const summary = {
		url: [
			urlStats.ready ? `${plural(urlStats.ready, 'URL')} ready` : null,
			urlStats.invalid
				? `${plural(urlStats.invalid, 'URL')} need${
						urlStats.invalid === 1 ? 's' : ''
				  } fixing`
				: null
		]
			.filter(Boolean)
			.join(' · '),
		upload: pendingCount ? `${plural(pendingCount, 'file')} ready` : '',
		script: ''
	}[activeSource];

	const spinner = (
		<Icon name="ProgressIndicator" className="mr-1.5 animate-spin" />
	);

	return (
		<ImportRunFormModal
			description="Bring test runs into Bublik from a log server or as log tarballs."
			onClose={handleClose}
			preventClose={isBusy}
		>
			{isAdmin ? (
				<SourceTabs
					value={activeSource}
					disabled={isBusy}
					onChange={setSource}
				/>
			) : null}
			<main className="flex-1 min-h-0 overflow-y-auto flex flex-col gap-6 px-8 py-6">
				{error ? (
					<FormAlertError title="Error" description="Failed to load projects" />
				) : null}
				<div className="grid grid-cols-[360px_minmax(0,1fr)] gap-6 items-start pt-1.5">
					<div className="flex flex-col gap-1.5">
						<div data-testid="import-project">
							<SelectInput
								label="Project"
								options={projectOptions}
								value={
									project == null ? META_PROJECT_VALUE : project.toString()
								}
								onValueChange={(value) =>
									setProject(
										value === META_PROJECT_VALUE ? null : parseInt(value)
									)
								}
								disabled={isBusy || isLoading}
							/>
						</div>
						<p className="px-1 text-xs text-text-menu">
							Runs without <code className="font-mono">PROJECT</code> in
							meta_data.json need one here.
						</p>
					</div>
					{/* Laid out like the Project field, so both hints share a line. */}
					<div className="flex flex-col gap-1.5">
						<div className="flex items-center gap-2.5 h-10">
							<Checkbox
								id="force-import"
								checked={force}
								onCheckedChange={(checked) => setForce(checked === true)}
								disabled={isBusy}
								aria-label="Force import for all runs"
								aria-describedby="force-import-hint"
							/>
							<label
								htmlFor="force-import"
								className="text-sm font-medium text-text-primary"
							>
								Force import
							</label>
						</div>
						<p
							id="force-import-hint"
							className="pl-[2.125rem] text-xs text-text-menu"
						>
							Re-import runs Bublik already has
						</p>
					</div>
				</div>
				{activeSource === 'url' ? (
					<ImportRunForm
						id={URL_FORM_ID}
						project={project}
						force={force}
						onImportRunsSubmit={onFormSubmit}
						onStatsChange={setUrlStats}
						ref={importFormRef}
					/>
				) : activeSource === 'upload' ? (
					<ImportRunUploadForm
						uploads={tarUploads.uploads}
						isUploading={tarUploads.isUploading}
						onFiles={handleFiles}
						onRemove={tarUploads.remove}
					/>
				) : (
					<CurlUploadGuide
						uploadUrl={getUploadRunTarUrl()}
						project={project}
						force={force}
					/>
				)}
			</main>
			<Footer>
				<span
					className="text-[0.8125rem] text-text-menu"
					data-testid="import-summary"
				>
					{summary}
				</span>
				<div className="flex items-center gap-2">
					<DialogClose asChild>
						<ButtonTw variant="secondary">
							{activeSource === 'script' ? 'Close' : 'Cancel'}
						</ButtonTw>
					</DialogClose>
					{activeSource === 'url' ? (
						<ButtonTw
							type="submit"
							form={URL_FORM_ID}
							variant="primary"
							disabled={isBusy || urlStats.ready === 0}
						>
							{isImporting ? spinner : null}
							{isImporting
								? 'Creating import jobs…'
								: urlStats.ready > 1
								? `Import ${urlStats.ready} URLs`
								: 'Import'}
						</ButtonTw>
					) : null}
					{activeSource === 'upload' ? (
						<ButtonTw
							type="button"
							variant="primary"
							disabled={isBusy || pendingCount === 0}
							onClick={handleUploadSubmit}
						>
							{tarUploads.isUploading ? spinner : null}
							{tarUploads.isUploading
								? 'Uploading…'
								: `Upload and import${
										pendingCount > 1 ? ` ${pendingCount} files` : ''
								  }`}
						</ButtonTw>
					) : null}
				</div>
			</Footer>
		</ImportRunFormModal>
	);
};
