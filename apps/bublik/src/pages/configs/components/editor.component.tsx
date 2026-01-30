/* SPDX-License-Identifier: Apache-2.0 */
/* SPDX-FileCopyrightText: 2024-2026 OKTET LTD */
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck
import {
	forwardRef,
	useEffect,
	useImperativeHandle,
	useRef,
	useState
} from 'react';
import ShikiHighlighter from 'react-shiki';
import { init } from 'modern-monaco';
import type { Monaco } from '../utils';
import { format } from 'prettier';
import parserJson from 'prettier/parser-babel';

import { useLocalStorage } from '@/shared/hooks';
import {
	ButtonTw,
	CardHeader,
	cn,
	Icon,
	toast,
	Tooltip,
	DropdownMenu,
	DropdownMenuTrigger,
	DropdownMenuContent,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuItem,
	Input,
	DrawerRoot,
	DrawerTrigger,
	DrawerContent
} from '@/shared/tailwind-ui';

import { DEFAULT_URI } from '../config.constants';

function formatJson(value: string) {
	return format(value, { parser: 'json', plugins: [parserJson] });
}

interface ConfigEditorProps {
	schema?: Record<string, unknown>;
	label?: React.ComponentProps<typeof CardHeader>['label'];
	readOnly?: boolean;
	className?: string;
	value?: string;
	onChange?: (value: string) => void;
	defaultValue?: string;
}

const ConfigEditor = forwardRef<Monaco | undefined, ConfigEditorProps>(
	(
		{ schema, label, readOnly, className, value, onChange, defaultValue },
		ref
	) => {
		const containerRef = useRef<HTMLDivElement>(null);
		const editorRef = useRef<ReturnType<Monaco['editor']['create']> | null>(
			null
		);
		const [monaco, setMonaco] = useState<Monaco>();
		const [fontSize, setFontSize] = useLocalStorage('editor-font-size', 14);
		const [isSettingsOpen, setIsSettingsOpen] = useState(false);

		useImperativeHandle(ref, () => monaco, [monaco]);

		useEffect(() => {
			if (!containerRef.current) return;

			let mounted = true;

			init({
				lsp: {
					json: {
						validate: true,
						schemas: schema
							? [{ fileMatch: ['*'], schema: schema, uri: '' }]
							: undefined
					}
				}
			}).then((monacoInstance) => {
				if (!mounted || !containerRef.current) return;

				const initialValue = value ?? defaultValue ?? '';

				const editor = monacoInstance.editor.create(containerRef.current, {
					value: initialValue,
					language: 'json',
					fontSize,
					readOnly,
					automaticLayout: true,
					theme: 'github-light'
				});

				const uri = monacoInstance.Uri.parse(DEFAULT_URI);
				const model = monacoInstance.editor.createModel(
					initialValue,
					'json',
					uri
				);
				editor.setModel(model);

				editor.onDidChangeModelContent(() => {
					const newValue = editor.getValue();
					onChange?.(newValue);
				});

				editor.addCommand(
					monacoInstance.KeyMod.CtrlCmd | monacoInstance.KeyCode.Backslash,
					() => {
						editor.trigger('keyboard', 'editor.action.triggerSuggest', {});
					}
				);

				editorRef.current = editor;
				setMonaco(monacoInstance);
			});

			return () => {
				mounted = false;
				editorRef.current?.dispose();
				editorRef.current = null;
			};
		}, [schema, readOnly, fontSize, onChange, defaultValue]);

		useEffect(() => {
			if (editorRef.current && value !== undefined) {
				const currentValue = editorRef.current.getValue();
				if (currentValue !== value) {
					editorRef.current.setValue(value);
				}
			}
		}, [value]);

		useEffect(() => {
			if (editorRef.current) {
				editorRef.current.updateOptions({ fontSize });
			}
		}, [fontSize]);

		function handleFormatClick() {
			if (!editorRef.current) return;

			const editorValue = editorRef.current.getValue();
			try {
				const formatted = formatJson(editorValue);
				editorRef.current.setValue(formatted);
			} catch (error) {
				toast.error('Failed to format JSON');
				console.error(error);
			}
		}

		return (
			<div className="flex flex-col h-full">
				<CardHeader label={label ?? 'Editor'}>
					<div className="flex items-center gap-4">
						<DrawerRoot>
							<Tooltip content="View Schema">
								<DrawerTrigger asChild>
									<ButtonTw variant="secondary" size="xss">
										<Icon name="Password" className="size-5 mr-1.5" />
										<span>Schema</span>
									</ButtonTw>
								</DrawerTrigger>
							</Tooltip>
							<DrawerContent
								className={cn(
									'bg-white shadow-popover overflow-hidden w-[80vw] max-w-[80vw]',
									'flex flex-col overflow-hidden max-w-7xl'
								)}
							>
								<CardHeader label="Schema" />
								<div className="flex-1 overflow-hidden">
									<ShikiHighlighter
										language="json"
										theme="github-light"
										showLineNumbers
										addDefaultStyles={false}
										className={cn([
											'[&_pre]:overflow-auto [&_pre]:h-full h-full',
											'[&_pre]:px-6',
											'[&_pre]:py-5'
										])}
									>
										{JSON.stringify(schema, null, 2)}
									</ShikiHighlighter>
								</div>
							</DrawerContent>
						</DrawerRoot>
						<Tooltip content="Format JSON">
							<ButtonTw
								variant="secondary"
								size="xss"
								onClick={handleFormatClick}
							>
								<Icon name="Edit" className="size-5 mr-1.5" />
								<span>Format</span>
							</ButtonTw>
						</Tooltip>
						<DropdownMenu modal open={isSettingsOpen}>
							<DropdownMenuTrigger asChild>
								<ButtonTw
									variant="secondary"
									size="xss"
									onClick={() => setIsSettingsOpen(true)}
								>
									<Icon name="SettingsSliders" className="size-[18px] mr-1.5" />
									<span>Settings</span>
								</ButtonTw>
							</DropdownMenuTrigger>
							<DropdownMenuContent
								className="w-56"
								onPointerDownOutside={() => setIsSettingsOpen(false)}
								onEscapeKeyDown={() => setIsSettingsOpen(false)}
							>
								<DropdownMenuLabel>Appearance</DropdownMenuLabel>
								<DropdownMenuSeparator />
								<DropdownMenuItem className="h-7 pl-2 pr-1.5 justify-between">
									<span className="">Font Size</span>
									<Input
										type="number"
										className="w-16 h-6 text-md"
										min={8}
										max={32}
										value={fontSize}
										onChange={(e) => setFontSize(Number(e.target.value))}
									/>
								</DropdownMenuItem>
							</DropdownMenuContent>
						</DropdownMenu>
					</div>
				</CardHeader>
				<div ref={containerRef} className={cn('flex-1', className)} />
			</div>
		);
	}
);

export { ConfigEditor, formatJson };
