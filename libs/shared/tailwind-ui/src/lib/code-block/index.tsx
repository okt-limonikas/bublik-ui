import {
	ComponentProps,
	HTMLAttributes,
	ReactElement,
	ReactNode,
	cloneElement,
	createContext,
	useContext,
	useEffect,
	useState
} from 'react';

import { useControllableState } from '@/shared/hooks';

import { ButtonTw } from '../button/button-v2';
import { cn } from '../utils';
import { Icon, IconProps } from '../icon';

export type BundledLanguage = string;

const filenameIconMap: Record<string, IconProps['name']> = {
	'*.json': 'Aggregation'
};

const lineNumberClassNames = cn(
	'[&_code]:[counter-reset:line]',
	'[&_code]:[counter-increment:line_0]',
	'[&_.line]:before:content-[counter(line)]',
	'[&_.line]:before:inline-block',
	'[&_.line]:before:[counter-increment:line]',
	'[&_.line]:before:w-4',
	'[&_.line]:before:mr-4',
	'[&_.line]:before:text-[13px]',
	'[&_.line]:before:text-right',
	'[&_.line]:before:text-muted-foreground/50',
	'[&_.line]:before:font-mono',
	'[&_.line]:before:select-none'
);

const darkModeClassNames = cn(
	'dark:[&_.shiki]:!text-[var(--shiki-dark)]',
	'dark:[&_.shiki]:!bg-[var(--shiki-dark-bg)]',
	'dark:[&_.shiki]:![font-style:var(--shiki-dark-font-style)]',
	'dark:[&_.shiki]:![font-weight:var(--shiki-dark-font-weight)]',
	'dark:[&_.shiki]:![text-decoration:var(--shiki-dark-text-decoration)]',
	'dark:[&_.shiki_span]:!text-[var(--shiki-dark)]',
	'dark:[&_.shiki_span]:![font-style:var(--shiki-dark-font-style)]',
	'dark:[&_.shiki_span]:![font-weight:var(--shiki-dark-font-weight)]',
	'dark:[&_.shiki_span]:![text-decoration:var(--shiki-dark-text-decoration)]'
);

const lineHighlightClassNames = cn(
	'[&_.line.highlighted]:bg-blue-50',
	'[&_.line.highlighted]:after:bg-blue-500',
	'[&_.line.highlighted]:after:absolute',
	'[&_.line.highlighted]:after:left-0',
	'[&_.line.highlighted]:after:top-0',
	'[&_.line.highlighted]:after:bottom-0',
	'[&_.line.highlighted]:after:w-0.5',
	'dark:[&_.line.highlighted]:!bg-blue-500/10'
);
const lineDiffClassNames = cn(
	'[&_.line.diff]:after:absolute',
	'[&_.line.diff]:after:left-0',
	'[&_.line.diff]:after:top-0',
	'[&_.line.diff]:after:bottom-0',
	'[&_.line.diff]:after:w-0.5',
	'[&_.line.diff.add]:bg-emerald-50',
	'[&_.line.diff.add]:after:bg-emerald-500',
	'[&_.line.diff.remove]:bg-rose-50',
	'[&_.line.diff.remove]:after:bg-rose-500',
	'dark:[&_.line.diff.add]:!bg-emerald-500/10',
	'dark:[&_.line.diff.remove]:!bg-rose-500/10'
);

const lineFocusedClassNames = cn(
	'[&_code:has(.focused)_.line]:blur-[2px]',
	'[&_code:has(.focused)_.line.focused]:blur-none'
);

const wordHighlightClassNames = cn(
	'[&_.highlighted-word]:bg-blue-50',
	'dark:[&_.highlighted-word]:!bg-blue-500/10'
);

const codeBlockClassName = cn(
	'mt-0 bg-background text-sm',
	'[&_pre]:py-4',
	'[&_.shiki]:!bg-[var(--shiki-bg)]',
	'[&_code]:w-full',
	'[&_code]:grid',
	'[&_code]:overflow-x-auto',
	'[&_code]:bg-transparent',
	'[&_.line]:px-4',
	'[&_.line]:w-full',
	'[&_.line]:relative'
);

type CodeBlockData = {
	language: string;
	filename: string;
	code: string;
};

type CodeBlockContextType = {
	value: string | undefined;
	onValueChange: ((value: string) => void) | undefined;
	data: CodeBlockData[];
};

const CodeBlockContext = createContext<CodeBlockContextType>({
	value: undefined,
	onValueChange: undefined,
	data: []
});

export type CodeBlockProps = HTMLAttributes<HTMLDivElement> & {
	defaultValue?: string;
	value?: string;
	onValueChange?: (value: string) => void;
	data: CodeBlockData[];
};

export const CodeBlock = ({
	value: controlledValue,
	onValueChange: controlledOnValueChange,
	defaultValue,
	className,
	data,
	...props
}: CodeBlockProps) => {
	const [value, onValueChange] = useControllableState({
		defaultProp: defaultValue ?? '',
		prop: controlledValue,
		onChange: controlledOnValueChange
	});

	return (
		<CodeBlockContext.Provider value={{ value, onValueChange, data }}>
			<div
				className={cn('size-full overflow-hidden rounded-md border', className)}
				{...props}
			/>
		</CodeBlockContext.Provider>
	);
};

export type CodeBlockHeaderProps = HTMLAttributes<HTMLDivElement>;

export const CodeBlockHeader = ({
	className,
	...props
}: CodeBlockHeaderProps) => (
	<div
		className={cn(
			'flex flex-row items-center border-b bg-secondary p-1',
			className
		)}
		{...props}
	/>
);

export type CodeBlockFilesProps = Omit<
	HTMLAttributes<HTMLDivElement>,
	'children'
> & {
	children: (item: CodeBlockData) => ReactNode;
};
export const CodeBlockFiles = ({
	className,
	children,
	...props
}: CodeBlockFilesProps) => {
	const { data } = useContext(CodeBlockContext);
	return (
		<div
			className={cn('flex grow flex-row items-center gap-2', className)}
			{...props}
		>
			{data.map(children)}
		</div>
	);
};

export type CodeBlockFilenameProps = HTMLAttributes<HTMLDivElement> & {
	icon?: IconProps['name'];
	value?: string;
};

export const CodeBlockFilename = ({
	className,
	icon,
	value,
	children,
	...props
}: CodeBlockFilenameProps) => {
	const { value: activeValue } = useContext(CodeBlockContext);

	const defaultIcon =
		Object.entries(filenameIconMap).find(([pattern]) => {
			const regex = new RegExp(
				`^${pattern
					.replace(/\\/g, '\\\\')
					.replace(/\./g, '\\.')
					.replace(/\*/g, '.*')}$`
			);
			return regex.test(children as string);
		})?.[1] ?? 'Aggregation';

	if (value !== activeValue) return null;

	return (
		<div
			className="flex items-center gap-2 bg-secondary px-4 py-1.5 text-muted-foreground text-xs"
			{...props}
		>
			<Icon name={icon ?? defaultIcon} className="h-4 w-4 shrink-0" />
			<span className="flex-1 truncate">{children}</span>
		</div>
	);
};

export type CodeBlockCopyButtonProps = ComponentProps<typeof ButtonTw> & {
	onCopy?: () => void;
	onError?: (error: Error) => void;
	timeout?: number;
};
export const CodeBlockCopyButton = ({
	asChild,
	onCopy,
	onError,
	timeout = 2000,
	children,
	className,
	...props
}: CodeBlockCopyButtonProps) => {
	const [, setIsCopied] = useState(false);

	const { data, value } = useContext(CodeBlockContext);

	const code = data.find((item) => item.language === value)?.code;

	const copyToClipboard = () => {
		if (
			typeof window === 'undefined' ||
			!navigator.clipboard.writeText ||
			!code
		) {
			return;
		}

		navigator.clipboard.writeText(code).then(() => {
			setIsCopied(true);
			onCopy?.();
			setTimeout(() => setIsCopied(false), timeout);
		}, onError);
	};

	if (asChild) {
		return cloneElement(children as ReactElement, { onClick: copyToClipboard });
	}

	return (
		<ButtonTw
			className={cn('shrink-0', className)}
			onClick={copyToClipboard}
			variant="ghost"
			{...props}
		>
			{children ?? (
				<Icon name="PaperStack" className="text-muted-foreground" size={14} />
			)}
		</ButtonTw>
	);
};

type CodeBlockFallbackProps = HTMLAttributes<HTMLDivElement>;

const CodeBlockFallback = ({ children, ...props }: CodeBlockFallbackProps) => (
	<div {...props}>
		<pre className="w-full">
			<code>
				{children
					?.toString()
					.split('\n')
					.map((line, i) => (
						<span className="line" key={i}>
							{line}
						</span>
					))}
			</code>
		</pre>
	</div>
);

export type CodeBlockBodyProps = Omit<
	HTMLAttributes<HTMLDivElement>,
	'children'
> & {
	children: (item: CodeBlockData) => ReactNode;
};

export const CodeBlockBody = ({ children, ...props }: CodeBlockBodyProps) => {
	const { data } = useContext(CodeBlockContext);
	return <div {...props}>{data.map(children)}</div>;
};

export type CodeBlockItemProps = HTMLAttributes<HTMLDivElement> & {
	value: string;
	lineNumbers?: boolean;
};

export const CodeBlockItem = ({
	children,
	lineNumbers = true,
	className,
	value,
	...props
}: CodeBlockItemProps) => {
	const { value: activeValue } = useContext(CodeBlockContext);
	if (value !== activeValue) {
		return null;
	}
	return (
		<div
			className={cn(
				codeBlockClassName,
				lineHighlightClassNames,
				lineDiffClassNames,
				lineFocusedClassNames,
				wordHighlightClassNames,
				darkModeClassNames,
				lineNumbers && lineNumberClassNames,
				className
			)}
			{...props}
		>
			{children}
		</div>
	);
};

export type CodeBlockContentProps = HTMLAttributes<HTMLDivElement> & {
	themes?: {
		light: string;
		dark: string;
	};
	language?: BundledLanguage;
	syntaxHighlighting?: boolean;
	children: string;
};

export const CodeBlockContent = ({
	children,
	themes = {
		light: 'vitesse-light',
		dark: 'vitesse-dark'
	},
	language = 'typescript',
	syntaxHighlighting = true,
	...props
}: CodeBlockContentProps) => {
	const [highlightedCode, setHighlightedCode] = useState<string>('');

	const [isLoading, setIsLoading] = useState(syntaxHighlighting);

	useEffect(() => {
		if (!syntaxHighlighting) {
			setIsLoading(false);
			return;
		}
		const loadHighlightedCode = async () => {
			try {
				const { codeToHtml } = await import('shiki');

				const html = await codeToHtml(children, {
					lang: language,
					themes: { light: themes.light, dark: themes.dark },
					theme: themes.light
				});
				setHighlightedCode(html);
				setIsLoading(false);
			} catch (error) {
				console.error(
					`Failed to highlight code for language "${language}":`,
					error
				);
				setIsLoading(false);
			}
		};
		loadHighlightedCode();
	}, [children, language, themes, syntaxHighlighting]);

	if (!syntaxHighlighting || isLoading) {
		return <CodeBlockFallback {...props}>{children}</CodeBlockFallback>;
	}

	return (
		<div dangerouslySetInnerHTML={{ __html: highlightedCode }} {...props} />
	);
};
