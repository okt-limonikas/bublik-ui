/* SPDX-License-Identifier: Apache-2.0 */
/* SPDX-FileCopyrightText: 2024 OKTET LTD */
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck
import {
	ComponentProps,
	forwardRef,
	useImperativeHandle,
	useRef,
	useState
} from 'react';
import MonacoEditor, { Monaco, OnMount } from '@monaco-editor/react';
import prettier from 'prettier/standalone';
import parserBabel from 'prettier/parser-babel';

import * as monaco from 'monaco-editor';
import { loader } from '@monaco-editor/react';

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
	DrawerContent,
	CodeBlock,
	CodeBlockBody,
	CodeBlockContent,
	CodeBlockItem
} from '@/shared/tailwind-ui';

import { DEFAULT_URI } from '../config.constants';

import editorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker';
import jsonWorker from 'monaco-editor/esm/vs/language/json/json.worker?worker';

// eslint-disable-next-line no-restricted-globals
self.MonacoEnvironment = {
	getWorker(_, label) {
		if (label === 'json') {
			return new jsonWorker();
		}
		return new editorWorker();
	}
};

loader.config({ monaco });

function formatJson(value: string) {
	return prettier.format(value, {
		parser: 'json5',
		plugins: [parserBabel],
		quoteProps: 'preserve', // Keep existing quote style for keys
		singleQuote: false,
		trailingComma: 'none'
	});
}

// MARK: Editor
interface ConfigEditorProps extends ComponentProps<typeof MonacoEditor> {
	schema?: Record<string, unknown>;
	label?: ComponentProps<typeof CardHeader>['label'];
}

const ConfigEditor = forwardRef<Monaco | undefined, ConfigEditorProps>(
	({ schema, label, className, ...props }, ref) => {
		const [monaco, setMonaco] = useState<Monaco>();
		const editorRef = useRef<Parameters<OnMount>[0] | null>(null);
		const [fontSize, setFontSize] = useLocalStorage('editor-font-size', 14);
		const [isSettingsOpen, setIsSettingsOpen] = useState(false);

		useImperativeHandle(ref, () => monaco, [monaco]);

		function handleEditorWillMount(monaco: Monaco) {
			monaco.languages.json.jsonDefaults.setDiagnosticsOptions({
				validate: true,
				allowComments: true,
				trailingCommas: true,
				schemas: [{ fileMatch: ['*'], schema: schema, uri: '' }]
			});
			monaco.languages.typescript.javascriptDefaults.setEagerModelSync(true);
			setMonaco(monaco);
		}

		const handleEditorDidMount: OnMount = (editor, monaco) => {
			editorRef.current = editor;

			editor.addCommand(
				monaco.KeyMod.CtrlCmd | monaco.KeyCode.Backslash,
				() => {
					editor.trigger('keyboard', 'editor.action.triggerSuggest', {});
				}
			);
		};

		function handleFormatClick() {
			function formatJsonWithComments(value: string, schema?: any): string {
				let parsed: any;
				try {
					parsed = JSON.parse(value);
				} catch (e) {
					// fallback: just format with prettier
					return formatJson(value);
				}

				function walk(obj: any, schemaNode: any, indent = 0): string {
					const spaces = '  '.repeat(indent);
					let result = '{\n';

					const entries = Object.entries(obj);
					for (const [key, val] of entries) {
						// figure out schema for this property
						let propSchema =
							schemaNode?.properties?.[key] ??
							schemaNode?.additionalProperties ??
							schemaNode;

						// add description comment if available
						if (propSchema?.description) {
							result += `${spaces}  // ${propSchema.description}\n`;
						}

						if (Array.isArray(val)) {
							result += `${spaces}  "${key}": [\n`;
							for (const item of val) {
								if (typeof item === 'object' && item !== null) {
									result += walk(item, propSchema?.items, indent + 2);
								} else {
									result += `${spaces}    ${JSON.stringify(item)},\n`;
								}
							}
							result += `${spaces}  ],\n`;
						} else if (typeof val === 'object' && val !== null) {
							result += `${spaces}  "${key}": ${walk(
								val,
								propSchema,
								indent + 1
							)}`;
						} else {
							result += `${spaces}  "${key}": ${JSON.stringify(val)},\n`;
						}
					}

					result += spaces + '},\n';
					return result;
				}

				return walk(parsed, schema, 0).replace(/,\n}/g, '\n}');
			}

			const URI = monaco?.Uri.parse(DEFAULT_URI);
			if (!URI) {
				toast.error('Failed to create URI');
				return;
			}

			const model = monaco?.editor.getModel(URI);

			if (!model) {
				toast.error(`Failed to get model by ${URI}`);
				return;
			}

			const value = model.getValue();
			try {
				const formatted = formatJsonWithComments(value, schema);
				console.log(formatted, schema);
				model.setValue(formatted);
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
										<Icon name="Edit" className="size-5 mr-1.5" />
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
								<div className="h-full overflow-auto">
									<CodeBlock
										data={[
											{
												code: JSON.stringify(schema, null, 2),
												filename: 'test.json',
												language: 'json'
											}
										]}
										defaultValue="json"
										className="rounded-none"
									>
										<CodeBlockBody>
											{(item) => (
												<CodeBlockItem
													key={item.language}
													value={item.language}
												>
													<CodeBlockContent
														language={item.language as BundledLanguage}
													>
														{item.code}
													</CodeBlockContent>
												</CodeBlockItem>
											)}
										</CodeBlockBody>
									</CodeBlock>
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
									<Icon name="SettingsSliders" className="size-5 mr-1.5" />
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
								<DropdownMenuItem>
									<div className="flex items-center justify-between w-full">
										<span>Font Size</span>
										<Input
											type="number"
											className="w-16 h-8"
											min={8}
											max={32}
											value={fontSize}
											onChange={(e) => setFontSize(Number(e.target.value))}
										/>
									</div>
								</DropdownMenuItem>
							</DropdownMenuContent>
						</DropdownMenu>
					</div>
				</CardHeader>
				<div className={cn('flex-1', className)}>
					<style>{`
  .myCommentGlyph {
    background: url("data:image/svg+xml;utf8,<svg fill='red' xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'><circle cx='8' cy='8' r='6'/></svg>") no-repeat center center;
    width: 16px;
    height: 16px;
  }

  .beforeComment::before {
    content: "💡 Hint: check this field";
    color: #6a9955;
    margin-right: 8px;
  }
`}</style>
					<MonacoEditor
						language="json"
						path={DEFAULT_URI}
						beforeMount={handleEditorWillMount}
						onMount={handleEditorDidMount}
						options={{ fontSize, glyphMargin: true }}
						loading={null}
						{...props}
					/>
				</div>
			</div>
		);
	}
);

export { ConfigEditor, formatJson };
