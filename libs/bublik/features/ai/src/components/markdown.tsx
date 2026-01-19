import { memo } from 'react';
import ReactMarkdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';

import { CodeBlock } from './code-block';
import { Table, TableHead, TableRow, TableCell, TableBody } from './table';

const components: Partial<Components> = {
	code: CodeBlock,
	table: Table,
	thead: TableHead,
	tbody: TableBody,
	tr: TableRow,
	th: TableCell,
	td: TableCell,
	pre: ({ children }) => children,
	ol: ({ node, children, ...props }) => {
		return (
			<ol className="list-decimal list-outside ml-4" {...props}>
				{children}
			</ol>
		);
	},
	li: ({ node, children, ...props }) => {
		return (
			<li className="py-1" {...props}>
				{children}
			</li>
		);
	},
	ul: ({ node, children, ...props }) => {
		return (
			<ul className="list-disc list-outside ml-4" {...props}>
				{children}
			</ul>
		);
	},
	strong: ({ node, children, ...props }) => {
		return (
			<span className="font-semibold" {...props}>
				{children}
			</span>
		);
	},
	a: ({ node, children, ...props }) => {
		return (
			<a
				className="text-blue-500 hover:underline"
				target="_blank"
				rel="noreferrer"
				{...props}
			>
				{children}
			</a>
		);
	},
	h1: ({ node, children, ...props }) => {
		return (
			<h1 className="text-3xl font-semibold mt-6 mb-2" {...props}>
				{children}
			</h1>
		);
	},
	h2: ({ node, children, ...props }) => {
		return (
			<h2 className="text-2xl font-semibold mt-6 mb-2" {...props}>
				{children}
			</h2>
		);
	},
	h3: ({ node, children, ...props }) => {
		return (
			<h3 className="text-xl font-semibold mt-6 mb-2" {...props}>
				{children}
			</h3>
		);
	},
	h4: ({ node, children, ...props }) => {
		return (
			<h4 className="text-lg font-semibold mt-6 mb-2" {...props}>
				{children}
			</h4>
		);
	},
	h5: ({ node, children, ...props }) => {
		return (
			<h5 className="text-base font-semibold mt-6 mb-2" {...props}>
				{children}
			</h5>
		);
	},
	h6: ({ node, children, ...props }) => {
		return (
			<h6 className="text-sm font-semibold mt-6 mb-2" {...props}>
				{children}
			</h6>
		);
	},
	p: ({ node, children, ...props }) => {
		return (
			<p className="leading-relaxed" {...props}>
				{children}
			</p>
		);
	},
	blockquote: ({ node, children, ...props }) => {
		return (
			<blockquote
				className="border-l-4 border-border-primary pl-4 italic my-4"
				{...props}
			>
				{children}
			</blockquote>
		);
	}
};

const remarkPlugins = [remarkGfm];

const NonMemoizedMarkdown = ({ children }: { children: string }) => {
	return (
		<ReactMarkdown remarkPlugins={remarkPlugins} components={components}>
			{children}
		</ReactMarkdown>
	);
};

export const Markdown = memo(
	NonMemoizedMarkdown,
	(prevProps, nextProps) => prevProps.children === nextProps.children
);
