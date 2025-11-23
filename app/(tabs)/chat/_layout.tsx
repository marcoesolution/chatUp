import { Stack, useRouter } from "expo-router";
import { TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "styled-components/native";
import { useTranslation } from "@/core/i18n";
import { mockContacts } from "@/modules/chat";

export default function ChatLayout() {
	const router = useRouter();
	const theme = useTheme();
	const { t } = useTranslation();

	return (
		<Stack
			screenOptions={{
				headerShown: true,
				headerStyle: {
					backgroundColor: theme.colors.background.secondary,
				},
				headerTintColor: theme.colors.button.primary,
				headerTitleStyle: {
					color: theme.colors.button.primary,
					fontWeight: "600",
				},
			}}
		>
			<Stack.Screen
				name="[contactId]"
				options={({ route }: { route: { params?: { contactId?: string } } }) => {
					// Obter o nome do contato da rota
					const contactId = route.params?.contactId;
					const contact = contactId ? mockContacts.find((c) => c.id === contactId) : null;
					return {
						title: contact?.name || t("navigation.chat"),
						headerShown: true,
						headerLeft: () => (
							<TouchableOpacity
								onPress={() => router.push("/(tabs)/")}
								style={{
									marginLeft: 4,
									padding: 8,
									marginRight: 12,
									justifyContent: "center",
									alignItems: "center",
								}}
								activeOpacity={0.7}
							>
								<Ionicons name="arrow-back" size={24} color={theme.colors.button.primary} />
							</TouchableOpacity>
						),
						headerTitleContainerStyle: {
							paddingLeft: 8,
							alignItems: "center",
						},
						headerLeftContainerStyle: {
							alignItems: "center",
						},
					};
				}}
			/>
		</Stack>
	);
}
