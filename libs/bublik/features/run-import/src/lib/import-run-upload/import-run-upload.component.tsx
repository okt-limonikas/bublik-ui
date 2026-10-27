/* SPDX-License-Identifier: Apache-2.0 */
/* SPDX-FileCopyrightText: 2026 OKTET LTD */
import { ReactNode } from 'react';
import { Link, useSearchParams } from 'react-router-dom';

import {
	ButtonTw,
	cn,
	CodeBlock,
	FileDropzone,
	Icon,
	Tooltip
} from '@/shared/tailwind-ui';

import type { TarUpload, TarUploadStatus } from './use-run-tar-uploads';

const TAR_EXTENSIONS = ['.tar'];

const STATUS_LABEL: Record<TarUploadStatus, string> = {
	queued: 'Ready',
	uploading: 'Uploading',
	done: 'Uploaded',
	error: 'Failed'
};

function formatSize(bytes: number) {
	if (bytes < 1024) return `${bytes} B`;
	const units = ['KB', 'MB', 'GB'];
	let value = bytes / 1024;
	let unit = 0;
	while (value >= 1024 && unit < units.length - 1) {
		value /= 1024;
		unit += 1;
	}
	return `${value.toFixed(value < 10 ? 1 : 0)} ${units[unit]}`;
}

interface ImportRunUploadFormProps {
	uploads: TarUpload[];
	isUploading: boolean;
	onFiles: (accepted: File[], rejected: File[]) => void;
	onRemove: (id: string) => void;
}

/** The files to upload: a drop zone, and each file's progress or error */
function ImportRunUploadForm(props: ImportRunUploadFormProps) {
	const { uploads, isUploading } = props;

	return (
		<div className="flex flex-col flex-1 min-h-0 gap-4">
			<FileDropzone
				className="flex-1 min-h-[160px] rounded"
				accept={TAR_EXTENSIONS}
				multiple
				disabled={isUploading}
				onFiles={props.onFiles}
				label="Drop .tar files here or click to browse"
				description="A TE tarball (meta_data.json and raw_log_bundle.tpxz), or a bundle with bublik.json, json/ and attachments/"
			/>
			{uploads.length ? (
				<ul
					className="shrink-0 border rounded [&>*:not(:last-child)]:border-b [&>*]:border-border-primary"
					aria-label="Files to upload"
				>
					{uploads.map((upload) => (
						<UploadRow
							key={upload.id}
							upload={upload}
							disabled={isUploading}
							onRemove={() => props.onRemove(upload.id)}
						/>
					))}
				</ul>
			) : null}
		</div>
	);
}

interface UploadRowProps {
	upload: TarUpload;
	disabled: boolean;
	onRemove: () => void;
}

function UploadRow({ upload, disabled, onRemove }: UploadRowProps) {
	const percent = Math.round(upload.progress * 100);

	return (
		<li
			className="flex flex-col gap-2 p-3"
			data-testid="tar-upload"
			data-status={upload.status}
		>
			<div className="flex items-center gap-3">
				<Icon name="FilePlus" size={20} className="text-primary shrink-0" />
				<span className="text-sm font-medium truncate" title={upload.file.name}>
					{upload.file.name}
				</span>
				<span className="text-xs text-gray-500 shrink-0">
					{formatSize(upload.file.size)}
				</span>
				<span
					className={cn(
						'ml-auto text-xs font-medium shrink-0',
						upload.status === 'done' && 'text-text-expected',
						upload.status === 'error' && 'text-text-unexpected',
						upload.status === 'uploading' && 'text-primary'
					)}
				>
					{upload.status === 'uploading'
						? `${STATUS_LABEL.uploading} ${percent}%`
						: STATUS_LABEL[upload.status]}
				</span>
				{upload.status !== 'done' && upload.status !== 'uploading' ? (
					<Tooltip content="Remove">
						<ButtonTw
							variant="ghost"
							size="xss"
							onClick={onRemove}
							disabled={disabled}
							aria-label={`Remove ${upload.file.name}`}
						>
							<Icon name="CrossSimple" size={16} />
						</ButtonTw>
					</Tooltip>
				) : null}
			</div>
			{upload.status === 'uploading' ? (
				<div
					className="h-1.5 w-full overflow-hidden rounded bg-gray-100"
					role="progressbar"
					aria-valuemin={0}
					aria-valuemax={100}
					aria-valuenow={percent}
					aria-label={`Uploading ${upload.file.name}`}
				>
					<div
						className="h-full bg-primary transition-[width]"
						style={{ width: `${percent}%` }}
					/>
				</div>
			) : null}
			{upload.error ? (
				<p className="text-xs text-text-unexpected whitespace-pre-wrap break-words">
					{upload.error}
				</p>
			) : null}
		</li>
	);
}

interface CurlCommandOptions {
	uploadUrl: string;
	project: number | null;
	force: boolean;
}

/** The curl command that uploads `logs.tar` the way this form would */
function getCurlCommand({ uploadUrl, project, force }: CurlCommandOptions) {
	const fields = [
		'-F file=@logs.tar',
		project != null ? `-F project=${project}` : null,
		force ? '-F force=true' : null
	].filter(Boolean);

	return [
		'curl -H "Authorization: Bearer $BUBLIK_TOKEN" \\',
		`  ${fields.join(' ')} \\`,
		`  ${uploadUrl}`
	].join('\n');
}

/** The instance's root, from its upload URL */
const baseUrlOf = (uploadUrl: string) =>
	uploadUrl.replace(/api\/v2\/importruns\/upload\/?$/, '');

/** A CI script: upload, then poll the job until its import has finished */
function getWaitScript(options: CurlCommandOptions) {
	const base = baseUrlOf(options.uploadUrl);
	const upload = getCurlCommand(options).replace('curl -H', 'curl -s -H');

	return [
		`job=$(${upload} | jq -r .job_id)`,
		'',
		'while :; do',
		'  status=$(curl -s -H "Authorization: Bearer $BUBLIK_TOKEN" \\',
		`    "${base}api/v2/session_import/?job=$job" \\`,
		"    | jq -r '.results[0].status')",
		'  case "$status" in SUCCESS|FAILURE) break ;; esac',
		'  sleep 5',
		'done',
		'echo "import $status"'
	].join('\n');
}

function getExampleResponse(uploadUrl: string) {
	const base = baseUrlOf(uploadUrl);
	const task = 'd8273803-c9f5-48bc-8b30-1a6c85db4689';
	const run = 's3://bublik-logs/uploads/my-ts/2026/10/27/my-cfg-10:11:12/';

	return JSON.stringify(
		{
			job_id: 42,
			job_tasks_data: [
				{
					run_source_url: run,
					celery_task_id: task,
					flower: `${base}flower/task/${task}`,
					import_log: `${base}importlog/${task}`
				}
			],
			url: run
		},
		null,
		2
	);
}

function Code({ children }: { children: ReactNode }) {
	return (
		<code className="bg-gray-100 px-1 py-0.5 rounded font-mono text-xs text-gray-700">
			{children}
		</code>
	);
}

function StepTitle({ children }: { children: ReactNode }) {
	return (
		<h3 className="text-[0.8125rem] font-semibold text-text-secondary">
			{children}
		</h3>
	);
}

/** How to upload from a script, and how to follow the import it starts */
function CurlUploadGuide(props: CurlCommandOptions) {
	const [searchParams] = useSearchParams();
	// Keep the page's own params, so closing Settings returns to the same view.
	const settingsSearch = new URLSearchParams(searchParams);
	settingsSearch.set('settings-open', '1');
	settingsSearch.set('settings-tab', 'tokens');

	return (
		<div className="flex flex-col gap-6 max-w-[880px] text-sm text-text-menu">
			<section className="flex flex-col gap-3 min-w-0">
				<StepTitle>1. Get a token</StepTitle>
				<p>
					Create an admin&apos;s access token in{' '}
					<Link
						to={{ search: `?${settingsSearch}` }}
						className="font-medium text-primary hover:underline"
					>
						Settings → Access Tokens
					</Link>{' '}
					and put it in <Code>BUBLIK_TOKEN</Code>. A dedicated user such as{' '}
					<Code>ci-uploader</Code> works well.
				</p>
				<StepTitle>2. Upload the tar</StepTitle>
				<CodeBlock
					code={getCurlCommand(props)}
					language="bash"
					title="bash"
					copyLabel="Copy curl command"
					data-testid="curl-upload-command"
				/>
				<p>The Project and Force import picked above are in the command.</p>
				<div className="flex flex-col gap-1">
					<p>
						<Code>logs.tar</Code> is either:
					</p>
					<ul className="flex flex-col gap-1 list-disc pl-5">
						<li>
							a TE tarball, <Code>te_logs.tar</Code> from{' '}
							<Code>publish_logs</Code>;
						</li>
						<li>
							a bundle with pages already made: <Code>meta_data.json</Code>,{' '}
							<Code>bublik.json</Code>, <Code>json/</Code> and{' '}
							<Code>attachments/</Code>, packed with{' '}
							<Code>tar -cf logs.tar -C &lt;dir&gt; .</Code>
						</li>
					</ul>
				</div>
			</section>
			<section className="flex flex-col gap-3 min-w-0">
				<StepTitle>3. Read the answer</StepTitle>
				<CodeBlock
					code={getExampleResponse(props.uploadUrl)}
					language="json"
					title="response"
					wrap
				/>
				<p>
					<Code>url</Code> is where the run is stored. Each entry of{' '}
					<Code>job_tasks_data</Code> is one run being imported, with its Celery
					task, its Flower page and its import log.
				</p>
				<StepTitle>4. Wait for the import</StepTitle>
				<p>
					<Code>/api/v2/session_import/?job=&lt;job_id&gt;</Code> lists the
					job&apos;s runs with their <Code>status</Code>: <Code>RECEIVED</Code>,{' '}
					<Code>RUNNING</Code>, then <Code>SUCCESS</Code> with the run&apos;s{' '}
					<Code>run_id</Code>, or <Code>FAILURE</Code> with its{' '}
					<Code>error_msg</Code>. In CI:
				</p>
				<CodeBlock
					code={getWaitScript(props)}
					language="bash"
					title="bash"
					copyLabel="Copy CI script"
					data-testid="curl-wait-script"
				/>
				<p>The import also shows in the table on this page.</p>
			</section>
		</div>
	);
}

export {
	CurlUploadGuide,
	ImportRunUploadForm,
	formatSize,
	getCurlCommand,
	getWaitScript,
	type ImportRunUploadFormProps
};
