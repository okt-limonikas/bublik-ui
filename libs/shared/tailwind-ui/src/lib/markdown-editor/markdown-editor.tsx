/* SPDX-License-Identifier: Apache-2.0 */
/* SPDX-FileCopyrightText: 2024-2026 OKTET LTD */
import {
	ComponentPropsWithoutRef,
	forwardRef,
	useCallback,
	useRef,
	useState
} from 'react';

import { ErrorMessage } from '../error-message';
import { cn, cva } from '../utils';

import { MarkdownPreview } from './markdown-preview';

const markdownEditorShellStyles = cva({
	base: 'overflow-hidden rounded-md border bg-white transition-all',
	variants: {
		hasError: {
			true: 'border-bg-error shadow-text-field-error',
			false:
				'border-border-primary focus-within:border-primary focus-within:shadow-text-field'
		}
	},
	defaultVariants: {
		hasError: false
	}
});

const markdownEditorTabStyles = cva({
	base: [
		'rounded px-2.5 py-1 text-[0.6875rem] font-semibold leading-[0.875rem] transition-colors',
		'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1'
	],
	variants: {
		active: {
			true: 'bg-white text-text-primary shadow-[inset_0_0_0_1px_hsl(var(--colors-border-primary))]',
			false: 'text-text-menu hover:text-primary'
		}
	},
	defaultVariants: {
		active: false
	}
});

const markdownEditorToolbarButtonStyles = cva({
	base: [
		'min-w-[1.75rem] rounded border border-border-primary bg-white px-2 py-1',
		'text-[0.6875rem] font-semibold leading-[0.875rem] text-text-primary transition-colors',
		'hover:border-primary hover:text-primary',
		'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1',
		'disabled:cursor-not-allowed disabled:border-border-primary disabled:text-text-menu disabled:hover:text-text-menu'
	]
});

type MarkdownEditorMode = 'edit' | 'preview';

interface MarkdownSelection {
	start: number;
	end: number;
}

interface MarkdownFormattedValue extends MarkdownSelection {
	value: string;
}

const createInlineFormat = (
	value: string,
	selection: MarkdownSelection,
	prefix: string,
	suffix: string,
	placeholder: string
): MarkdownFormattedValue => {
	const selectedText = value.slice(selection.start, selection.end);
	const content = selectedText || placeholder;
	const nextValue =
		value.slice(0, selection.start) +
		`${prefix}${content}${suffix}` +
		value.slice(selection.end);

	return {
		value: nextValue,
		start: selection.start + prefix.length,
		end: selection.start + prefix.length + content.length
	};
};

const createLineFormat = (
	value: string,
	selection: MarkdownSelection,
	lineFormatter: (line: string, index: number) => string,
	placeholder: string
): MarkdownFormattedValue => {
	const lineStart =
		value.lastIndexOf('\n', Math.max(0, selection.start - 1)) + 1;
	const lineEndIndex = value.indexOf('\n', selection.end);
	const lineEnd = lineEndIndex === -1 ? value.length : lineEndIndex;
	const selectedLines = value.slice(lineStart, lineEnd);
	const content = selectedLines || placeholder;
	const nextLines = content
		.split('\n')
		.map((line, index) => lineFormatter(line || placeholder, index))
		.join('\n');
	const nextValue =
		value.slice(0, lineStart) + nextLines + value.slice(lineEnd);

	return {
		value: nextValue,
		start: lineStart,
		end: lineStart + nextLines.length
	};
};

export interface MarkdownEditorProps
	extends Omit<ComponentPropsWithoutRef<'textarea'>, 'onChange' | 'value'> {
	value: string;
	onChange: (value: string) => void;
	error?: string;
	label?: string;
	mode?: MarkdownEditorMode;
	defaultMode?: MarkdownEditorMode;
	onModeChange?: (mode: MarkdownEditorMode) => void;
	showToolbar?: boolean;
	showModeToggle?: boolean;
	previewPlaceholder?: string;
	previewClassName?: string;
	textareaClassName?: string;
}

export const MarkdownEditor = forwardRef<
	HTMLTextAreaElement,
	MarkdownEditorProps
>((props, ref) => {
	const {
		value,
		onChange,
		error,
		label,
		mode,
		defaultMode = 'edit',
		onModeChange,
		showToolbar = true,
		showModeToggle = true,
		previewPlaceholder = 'Write markdown to preview it here.',
		previewClassName,
		textareaClassName,
		disabled,
		className,
		id,
		name,
		...textAreaProps
	} = props;
	const [uncontrolledMode, setUncontrolledMode] =
		useState<MarkdownEditorMode>(defaultMode);
	const textAreaRef = useRef<HTMLTextAreaElement | null>(null);
	const editorMode = mode ?? uncontrolledMode;
	const canEdit = !disabled && editorMode === 'edit';

	const setTextAreaRef = useCallback(
		(node: HTMLTextAreaElement | null) => {
			textAreaRef.current = node;

			if (typeof ref === 'function') {
				ref(node);
				return;
			}

			if (ref) {
				ref.current = node;
			}
		},
		[ref]
	);

	const applyFormatter = useCallback(
		(
			formatter: (
				currentValue: string,
				selection: MarkdownSelection
			) => MarkdownFormattedValue
		) => {
			const node = textAreaRef.current;

			if (!node || !canEdit) {
				return;
			}

			const selection = {
				start: node.selectionStart,
				end: node.selectionEnd
			};
			const formatted = formatter(value, selection);

			onChange(formatted.value);

			queueMicrotask(() => {
				const currentNode = textAreaRef.current;

				if (!currentNode) {
					return;
				}

				currentNode.focus();
				currentNode.setSelectionRange(formatted.start, formatted.end);
			});
		},
		[canEdit, onChange, value]
	);

	const applyInline = useCallback(
		(prefix: string, suffix: string, placeholder: string) => {
			applyFormatter((currentValue, selection) =>
				createInlineFormat(currentValue, selection, prefix, suffix, placeholder)
			);
		},
		[applyFormatter]
	);

	const applyLines = useCallback(
		(
			lineFormatter: (line: string, index: number) => string,
			placeholder: string
		) => {
			applyFormatter((currentValue, selection) =>
				createLineFormat(currentValue, selection, lineFormatter, placeholder)
			);
		},
		[applyFormatter]
	);

	const setMode = useCallback(
		(nextMode: MarkdownEditorMode) => {
			if (!mode) {
				setUncontrolledMode(nextMode);
			}

			onModeChange?.(nextMode);
		},
		[mode, onModeChange]
	);

	const controlId = id ?? name;

	return (
		<div className={cn('flex flex-col gap-2', className)}>
			{label ? (
				<label
					htmlFor={controlId}
					className="text-[0.75rem] font-medium leading-[0.875rem] text-text-menu"
				>
					{label}
				</label>
			) : null}

			<div className={markdownEditorShellStyles({ hasError: Boolean(error) })}>
				{showModeToggle ? (
					<div className="flex items-center justify-between border-b border-border-primary bg-bg-body px-2 py-1.5">
						<div className="inline-flex items-center gap-1 rounded-md bg-primary-wash p-1">
							<button
								type="button"
								aria-pressed={editorMode === 'edit'}
								className={markdownEditorTabStyles({
									active: editorMode === 'edit'
								})}
								onClick={() => setMode('edit')}
							>
								Edit
							</button>
							<button
								type="button"
								aria-pressed={editorMode === 'preview'}
								className={markdownEditorTabStyles({
									active: editorMode === 'preview'
								})}
								onClick={() => setMode('preview')}
							>
								Preview
							</button>
						</div>

						<span className="text-[0.6875rem] font-medium leading-[0.875rem] text-text-menu">
							{value.length} chars
						</span>
					</div>
				) : null}

				{showToolbar && editorMode === 'edit' ? (
					<div className="flex flex-wrap items-center gap-1 border-b border-border-primary bg-bg-body px-2 py-1.5">
						<button
							type="button"
							className={markdownEditorToolbarButtonStyles()}
							onClick={() => applyInline('**', '**', 'bold text')}
							disabled={!canEdit}
							aria-label="Bold"
						>
							B
						</button>
						<button
							type="button"
							className={markdownEditorToolbarButtonStyles()}
							onClick={() => applyInline('_', '_', 'italic text')}
							disabled={!canEdit}
							aria-label="Italic"
						>
							I
						</button>
						<button
							type="button"
							className={markdownEditorToolbarButtonStyles()}
							onClick={() => applyInline('`', '`', 'code')}
							disabled={!canEdit}
							aria-label="Code"
						>
							{'</>'}
						</button>
						<button
							type="button"
							className={markdownEditorToolbarButtonStyles()}
							onClick={() =>
								applyInline('[', '](https://example.com)', 'link text')
							}
							disabled={!canEdit}
							aria-label="Link"
						>
							Link
						</button>
						<span
							className="mx-1 h-4 w-px bg-border-primary"
							aria-hidden="true"
						/>
						<button
							type="button"
							className={markdownEditorToolbarButtonStyles()}
							onClick={() => applyLines((line) => `## ${line}`, 'Heading')}
							disabled={!canEdit}
							aria-label="Heading"
						>
							H2
						</button>
						<button
							type="button"
							className={markdownEditorToolbarButtonStyles()}
							onClick={() => applyLines((line) => `- ${line}`, 'List item')}
							disabled={!canEdit}
							aria-label="Unordered list"
						>
							UL
						</button>
						<button
							type="button"
							className={markdownEditorToolbarButtonStyles()}
							onClick={() =>
								applyLines(
									(line, index) => `${index + 1}. ${line}`,
									'List item'
								)
							}
							disabled={!canEdit}
							aria-label="Ordered list"
						>
							OL
						</button>
						<button
							type="button"
							className={markdownEditorToolbarButtonStyles()}
							onClick={() => applyLines((line) => `> ${line}`, 'Quoted text')}
							disabled={!canEdit}
							aria-label="Quote"
						>
							Quote
						</button>
					</div>
				) : null}

				{editorMode === 'edit' ? (
					<textarea
						{...textAreaProps}
						id={controlId}
						name={name}
						value={value}
						onChange={(event) => onChange(event.target.value)}
						className={cn(
							'min-h-52 w-full resize-y border-0 bg-white px-3 py-2.5 font-mono text-[0.75rem] font-medium leading-[1rem] text-text-primary outline-none focus:ring-0 placeholder:text-text-menu',
							disabled ? 'bg-bg-body text-text-menu' : '',
							textareaClassName
						)}
						disabled={disabled}
						ref={setTextAreaRef}
						data-testid="markdown-editor-textarea"
					/>
				) : (
					<div
						className={cn('min-h-52 px-3 py-2.5', previewClassName)}
						data-testid="markdown-editor-preview"
					>
						<MarkdownPreview markdown={value} emptyState={previewPlaceholder} />
					</div>
				)}
			</div>

			{error ? <ErrorMessage>{error}</ErrorMessage> : null}
		</div>
	);
});

MarkdownEditor.displayName = 'MarkdownEditor';

export type { MarkdownEditorMode };
