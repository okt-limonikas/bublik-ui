import React, { useRef, FormEvent, ChangeEvent } from 'react';
import { ChatStatus, UIDataTypes, UIMessagePart, UITools } from 'ai';

import { cn } from '@/shared/tailwind-ui';

import { SendIcon, StopIcon, LoadingIcon } from './icons';
import { ChatMessage } from './types';
import { generateId } from '../utils';

interface UseChatHelpers {
	setMessages: (messages: ChatMessage[]) => void;
	sendMessage: (message: ChatMessage) => void;
}

interface MultimodalInputProps {
	chatId: string;
	input: string;
	setInput: (input: string) => void;
	status: ChatStatus;
	stop: () => void;
	messages: ChatMessage[];
	setMessages: UseChatHelpers['setMessages'];
	sendMessage: UseChatHelpers['sendMessage'];
}

export function MultimodalInput(props: MultimodalInputProps) {
	const { input, setInput, status, stop, sendMessage } = props;
	const textareaRef = useRef<HTMLTextAreaElement>(null);

	const isLoading = status === 'submitted' || status === 'streaming';

	const handleSubmit = (e: FormEvent) => {
		e.preventDefault();

		if (isLoading || !input.trim()) return;

		const messageParts: Array<UIMessagePart<UIDataTypes, UITools>> = [];

		if (input.trim()) {
			messageParts.push({ type: 'text', text: input });
		}

		sendMessage({ id: generateId(), role: 'user', parts: messageParts });
		setInput('');
	};

	const handleInputChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
		setInput(e.target.value);
		adjustTextareaHeight();
	};

	const adjustTextareaHeight = () => {
		if (textareaRef.current) {
			textareaRef.current.style.height = 'auto';
			textareaRef.current.style.height = `${Math.min(
				textareaRef.current.scrollHeight,
				200
			)}px`;
		}
	};

	const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
		if (e.key === 'Enter' && !e.shiftKey && !e.ctrlKey && !e.altKey) {
			e.preventDefault();
			handleSubmit(e as unknown as FormEvent);
		}
	};

	return (
		<div className="w-full">
			<form onSubmit={handleSubmit} className="relative">
				<div
					className={`relative transition-colors ${
						isLoading ? 'opacity-50' : ''
					}`}
				>
					<textarea
						ref={textareaRef}
						value={input}
						onChange={handleInputChange}
						onKeyDown={handleKeyDown}
						placeholder={'Type your message...'}
						className={cn(
							'min-h-[52px] max-h-[200px]',
							'w-full',
							'px-4',
							'py-3',
							'pr-32',
							'outline-none',
							'border',
							'border-border-primary',
							'rounded-xl',
							'resize-none',
							'text-text-secondary',
							'transition-all',
							'hover:border-primary',
							'disabled:text-text-menu',
							'disabled:cursor-not-allowed',
							'focus:border-primary',
							'focus:shadow-text-field',
							'active:shadow-none',
							'focus:ring-transparent'
						)}
						disabled={isLoading}
						rows={1}
					/>

					<div className="absolute right-2.5 bottom-4 flex items-center gap-2">
						{isLoading ? (
							<button
								type="button"
								onClick={stop}
								className="p-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
								title="Stop generation"
							>
								<StopIcon size={16} />
							</button>
						) : (
							<button
								type="submit"
								disabled={!input.trim()}
								className="p-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
								title="Send message"
							>
								<SendIcon size={16} />
							</button>
						)}
					</div>
				</div>
			</form>

			<div className="mt-2 text-xs text-gray-500 flex items-center justify-between">
				<div>Press Enter to send, Shift+Enter for new line</div>
				{isLoading && (
					<div className="flex items-center gap-1">
						<LoadingIcon size={12} />
						<span>Generating response...</span>
					</div>
				)}
			</div>
		</div>
	);
}
