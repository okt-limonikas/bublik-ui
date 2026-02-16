/* SPDX-License-Identifier: Apache-2.0 */
/* SPDX-FileCopyrightText: 2024-2026 OKTET LTD */
import ReactMarkdown from 'react-markdown';
import remarkBreaks from 'remark-breaks';
import remarkGfm from 'remark-gfm';

import { VariantProps, cn, cva } from '../utils';

export const markdownPreviewStyles = cva({
	base: [
		'break-words text-text-primary',
		'[&_h1]:text-[0.875rem] [&_h1]:font-semibold [&_h1]:leading-[1.125rem] [&_h1]:mt-3 [&_h1]:mb-2',
		'[&_h2]:text-[0.8125rem] [&_h2]:font-semibold [&_h2]:leading-[1rem] [&_h2]:mt-3 [&_h2]:mb-2',
		'[&_h3]:text-[0.75rem] [&_h3]:font-semibold [&_h3]:leading-[0.875rem] [&_h3]:mt-2 [&_h3]:mb-1',
		'[&_p]:m-0 [&_p+p]:mt-2',
		'[&_blockquote]:my-2 [&_blockquote]:border-l-2 [&_blockquote]:border-border-primary [&_blockquote]:pl-3 [&_blockquote]:text-text-secondary',
		'[&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-5',
		'[&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-5',
		'[&_li]:my-0.5',
		'[&_a]:text-primary [&_a]:underline',
		'[&_code]:rounded [&_code]:border [&_code]:border-border-primary [&_code]:bg-bg-body [&_code]:px-1 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-[0.6875rem] [&_code]:leading-[0.875rem]',
		'[&_pre]:my-2 [&_pre]:overflow-x-auto [&_pre]:rounded-md [&_pre]:border [&_pre]:border-border-primary [&_pre]:bg-bg-body [&_pre]:p-2',
		'[&_pre_code]:border-0 [&_pre_code]:bg-transparent [&_pre_code]:p-0',
		'[&_table]:my-2 [&_table]:w-full [&_table]:border-collapse',
		'[&_th]:border [&_th]:border-border-primary [&_th]:bg-bg-body [&_th]:p-2 [&_th]:text-left [&_th]:font-semibold',
		'[&_td]:border [&_td]:border-border-primary [&_td]:p-2',
		'[&_hr]:my-3 [&_hr]:border-border-primary'
	],
	variants: {
		size: {
			default: 'text-[0.75rem] font-medium leading-[1rem]',
			compact: 'text-[0.6875rem] font-medium leading-[0.875rem]'
		}
	},
	defaultVariants: {
		size: 'default'
	}
});

export interface MarkdownPreviewProps
	extends VariantProps<typeof markdownPreviewStyles> {
	markdown?: string | null;
	emptyState?: string;
	className?: string;
}

export const MarkdownPreview = (props: MarkdownPreviewProps) => {
	const { markdown, size, emptyState = 'No content', className } = props;
	const value = markdown ?? '';

	if (value.trim() === '') {
		return (
			<span className={cn('text-text-menu', className)}>{emptyState}</span>
		);
	}

	return (
		<div
			className={cn(markdownPreviewStyles({ size }), className)}
			data-testid="markdown-preview"
		>
			<ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]}>
				{value}
			</ReactMarkdown>
		</div>
	);
};
