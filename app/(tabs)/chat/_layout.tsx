import { Stack } from 'expo-router';
import { mockContacts } from '@/modules/chat';

export default function ChatLayout() {
	return (
		<Stack
			screenOptions={{
				headerShown: true,
				headerBackTitleVisible: false,
			}}
		>
			<Stack.Screen
				name="[contactId]"
				options={({ route }) => {
					// Obter o nome do contato da rota
					const contactId = route.params?.contactId as string | undefined;
					const contact = contactId ? mockContacts.find((c) => c.id === contactId) : null;
					return {
						title: contact?.name || 'Chat',
						headerShown: true,
						headerBackTitleVisible: false,
					};
				}}
			/>
		</Stack>
	);
}

