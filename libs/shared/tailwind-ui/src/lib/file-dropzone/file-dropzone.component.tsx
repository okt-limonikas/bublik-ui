/* SPDX-License-Identifier: Apache-2.0 */
/* SPDX-FileCopyrightText: 2026 OKTET LTD */
import {
	DragEvent,
	KeyboardEvent,
	ReactNode,
	useId,
	useRef,
	useState
} from 'react';

import { Icon } from '../icon';
import { cn } from '../utils';

/**
 * Split files into the ones whose name ends in one of `extensions`
 * (case-insensitive, e.g. `['.tar']`) and the rest. No extensions accepts all.
 */
function partitionFilesByExtension(files: File[], extensions?: string[]) {
	if (!extensions?.length) return { accepted: files, rejected: [] as File[] };

	const suffixes = extensions.map((extension) => extension.toLowerCase());
	const accepted: File[] = [];
	const rejected: File[] = [];

	files.forEach((file) => {
		const name = file.name.toLowerCase();
		(suffixes.some((suffix) => name.endsWith(suffix))
			? accepted
			: rejected
		).push(file);
	});

	return { accepted, rejected };
}

interface FileDropzoneProps {
	/** Called with the files that match `accept` and those that don't */
	onFiles: (accepted: File[], rejected: File[]) => void;
	/** File name extensions to accept, e.g. `['.tar']` */
	accept?: string[];
	multiple?: boolean;
	disabled?: boolean;
	label?: ReactNode;
	description?: ReactNode;
	className?: string;
}

function FileDropzone({
	onFiles,
	accept,
	multiple = false,
	disabled = false,
	label = 'Drop files here or click to browse',
	description,
	className
}: FileDropzoneProps) {
	const inputId = useId();
	const inputRef = useRef<HTMLInputElement>(null);
	const [isDragging, setIsDragging] = useState(false);
	// dragenter/dragleave fire for every child element; count them so the
	// highlight doesn't flicker while the pointer moves over the content.
	const dragDepth = useRef(0);

	const handleFiles = (fileList: FileList | null) => {
		if (!fileList || disabled) return;

		const files = Array.from(fileList);
		const { accepted, rejected } = partitionFilesByExtension(
			multiple ? files : files.slice(0, 1),
			accept
		);
		onFiles(accepted, rejected);
	};

	const handleDragEnter = (event: DragEvent) => {
		event.preventDefault();
		if (disabled) return;
		dragDepth.current += 1;
		setIsDragging(true);
	};

	const handleDragLeave = (event: DragEvent) => {
		event.preventDefault();
		dragDepth.current = Math.max(0, dragDepth.current - 1);
		if (dragDepth.current === 0) setIsDragging(false);
	};

	const handleDrop = (event: DragEvent) => {
		event.preventDefault();
		dragDepth.current = 0;
		setIsDragging(false);
		handleFiles(event.dataTransfer.files);
	};

	const openPicker = () => {
		if (!disabled) inputRef.current?.click();
	};

	const handleKeyDown = (event: KeyboardEvent) => {
		if (event.key === 'Enter' || event.key === ' ') {
			event.preventDefault();
			openPicker();
		}
	};

	return (
		<div
			role="button"
			tabIndex={disabled ? -1 : 0}
			aria-disabled={disabled}
			aria-describedby={description ? `${inputId}-description` : undefined}
			data-testid="file-dropzone"
			data-dragging={isDragging || undefined}
			onClick={openPicker}
			onKeyDown={handleKeyDown}
			onDragEnter={handleDragEnter}
			onDragOver={(event) => event.preventDefault()}
			onDragLeave={handleDragLeave}
			onDrop={handleDrop}
			className={cn(
				'flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border-primary px-6 py-10 text-center transition-colors',
				'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
				disabled
					? 'cursor-not-allowed opacity-60'
					: 'cursor-pointer hover:border-primary hover:bg-primary-wash',
				isDragging && 'border-primary bg-primary-wash',
				className
			)}
		>
			<Icon name="FilePlus" size={32} className="text-primary" />
			<span className="text-sm font-medium text-text-primary">{label}</span>
			{description ? (
				<span id={`${inputId}-description`} className="text-xs text-text-menu">
					{description}
				</span>
			) : null}
			<input
				ref={inputRef}
				id={inputId}
				type="file"
				className="hidden"
				data-testid="file-dropzone-input"
				accept={accept?.join(',')}
				multiple={multiple}
				disabled={disabled}
				onClick={(event) => event.stopPropagation()}
				onChange={(event) => {
					handleFiles(event.target.files);
					// Allow picking the same file again after it was removed.
					event.target.value = '';
				}}
			/>
		</div>
	);
}

export { FileDropzone, partitionFilesByExtension, type FileDropzoneProps };
