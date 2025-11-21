import React from "react";
import { ActivityIndicator, ScrollView } from "react-native";
import styled, { useTheme } from "styled-components/native";
import { useAuth } from "@/modules/auth";
import { Card } from "@/shared/components";

const Container = styled.ScrollView`
	flex: 1;
	background-color: ${(props) => props.theme.colors.background.primary};
`;

const CenterContainer = styled.View`
	flex: 1;
	justify-content: center;
	align-items: center;
	min-height: 400px;
`;

const CardContainer = styled.View`
	margin: ${(props) => props.theme.spacing.md}px;
`;

const Header = styled.View`
	align-items: center;
	margin-bottom: ${(props) => props.theme.spacing.lg}px;
`;

const AvatarContainer = styled.View`
	width: 100px;
	height: 100px;
	border-radius: 50px;
	background-color: ${(props) => props.theme.colors.button.primary};
	justify-content: center;
	align-items: center;
	margin-bottom: ${(props) => props.theme.spacing.md}px;
	overflow: hidden;
`;

const AvatarImage = styled.Image`
	width: 100%;
	height: 100%;
	resize-mode: cover;
`;

const AvatarText = styled.Text`
	font-size: 40px;
	font-weight: bold;
	color: ${(props) => props.theme.colors.text.primary};
`;

const Name = styled.Text`
	font-size: 24px;
	font-weight: bold;
	color: ${(props) => props.theme.colors.text.primary};
	margin-bottom: 4px;
	text-align: center;
`;

const Email = styled.Text`
	font-size: 16px;
	color: ${(props) => props.theme.colors.text.secondary};
	text-align: center;
`;

const Section = styled.View`
	margin-bottom: ${(props) => props.theme.spacing.lg}px;
	padding-bottom: ${(props) => props.theme.spacing.md}px;
	border-bottom-width: 1px;
	border-bottom-color: ${(props) => props.theme.colors.border.secondary};
`;

const SectionTitle = styled.Text`
	font-size: 12px;
	font-weight: 600;
	color: ${(props) => props.theme.colors.text.tertiary};
	margin-bottom: 8px;
	text-transform: uppercase;
	letter-spacing: 0.5px;
`;

const SectionContent = styled.Text`
	font-size: 16px;
	color: ${(props) => props.theme.colors.text.primary};
	line-height: 24px;
`;

const EmptyContent = styled.Text`
	font-size: 14px;
	color: ${(props) => props.theme.colors.text.tertiary};
	font-style: italic;
`;

const ErrorText = styled.Text`
	font-size: 16px;
	color: ${(props) => props.theme.colors.text.error};
	text-align: center;
`;

const EmptyText = styled.Text`
	font-size: 16px;
	color: ${(props) => props.theme.colors.text.tertiary};
	text-align: center;
`;

const StatusBadge = styled.View`
	padding: 4px 12px;
	border-radius: 12px;
	background-color: ${(props) => props.theme.colors.status.success};
	margin-top: 8px;
	align-self: flex-start;
`;

const StatusText = styled.Text`
	font-size: 12px;
	font-weight: 600;
	color: ${(props) => props.theme.colors.text.primary};
`;

/**
 * Converte um Timestamp do Firestore para Date
 */
function timestampToDate(timestamp: any): Date | null {
	if (!timestamp) return null;

	// Se já for uma Date
	if (timestamp instanceof Date) {
		return timestamp;
	}

	// Se for um Timestamp do Firestore
	if (timestamp && typeof timestamp.toDate === "function") {
		return timestamp.toDate();
	}

	// Se for um objeto com seconds e nanoseconds
	if (timestamp && typeof timestamp.seconds === "number") {
		return new Date(timestamp.seconds * 1000);
	}

	// Se for uma string ISO
	if (typeof timestamp === "string") {
		return new Date(timestamp);
	}

	return null;
}

/**
 * Formata uma data para exibição
 */
function formatDate(date: Date | null): string {
	if (!date) return "Não disponível";

	return date.toLocaleDateString("pt-BR", {
		day: "2-digit",
		month: "long",
		year: "numeric",
		hour: "2-digit",
		minute: "2-digit",
	});
}

export default function ProfileScreen() {
	const { userProfile, firebaseUser, isLoading, error, syncPhotoURL } = useAuth();
	const theme = useTheme();

	// Priorizar photoURL do Firebase Auth (mais atualizado) sobre o do Firestore
	const photoURL = firebaseUser?.photoURL || userProfile?.photoURL;
	const displayName = userProfile?.displayName || firebaseUser?.displayName || "Usuário";
	const avatarInitial = displayName.charAt(0).toUpperCase();
	const createdAt = timestampToDate(userProfile?.createdAt);
	const updatedAt = timestampToDate(userProfile?.updatedAt);

	// Sincronizar photoURL quando a página carregar se necessário
	React.useEffect(() => {
		if (firebaseUser) {
			if (firebaseUser.photoURL && (!userProfile || !userProfile.photoURL)) {
				console.log("🔄 Detectado photoURL no Firebase Auth mas não no Firestore. Sincronizando...");
				syncPhotoURL();
			} else if (!firebaseUser.photoURL) {
				console.warn("⚠️ Firebase Auth não tem photoURL. O usuário pode precisar fazer login com Google novamente.");
			}
		}
	}, [firebaseUser?.photoURL, userProfile?.photoURL]);

	// Debug: Log para verificar os valores (deve estar antes dos early returns)
	React.useEffect(() => {
		if (userProfile || firebaseUser) {
			console.log("📸 Profile Debug:", {
				firebaseUserPhotoURL: firebaseUser?.photoURL,
				userProfilePhotoURL: userProfile?.photoURL,
				finalPhotoURL: photoURL,
				displayName,
			});
		}
	}, [firebaseUser?.photoURL, userProfile?.photoURL, photoURL, displayName]);

	if (isLoading) {
		return (
			<CenterContainer>
				<ActivityIndicator size="large" color={theme.colors.button.primary} />
			</CenterContainer>
		);
	}

	if (error) {
		return (
			<CenterContainer>
				<ErrorText>Erro ao carregar perfil: {error}</ErrorText>
			</CenterContainer>
		);
	}

	if (!userProfile) {
		return (
			<CenterContainer>
				<EmptyText>Perfil não encontrado</EmptyText>
			</CenterContainer>
		);
	}

	return (
		<Container contentContainerStyle={{ paddingBottom: 20 }}>
			<CardContainer>
				<Card
					style={{
						backgroundColor: theme.colors.background.card,
					}}
				>
					<Header>
						<AvatarContainer>
							{photoURL ? (
								<AvatarImage 
									source={{ uri: photoURL }} 
									resizeMode="cover"
									onError={(error) => {
										console.error("❌ Erro ao carregar imagem do avatar:", error.nativeEvent.error);
										console.log("📸 URL da imagem:", photoURL);
									}}
									onLoad={() => {
										console.log("✅ Imagem do avatar carregada com sucesso:", photoURL);
									}}
								/>
							) : (
								<AvatarText>{avatarInitial}</AvatarText>
							)}
						</AvatarContainer>
						<Name>{displayName}</Name>
						<Email>{userProfile.email}</Email>
						{userProfile.hasProfile && (
							<StatusBadge>
								<StatusText>Perfil Completo</StatusText>
							</StatusBadge>
						)}
						{!photoURL && (
							<EmptyContent style={{ marginTop: 8, textAlign: 'center' }}>
								Para ver sua foto do Google, faça logout e entre novamente usando "Entrar com Google"
							</EmptyContent>
						)}
					</Header>

					<Section>
						<SectionTitle>ID do Usuário</SectionTitle>
						<SectionContent>{userProfile.id}</SectionContent>
					</Section>

					<Section>
						<SectionTitle>Email</SectionTitle>
						<SectionContent>{userProfile.email}</SectionContent>
					</Section>

					<Section>
						<SectionTitle>Nome de Exibição</SectionTitle>
						<SectionContent>{displayName}</SectionContent>
					</Section>

					{userProfile.phoneNumber && (
						<Section>
							<SectionTitle>Telefone</SectionTitle>
							<SectionContent>{userProfile.phoneNumber}</SectionContent>
						</Section>
					)}

					{userProfile.bio && (
						<Section>
							<SectionTitle>Biografia</SectionTitle>
							<SectionContent>{userProfile.bio}</SectionContent>
						</Section>
					)}

					{photoURL && (
						<Section>
							<SectionTitle>Foto de Perfil</SectionTitle>
							<SectionContent>{photoURL}</SectionContent>
						</Section>
					)}

					<Section>
						<SectionTitle>Status do Perfil</SectionTitle>
						<SectionContent>
							{userProfile.hasProfile ? "Perfil Completo" : "Perfil Incompleto"}
						</SectionContent>
					</Section>

					{createdAt && (
						<Section>
							<SectionTitle>Membro desde</SectionTitle>
							<SectionContent>{formatDate(createdAt)}</SectionContent>
						</Section>
					)}

					{updatedAt && (
						<Section>
							<SectionTitle>Última atualização</SectionTitle>
							<SectionContent>{formatDate(updatedAt)}</SectionContent>
						</Section>
					)}
				</Card>
			</CardContainer>
		</Container>
	);
}
