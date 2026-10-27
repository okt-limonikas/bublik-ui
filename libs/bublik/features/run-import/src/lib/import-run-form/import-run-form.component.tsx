/* SPDX-License-Identifier: Apache-2.0 */
/* SPDX-FileCopyrightText: 2021-2023 OKTET Labs Ltd. */
import {
	ClipboardEvent as ReactClipboardEvent,
	forwardRef,
	Fragment,
	useCallback,
	useEffect,
	useImperativeHandle
} from 'react';
import { z } from 'zod';
import {
	Controller,
	useFieldArray,
	useForm,
	UseFormReturn,
	useWatch
} from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
	CheckIcon,
	ClipboardIcon,
	CrossCircledIcon,
	InfoCircledIcon,
	Link2Icon
} from '@radix-ui/react-icons';

import {
	ButtonTw,
	cn,
	FormAlertError,
	Icon,
	toast,
	Tooltip
} from '@/shared/tailwind-ui';
import {
	ImportRunInput,
	ImportRunsFormSchema,
	ImportRunsFormValues
} from '@/shared/types';

import { stringToArray } from './import-run-form.utils';
import { RangeChip } from './range-chip.component';

export type ImportUrlStats = {
	/** Rows with a URL that can be sent */
	ready: number;
	/** Rows whose text is not a URL */
	invalid: number;
};

export interface ImportRunFormProps {
	/** The form element's id, for a submit button outside it */
	id: string;
	/** The project every run is imported into; null takes meta_data.json's */
	project: number | null;
	/** Import every run again; a pasted URL's ?force=true forces its own */
	force: boolean;
	onImportRunsSubmit?: (values: ImportRunsFormValues) => void;
	onStatsChange?: (stats: ImportUrlStats) => void;
}

const EMPTY_ROW: ImportRunInput = {
	url: '',
	force: null,
	range: null,
	project: null
};

const defaultValues: ImportRunsFormValues = { runs: [EMPTY_ROW] };

const isImportableUrl = (url: string) =>
	z.string().url().safeParse(url).success;

/** Rows from pasted text, or null when any of it is not a URL */
function parsePastedUrls(text: string): ImportRunInput[] | null {
	const urls = stringToArray(text).filter(Boolean);
	if (!urls.length || !urls.every(isImportableUrl)) return null;

	return urls.map((value) => {
		const u = new URL(value);
		const url = [u.protocol, '//', u.host, u.pathname].join('');
		const force = u.searchParams.get('force') === 'true';
		const from = u.searchParams.get('from');
		const to = u.searchParams.get('to');
		const range =
			from && to ? { startDate: new Date(from), endDate: new Date(to) } : null;

		return { url, force, range, project: null };
	});
}

export type ImportRunFormHandle = {
	form: UseFormReturn<ImportRunsFormValues>;
};

export const ImportRunForm = forwardRef<
	ImportRunFormHandle,
	ImportRunFormProps
>(({ id, project, force, onImportRunsSubmit, onStatsChange }, ref) => {
	const formControl = useForm<ImportRunsFormValues>({
		defaultValues,
		resolver: zodResolver(ImportRunsFormSchema)
	});

	useImperativeHandle(ref, () => ({ form: formControl }), [formControl]);

	const { fields, append, remove, replace } = useFieldArray({
		name: 'runs',
		control: formControl.control
	});
	const runs = useWatch({ control: formControl.control, name: 'runs' });

	// One empty row stays last, so the next URL always has somewhere to go.
	const lastUrl = runs[runs.length - 1]?.url;
	useEffect(() => {
		if (lastUrl === undefined || lastUrl)
			append(EMPTY_ROW, { shouldFocus: false });
	}, [lastUrl, append]);

	const ready = runs.filter(
		(run) => run.url && isImportableUrl(run.url)
	).length;
	const invalid = runs.filter(
		(run) => run.url && !isImportableUrl(run.url)
	).length;
	useEffect(() => {
		onStatsChange?.({ ready, invalid });
	}, [ready, invalid, onStatsChange]);

	/** Puts pasted rows in place of row `at`, or after the filled rows */
	const insertRows = useCallback(
		(pasted: ImportRunInput[], at?: number) => {
			const current = formControl.getValues('runs');
			const before = at === undefined ? current : current.slice(0, at);
			const after = at === undefined ? [] : current.slice(at + 1);
			replace([...before, ...pasted, ...after].filter((run) => run.url.trim()));
		},
		[formControl, replace]
	);

	useEffect(() => {
		const handlePaste = (e: ClipboardEvent) => {
			if ((e.target as HTMLElement).tagName === 'INPUT') return;
			const text = e.clipboardData?.getData('text');
			if (!text) return;

			const pasted = parsePastedUrls(text);
			if (!pasted) return toast.error('Pasted URLs are incorrect!');

			e.preventDefault();
			insertRows(pasted);
		};

		document.addEventListener('paste', handlePaste);
		return () => document.removeEventListener('paste', handlePaste);
	}, [insertRows]);

	const handleRowPaste = (
		e: ReactClipboardEvent<HTMLInputElement>,
		idx: number
	) => {
		const text = e.clipboardData.getData('text');
		// A single URL pastes into the field as usual.
		if (stringToArray(text).filter(Boolean).length < 2) return;

		const pasted = parsePastedUrls(text);
		if (!pasted) return;

		e.preventDefault();
		insertRows(pasted, idx);
	};

	const handlePasteList = async () => {
		try {
			const pasted = parsePastedUrls(await navigator.clipboard.readText());
			if (!pasted) return toast.error('The clipboard holds no list of URLs');
			insertRows(pasted);
		} catch {
			toast.error('The browser did not allow reading the clipboard', {
				description: 'Press Ctrl+V (⌘V) in this dialog instead'
			});
		}
	};

	const rootError = formControl.formState.errors.root?.message;

	return (
		<form
			id={id}
			className="flex flex-col gap-2.5"
			onSubmit={formControl.handleSubmit((form) =>
				onImportRunsSubmit?.({
					...form,
					runs: form.runs
						.filter((run) => run.url)
						.map((run) => ({ ...run, project, force: force || !!run.force }))
				})
			)}
		>
			{rootError ? (
				<FormAlertError title="Error" description={rootError} />
			) : null}
			<h3 className="text-[0.8125rem] font-semibold text-text-secondary">
				Log folders{' '}
				<span className="font-normal text-text-menu">
					· a log server&apos;s http(s):// folder or an s3:// prefix, holding
					meta_data.json or many runs below it
				</span>
			</h3>
			<div className="grid grid-cols-[minmax(0,1fr)_240px_40px] gap-2 items-center">
				{fields.map((field, idx) => (
					<UrlRow
						key={field.id}
						idx={idx}
						formApi={formControl}
						run={runs[idx] ?? EMPTY_ROW}
						isLast={idx === fields.length - 1}
						onRemove={() => remove(idx)}
						onPaste={(e) => handleRowPaste(e, idx)}
					/>
				))}
			</div>
			<div className="flex items-center gap-3 text-xs text-text-menu">
				<ButtonTw
					type="button"
					variant="secondary"
					size="xs"
					className="shrink-0"
					onClick={handlePasteList}
				>
					<ClipboardIcon className="mr-1.5" />
					Paste a list
				</ButtonTw>
				<p>
					or paste several URLs into a row to add a row for each.{' '}
					<Code>?from=</Code>, <Code>?to=</Code> and <Code>?force=true</Code>{' '}
					fill the row&apos;s settings.
				</p>
			</div>
			<p className="flex items-center gap-2 text-xs text-text-menu">
				<InfoCircledIcon className="shrink-0 size-3.5 text-primary" />
				<span>
					<Code>s3://</Code> imports runs already in S3; the URL must start with
					an S3 logs base from the project&apos;s references config.
				</span>
			</p>
		</form>
	);
});

function Tag({ children }: { children: string }) {
	return (
		<span className="shrink-0 px-1.5 rounded bg-primary-wash text-[0.6875rem] font-medium leading-5 text-primary">
			{children}
		</span>
	);
}

function Code({ children }: { children: string }) {
	return <code className="font-mono text-[0.6875rem]">{children}</code>;
}

type UrlRowProps = {
	idx: number;
	formApi: UseFormReturn<ImportRunsFormValues>;
	run: ImportRunInput;
	isLast: boolean;
	onRemove: () => void;
	onPaste: (e: ReactClipboardEvent<HTMLInputElement>) => void;
};

const UrlRow = ({
	idx,
	formApi,
	run,
	isLast,
	onRemove,
	onPaste
}: UrlRowProps) => {
	const name = `runs.${idx}.url` as const;
	const { error, isTouched } = formApi.getFieldState(name, formApi.formState);
	const isValid = Boolean(run.url) && isImportableUrl(run.url);
	const showFormatError =
		Boolean(run.url) &&
		!isValid &&
		(isTouched || formApi.formState.isSubmitted);
	const message =
		error?.message ??
		(showFormatError
			? 'Enter the full URL, starting with http://, https:// or s3://'
			: undefined);

	return (
		<Fragment>
			<div
				className={cn(
					'flex items-center gap-2.5 h-10 px-3 rounded border bg-bg-primary transition-colors',
					'focus-within:border-primary focus-within:shadow-text-field',
					message
						? 'border-text-unexpected focus-within:border-text-unexpected focus-within:shadow-text-field-error'
						: 'border-border-input hover:border-primary'
				)}
			>
				{message ? (
					<CrossCircledIcon
						className="shrink-0 size-4 text-text-unexpected"
						role="img"
						aria-label="Error"
					/>
				) : isValid ? (
					<CheckIcon
						className="shrink-0 size-4 text-text-expected"
						role="img"
						aria-label="Ready"
					/>
				) : (
					<Link2Icon
						className="shrink-0 size-4 text-text-menu"
						aria-hidden="true"
					/>
				)}
				<input
					{...formApi.register(name)}
					aria-label={`Log folder URL ${idx + 1}`}
					aria-invalid={Boolean(message)}
					placeholder="Paste a log folder URL or s3:// prefix…"
					autoFocus={idx === 0}
					onPaste={onPaste}
					className="flex-1 min-w-0 h-full p-0 bg-transparent border-0 outline-none shadow-none ring-0 focus:border-0 focus:outline-none focus:shadow-none focus:ring-0 text-sm text-text-primary placeholder:text-text-menu"
				/>
				{isValid && !message && run.url.startsWith('s3://') ? (
					<Tag>S3</Tag>
				) : null}
				{isValid && !message && run.force ? <Tag>forced</Tag> : null}
			</div>
			<Controller
				control={formApi.control}
				name={`runs.${idx}.range`}
				render={({ field }) => (
					<RangeChip
						label={`Dates of row ${idx + 1}`}
						value={field.value}
						onChange={field.onChange}
					/>
				)}
			/>
			{isLast ? (
				<span />
			) : (
				<Tooltip content="Remove row">
					<ButtonTw
						type="button"
						variant="ghost"
						aria-label={`Remove row ${idx + 1}`}
						onClick={onRemove}
						className="grid size-10 p-0 rounded place-items-center text-text-menu hover:text-text-unexpected"
					>
						<Icon name="CrossSimple" size={18} />
					</ButtonTw>
				</Tooltip>
			)}
			{message ? (
				<p className="col-span-3 -mt-1 mb-0.5 ml-3 text-xs text-text-unexpected">
					{message}
				</p>
			) : null}
		</Fragment>
	);
};
