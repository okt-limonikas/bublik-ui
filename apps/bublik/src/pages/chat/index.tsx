import { ChatContent, DataStreamProvider } from '@/bublik/features/ai';

export function ChatPage() {
	return (
		<DataStreamProvider>
			<ChatContent />
		</DataStreamProvider>
	);
}
