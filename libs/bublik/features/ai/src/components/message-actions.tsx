import { useState } from 'react';
import { CopyIcon, RefreshIcon } from './icons';
import { ChatMessage } from './types';
import { toast } from 'sonner';

interface MessageActionsProps {
	chatId: string;
	message: ChatMessage;
	isLoading: boolean;
}

export function MessageActions({
	chatId,
	message,
	isLoading
}: MessageActionsProps) {
	const [isRegenerating, setIsRegenerating] = useState(false);

	if (message.role !== 'assistant') {
		return null;
	}

	const handleCopy = async () => {
		try {
			const textContent = message.parts
				.filter((part) => part.type === 'text')
				.map((part) => part.text)
				.join('\n');

			await navigator.clipboard.writeText(textContent);
			toast.success('Message copied to clipboard');
		} catch (error) {
			console.error('Error copying:', error);
			toast.error('Failed to copy message');
		}
	};

	const handleRegenerate = async () => {
		setIsRegenerating(true);
		try {
			const response = await fetch('/api/chat/regenerate', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					chatId,
					messageId: message.id
				})
			});

			if (!response.ok) {
				throw new Error('Failed to regenerate');
			}

			toast.success('Message regenerated');
		} catch (error) {
			console.error('Error regenerating:', error);
			toast.error('Failed to regenerate message');
		} finally {
			setIsRegenerating(false);
		}
	};

	return (
		<div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
			<button
				onClick={handleCopy}
				className="p-2 hover:bg-gray-100:bg-gray-800 rounded-lg transition-colors"
				title="Copy message"
				disabled={isLoading}
			>
				<CopyIcon size={14} />
			</button>

			<button
				onClick={handleRegenerate}
				className="p-2 hover:bg-gray-100:bg-gray-800 rounded-lg transition-colors"
				title="Regenerate response"
				disabled={isLoading || isRegenerating}
			>
				<RefreshIcon
					size={14}
					className={isRegenerating ? 'animate-spin' : ''}
				/>
			</button>
		</div>
	);
}
