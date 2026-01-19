import { UIMessagePart, UIDataTypes, UITools } from 'ai';

interface ChatMessage {
	id: string;
	role: 'user' | 'assistant';
	parts: Array<UIMessagePart<UIDataTypes, UITools>>;
}

export { type ChatMessage };
