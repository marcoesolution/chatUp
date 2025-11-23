import React, { useState } from "react";
import { ActivityIndicator } from "react-native";
import { useTheme } from "styled-components/native";
import { useAuth } from "@/modules/auth";
import { Card } from "@/shared/components";
import {
	ProfileContainer,
	ProfileCenterContainer,
	ProfileCardContainer,
	ProfileHeader,
	ProfileAvatarContainer,
	ProfileAvatarImage,
	ProfileAvatarText,
	ProfileName,
	ProfileEmail,
	ProfileSection,
	ProfileSectionTitle,
	ProfileSectionContent,
	ProfileEmptyContent,
	ProfileErrorText,
	ProfileEmptyText,
	ProfileStatusBadge,
	ProfileStatusText,
} from "./styles";

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
	const [imageLoaded, setImageLoaded] = useState(false);

	// Priorizar photoURL do Firebase Auth (mais atualizado) sobre o do Firestore
	const photoURL = firebaseUser?.photoURL || userProfile?.photoURL;
	const displayName = userProfile?.displayName || firebaseUser?.displayName || "Usuário";
	const avatarInitial = displayName.charAt(0).toUpperCase();
	const createdAt = timestampToDate(userProfile?.createdAt);
	const updatedAt = timestampToDate(userProfile?.updatedAt);

	// Resetar estado de carregamento quando photoURL mudar
	React.useEffect(() => {
		setImageLoaded(false);
	}, [photoURL]);

	// Sincronizar photoURL quando a página carregar se necessário
	React.useEffect(() => {
		if (firebaseUser) {
			if (firebaseUser.photoURL && (!userProfile || !userProfile.photoURL)) {
				console.log("🔄 Detectado photoURL no Firebase Auth mas não no Firestore. Sincronizando...");
				syncPhotoURL();
			} else if (!firebaseUser.photoURL) {
				console.warn(
					"⚠️ Firebase Auth não tem photoURL. O usuário pode precisar fazer login com Google novamente."
				);
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
			<ProfileCenterContainer>
				<ActivityIndicator size="large" color={theme.colors.button.primary} />
			</ProfileCenterContainer>
		);
	}

	if (error) {
		return (
			<ProfileCenterContainer>
				<ProfileErrorText>Erro ao carregar perfil: {error}</ProfileErrorText>
			</ProfileCenterContainer>
		);
	}

	if (!userProfile) {
		return (
			<ProfileCenterContainer>
				<ProfileEmptyText>Perfil não encontrado</ProfileEmptyText>
			</ProfileCenterContainer>
		);
	}

	return (
		<ProfileContainer>
			<ProfileCardContainer>
				<Card
					style={{
						backgroundColor: theme.colors.background.card,
					}}
				>
					<ProfileHeader>
						<ProfileAvatarContainer>
							{photoURL ? (
								<>
									{!imageLoaded && (
										<ProfileAvatarText style={{ position: "absolute", zIndex: 1 }}>
											{avatarInitial}
										</ProfileAvatarText>
									)}
									<ProfileAvatarImage
										source={{ uri: photoURL }}
										contentFit="cover"
										transition={200}
										cachePolicy="memory-disk"
										onError={(error: any) => {
											console.error("❌ Erro ao carregar imagem do avatar:", error);
											console.log("📸 URL da imagem:", photoURL);
											setImageLoaded(false);
										}}
										onLoad={() => {
											console.log("✅ Imagem do avatar carregada com sucesso:", photoURL);
											setImageLoaded(true);
										}}
										style={{ opacity: imageLoaded ? 1 : 0 }}
									/>
								</>
							) : (
								<ProfileAvatarText>{avatarInitial}</ProfileAvatarText>
							)}
						</ProfileAvatarContainer>
						<ProfileName>{displayName}</ProfileName>
						<ProfileEmail>{userProfile.email}</ProfileEmail>
						{userProfile.hasProfile && (
							<ProfileStatusBadge>
								<ProfileStatusText>Perfil Completo</ProfileStatusText>
							</ProfileStatusBadge>
						)}
						{!photoURL && (
							<ProfileEmptyContent style={{ marginTop: 8, textAlign: "center" }}>
								Para ver sua foto do Google, faça logout e entre novamente usando "Entrar com Google"
							</ProfileEmptyContent>
						)}
					</ProfileHeader>

					<ProfileSection>
						<ProfileSectionTitle>ID do Usuário</ProfileSectionTitle>
						<ProfileSectionContent>{userProfile.id}</ProfileSectionContent>
					</ProfileSection>

					<ProfileSection>
						<ProfileSectionTitle>Email</ProfileSectionTitle>
						<ProfileSectionContent>{userProfile.email}</ProfileSectionContent>
					</ProfileSection>

					<ProfileSection>
						<ProfileSectionTitle>Nome de Exibição</ProfileSectionTitle>
						<ProfileSectionContent>{displayName}</ProfileSectionContent>
					</ProfileSection>

					{userProfile.phoneNumber && (
						<ProfileSection>
							<ProfileSectionTitle>Telefone</ProfileSectionTitle>
							<ProfileSectionContent>{userProfile.phoneNumber}</ProfileSectionContent>
						</ProfileSection>
					)}

					{userProfile.bio && (
						<ProfileSection>
							<ProfileSectionTitle>Biografia</ProfileSectionTitle>
							<ProfileSectionContent>{userProfile.bio}</ProfileSectionContent>
						</ProfileSection>
					)}

					{photoURL && (
						<ProfileSection>
							<ProfileSectionTitle>Foto de Perfil</ProfileSectionTitle>
							<ProfileSectionContent>{photoURL}</ProfileSectionContent>
						</ProfileSection>
					)}

					<ProfileSection>
						<ProfileSectionTitle>Status do Perfil</ProfileSectionTitle>
						<ProfileSectionContent>
							{userProfile.hasProfile ? "Perfil Completo" : "Perfil Incompleto"}
						</ProfileSectionContent>
					</ProfileSection>

					{createdAt && (
						<ProfileSection>
							<ProfileSectionTitle>Membro desde</ProfileSectionTitle>
							<ProfileSectionContent>{formatDate(createdAt)}</ProfileSectionContent>
						</ProfileSection>
					)}

					{updatedAt && (
						<ProfileSection>
							<ProfileSectionTitle>Última atualização</ProfileSectionTitle>
							<ProfileSectionContent>{formatDate(updatedAt)}</ProfileSectionContent>
						</ProfileSection>
					)}
				</Card>
			</ProfileCardContainer>
		</ProfileContainer>
	);
}
