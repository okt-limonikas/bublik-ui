import { memo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { isEqual } from 'lodash';

import { cn, toast } from '@/shared/tailwind-ui';

import { SparklesIcon } from './icons';
import { Markdown } from './markdown';
import { MessageActions } from './message-actions';
import { ChatMessage } from './types';

interface UseChatHelpers {
	setMessages: (messages: ChatMessage[]) => void;
	regenerate: () => void;
}

interface PreviewMessagesProps {
	chatId: string;
	message: ChatMessage;
	isLoading: boolean;
	setMessages: UseChatHelpers['setMessages'];
	regenerate: UseChatHelpers['regenerate'];
	isReadonly: boolean;
	requiresScrollPadding: boolean;
}

function PurePreviewMessage(props: PreviewMessagesProps) {
	const {
		chatId,
		message,
		isLoading,
		setMessages,
		regenerate,
		isReadonly,
		requiresScrollPadding
	} = props;
	const [mode, setMode] = useState<'view' | 'edit'>('view');

	return (
		<AnimatePresence>
			<motion.div
				data-testid={`message-${message.role}`}
				className={cn('w-full mx-auto px-2 group/message', 'max-w-3xl')}
				initial={{ y: 5, opacity: 0 }}
				animate={{ y: 0, opacity: 1 }}
				data-role={message.role}
			>
				<div
					className={cn(
						'flex gap-4 w-full group-data-[role=user]/message:ml-auto group-data-[role=user]/message:max-w-2xl',
						{
							'w-full': mode === 'edit',
							'group-data-[role=user]/message:w-fit': mode !== 'edit'
						}
					)}
				>
					{message.role === 'assistant' && (
						<div className="size-8 flex items-center rounded-full justify-center ring-1 shrink-0 ring-border bg-background">
							<div className="translate-y-px">
								<SparklesIcon size={14} />
							</div>
						</div>
					)}

					<div
						className={cn('flex flex-col gap-4 w-full', {
							'min-h-96': message.role === 'assistant' && requiresScrollPadding
						})}
					>
						{message.parts?.map((part, index) => {
							const { type } = part;
							const key = `message-${message.id}-part-${index}`;
							console.log(type, JSON.stringify(part, null, 2));

							if (type === 'reasoning' && part.text?.trim().length > 0) {
								return (
									<ReasoningMessage
										done={part.state === 'done'}
										text={part.text}
									/>
								);
							}

							if (type === 'tool-getJsonLogLocation') {
								if (part.state === 'input-available') {
									return <div>Getting Log Content...</div>;
								}

								if (part.state === 'output-available') {
									return (
										<div>
											<pre>{JSON.stringify(part.output, null, 2)}</pre>
										</div>
									);
								}
							}

							if (type === 'text') {
								if (mode === 'view') {
									return (
										<div key={key} className="flex flex-row gap-2 items-start">
											<div
												data-testid="message-content"
												className={cn('flex flex-col gap-4', {
													'bg-gray-50 text-text-primary px-3 py-2 rounded-md':
														message.role === 'user'
												})}
											>
												<Markdown>{part.text}</Markdown>
											</div>
										</div>
									);
								}

								if (mode === 'edit') {
									return (
										<div key={key} className="flex flex-row gap-2 items-start">
											<div className="size-8" />
											<MessageEditor
												key={message.id}
												message={message}
												setMode={setMode}
												setMessages={setMessages}
												regenerate={regenerate}
											/>
										</div>
									);
								}
							}

							return null;
						})}

						{!isReadonly && (
							<MessageActions
								key={`action-${message.id}`}
								chatId={chatId}
								message={message}
								isLoading={isLoading}
							/>
						)}
					</div>
				</div>
			</motion.div>
		</AnimatePresence>
	);
}

interface ReasoningMessageProps {
	text: string;
	done?: boolean;
}

function ReasoningMessage(props: ReasoningMessageProps) {
	const { text, done } = props;
	const [open, setOpen] = useState(false);

	return (
		<div className="p-3 bg-gray-50 rounded-lg border-l-4 border-primary">
			<button
				type="button"
				onClick={() => setOpen((o) => !o)}
				className="flex items-center w-full text-left focus:outline-none focus:ring-2 focus:ring-blue-500"
			>
				<span className="text-sm font-medium mr-auto">
					{done ? 'Thought for X seconds' : 'Thinking...'}
				</span>
				<svg
					width="12"
					height="12"
					viewBox="0 0 24 24"
					fill="none"
					xmlns="http://www.w3.org/2000/svg"
					className={`transition-transform duration-200 ease-in-out ${
						open ? 'rotate-90' : ''
					}`}
				>
					<path d="M8 5l8 7-8 7V5z" fill="#6b7280" />
				</svg>
			</button>

			<AnimatePresence initial={false}>
				{open && (
					<motion.div
						initial={{ height: 0, opacity: 0 }}
						animate={{ height: 'auto', opacity: 1 }}
						exit={{ height: 0, opacity: 0 }}
						transition={{ duration: 0.3, ease: 'easeOut' }}
						className="overflow-hidden"
					>
						<div className="mt-2">
							<Markdown>{text}</Markdown>
						</div>
					</motion.div>
				)}
			</AnimatePresence>
		</div>
	);
}

export const PreviewMessage = memo(
	PurePreviewMessage,
	(prevProps, nextProps) => {
		if (prevProps.isLoading !== nextProps.isLoading) return false;
		if (prevProps.message.id !== nextProps.message.id) return false;
		if (prevProps.requiresScrollPadding !== nextProps.requiresScrollPadding) {
			return false;
		}
		if (!isEqual(prevProps.message.parts, nextProps.message.parts)) {
			return false;
		}

		return false;
	}
);

export function ThinkingMessage() {
	const role = 'assistant';

	return (
		<motion.div
			data-testid="message-assistant-loading"
			className="w-full mx-auto max-w-3xl px-4 group/message min-h-24"
			initial={{ y: 5, opacity: 0 }}
			animate={{ y: 0, opacity: 1, transition: { delay: 1 } }}
			data-role={role}
		>
			<div className="flex gap-4 w-full">
				<div className="size-8 flex items-center rounded-full justify-center ring-1 shrink-0 ring-border bg-background">
					<SparklesIcon size={14} />
				</div>

				<div className="flex flex-col gap-2 w-full">
					<div className="flex flex-col gap-4 text-gray-500">
						<div className="flex items-center gap-2">
							<div className="animate-pulse">Thinking...</div>
							<div className="flex space-x-1">
								<div
									className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
									style={{ animationDelay: '0ms' }}
								></div>
								<div
									className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
									style={{ animationDelay: '150ms' }}
								></div>
								<div
									className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
									style={{ animationDelay: '300ms' }}
								></div>
							</div>
						</div>
					</div>
				</div>
			</div>
		</motion.div>
	);
}

export interface MessageEditorProps {
	message: ChatMessage;
	setMode: (mode: 'view' | 'edit') => void;
	setMessages: (messages: ChatMessage[]) => void;
	regenerate: () => void;
}

function MessageEditor(props: MessageEditorProps) {
	const { message, setMode } = props;
	const [editedText, setEditedText] = useState(
		message.parts.find((part) => part.type === 'text')?.text || ''
	);

	const handleSave = () => {
		toast.success('Message updated');
		setMode('view');
	};

	const handleCancel = () => {
		setMode('view');
	};

	return (
		<div className="w-full space-y-3">
			<textarea
				value={editedText}
				onChange={(e) => setEditedText(e.target.value)}
				className="w-full min-h-[100px] p-3 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
				placeholder="Edit your message..."
			/>
			<div className="flex gap-2 justify-end">
				<button
					onClick={handleCancel}
					className="px-3 py-1 text-sm text-gray-600 hover:bg-gray-100 dark rounded-lg"
				>
					Cancel
				</button>
				<button
					onClick={handleSave}
					className="px-3 py-1 text-sm bg-blue-500 text-white hover:bg-blue-600 rounded-lg"
				>
					Save
				</button>
			</div>
		</div>
	);
}
