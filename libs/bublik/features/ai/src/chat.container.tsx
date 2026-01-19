import { DefaultChatTransport } from 'ai';
import { useChat } from '@ai-sdk/react';
import { useState } from 'react';
import { toast } from 'sonner';

import { useDataStream } from './components/data-stream-provider';
import { Messages } from './components/messages';
import { MultimodalInput } from './components/multimodal-input';
import { ChatMessage } from './components/types';

function ChatContent() {
	const { setDataStream } = useDataStream();
	const [input, setInput] = useState<string>('');

	const { messages, setMessages, sendMessage, status, stop, regenerate } =
		useChat<ChatMessage>({
			id: 'bublik-chat',
			transport: new DefaultChatTransport({ api: '/api/v2/chat/stream/' }),
			onData: (dataPart) =>
				setDataStream((ds) => (ds ? [...ds, dataPart] : [])),
			onFinish: () => console.log('Chat finished'),
			onError: (error) => {
				console.error('Chat error:', error);
				toast.error(
					error.message || 'An error occurred while processing your message.'
				);
			}
		});

	const handleSendMessage = ({ role, parts }: ChatMessage) => {
		sendMessage({ role, parts });
	};

	return (
		<div className="flex flex-col h-screen bg-white">
			<Messages
				chatId="bublik-chat"
				status={status}
				messages={messages}
				setMessages={setMessages}
				regenerate={regenerate}
				isReadonly={false}
				isArtifactVisible={false}
			/>

			<div className="p-4 border-t border-gray-200">
				<div className="max-w-4xl mx-auto">
					<MultimodalInput
						chatId="bublik-chat"
						input={input}
						setInput={setInput}
						status={status}
						stop={stop}
						messages={messages}
						setMessages={setMessages}
						sendMessage={handleSendMessage}
					/>
				</div>
			</div>
		</div>
	);
}

export { ChatContent };
