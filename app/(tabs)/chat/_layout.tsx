import { Stack, useRouter, useLocalSearchParams } from "expo-router";
import { TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "styled-components/native";
import { useTranslation } from "@/core/i18n";
import { Image } from "expo-image";
import { useState, useEffect } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/core/firebase";
import { formatShortName } from "@/shared/utils";
import type { UserProfile } from "@/modules/auth/types";
import styled from "styled-components/native";

const AvatarContainer = styled.View`
	width: 36px;
	height: 36px;
	border-radius: 18px;
	background-color: ${(props) => props.theme.colors.button.primary};
	justify-content: center;
	align-items: center;
	overflow: hidden;
	margin-right: 8px;
`;

const AvatarImage = styled(Image)`
	width: 100%;
	height: 100%;
`;

const AvatarText = styled.Text`
	font-size: 14px;
	font-weight: 600;
	color: ${(props) => props.theme.colors.text.primary};
`;

const HeaderTitleContainer = styled.View`
	flex-direction: row;
	align-items: center;
	flex: 1;
	padding-left: 8px;
`;

const HeaderTitleText = styled.Text`
	font-size: 18px;
	font-weight: 600;
	color: ${(props) => props.theme.colors.text.primary};
`;

/**
 * Hook para buscar informações do contato
 */
function useContactInfo(contactId: string | undefined) {
	const [contactInfo, setContactInfo] = useState<{ name: string; avatar?: string } | null>(null);
	const [isLoading, setIsLoading] = useState(true);

	useEffect(() => {
		if (!contactId || !db) {
			setContactInfo(null);
			setIsLoading(false);
			return;
		}

		const fetchContactInfo = async () => {
			try {
				const userDoc = await getDoc(doc(db!, "users", contactId));
				if (userDoc.exists()) {
					const userData = userDoc.data() as UserProfile;
					setContactInfo({
						name: userData.displayName || "Usuário",
						avatar: userData.photoURL,
					});
				} else {
					setContactInfo({ name: "Usuário" });
				}
			} catch (error) {
				console.error("❌ Erro ao buscar informações do contato:", error);
				setContactInfo({ name: "Usuário" });
			} finally {
				setIsLoading(false);
			}
		};

		fetchContactInfo();
	}, [contactId]);

	return { contactInfo, isLoading };
}

/**
 * Componente de Avatar para o header
 */
function HeaderAvatar({ avatar, name }: { avatar?: string; name: string }) {
	const theme = useTheme();
	const initials = name
		.split(" ")
		.map((n) => n[0])
		.join("")
		.toUpperCase()
		.slice(0, 2);

	return (
		<AvatarContainer>
			{avatar ? (
				<AvatarImage source={{ uri: avatar }} contentFit="cover" cachePolicy="memory-disk" />
			) : (
				<AvatarText>{initials}</AvatarText>
			)}
		</AvatarContainer>
	);
}

/**
 * Componente de título do header com nome do contato
 */
function ContactHeaderTitle() {
	const { contactId } = useLocalSearchParams<{ contactId: string }>();
	const { contactInfo } = useContactInfo(contactId);
	const { t } = useTranslation();

	const displayName = contactInfo?.name ? formatShortName(contactInfo.name) : t("navigation.chat");

	return (
		<HeaderTitleContainer>
			<HeaderTitleText>{displayName}</HeaderTitleText>
		</HeaderTitleContainer>
	);
}

/**
 * Componente de avatar no canto direito do header
 */
function ContactHeaderRight() {
	const { contactId } = useLocalSearchParams<{ contactId: string }>();
	const { contactInfo } = useContactInfo(contactId);

	if (!contactInfo) return null;

	return <HeaderAvatar avatar={contactInfo.avatar} name={contactInfo.name} />;
}

export default function ChatLayout() {
	const router = useRouter();
	const theme = useTheme();

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
				options={{
					headerTitle: () => <ContactHeaderTitle />,
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
					headerRight: () => <ContactHeaderRight />,
				}}
			/>
		</Stack>
	);
}
