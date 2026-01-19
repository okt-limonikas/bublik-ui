import { memo, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ChatStatus } from 'ai';
import { isEqual } from 'lodash';

import { ChatMessage } from './types';
import { PreviewMessage, ThinkingMessage } from './message';
import { Greeting } from './greeting';
import { useDataStream } from './data-stream-provider';

interface UseChatHelpers {
	setMessages: (messages: ChatMessage[]) => void;
	regenerate: () => void;
}

interface MessagesProps {
	chatId: string;
	status: ChatStatus;
	messages: ChatMessage[];
	setMessages: UseChatHelpers['setMessages'];
	regenerate: UseChatHelpers['regenerate'];
	isReadonly: boolean;
	isArtifactVisible: boolean;
}

interface UseMessagesProps {
	chatId: string;
	status: ChatStatus;
}

function useMessages({ chatId, status }: UseMessagesProps) {
	const containerRef = useRef<HTMLDivElement>(null);
	const endRef = useRef<HTMLDivElement>(null);

	const scrollToBottom = () => {
		if (endRef.current) {
			endRef.current.scrollIntoView({ behavior: 'smooth' });
		}
	};

	useEffect(() => {
		if (status === 'streaming') scrollToBottom();
	}, [status]);

	const onViewportEnter = () => {
		// Handle viewport enter logic if needed
	};

	const onViewportLeave = () => {
		// Handle viewport leave logic if needed
	};

	const hasSentMessage = status !== 'ready';

	return {
		containerRef,
		endRef,
		onViewportEnter,
		onViewportLeave,
		hasSentMessage
	};
}

function PureMessages(props: MessagesProps) {
	const { chatId, status, messages, setMessages, regenerate, isReadonly } =
		props;
	const {
		containerRef,
		endRef,
		onViewportEnter,
		onViewportLeave,
		hasSentMessage
	} = useMessages({ chatId, status });

	useDataStream();

	return (
		<div
			ref={containerRef}
			className="flex flex-col min-w-0 gap-6 flex-1 overflow-y-scroll pt-4 relative"
		>
			{messages.length === 0 && <Greeting />}

			{messages.map((message, index) => {
				return (
					<PreviewMessage
						key={message.id}
						chatId={chatId}
						message={message}
						isLoading={status === 'streaming' && messages.length - 1 === index}
						setMessages={setMessages}
						regenerate={regenerate}
						isReadonly={isReadonly}
						requiresScrollPadding={
							hasSentMessage && index === messages.length - 1
						}
					/>
				);
			})}

			{status === 'submitted' &&
				messages.length > 0 &&
				messages[messages.length - 1].role === 'user' && <ThinkingMessage />}

			<motion.div
				ref={endRef}
				className="shrink-0 min-w-[24px] min-h-[24px]"
				onViewportLeave={onViewportLeave}
				onViewportEnter={onViewportEnter}
			/>
		</div>
	);
}

export const Messages = memo(PureMessages, (prevProps, nextProps) => {
	if (prevProps.isArtifactVisible && nextProps.isArtifactVisible) return true;

	if (prevProps.status !== nextProps.status) return false;
	if (prevProps.messages.length !== nextProps.messages.length) return false;
	if (!isEqual(prevProps.messages, nextProps.messages)) return false;

	return false;
});
