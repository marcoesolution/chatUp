import React, { useState } from "react";
import { ActivityIndicator } from "react-native";
import { useTheme } from "styled-components/native";
import { useAuth } from "@/modules/auth";
import { Card } from "@/shared/components";
import { useTranslation } from "@/core/i18n";
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
} from "./_styles";

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
function formatDate(date: Date | null, locale: string): string {
	if (!date) return "";

	return date.toLocaleDateString(locale === "pt-BR" ? "pt-BR" : locale === "es" ? "es-ES" : "en-US", {
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
	const { t, currentLanguage } = useTranslation();
	const [imageLoaded, setImageLoaded] = useState(false);

	// Priorizar photoURL do Firebase Auth (mais atualizado) sobre o do Firestore
	const photoURL = firebaseUser?.photoURL || userProfile?.photoURL;
	const displayName = userProfile?.displayName || firebaseUser?.displayName || t("profile.user");
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
				<ProfileErrorText>
					{t("profile.errorLoading")}: {error}
				</ProfileErrorText>
			</ProfileCenterContainer>
		);
	}

	if (!userProfile) {
		return (
			<ProfileCenterContainer>
				<ProfileEmptyText>{t("profile.notFound")}</ProfileEmptyText>
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
								<ProfileStatusText>{t("profile.profileComplete")}</ProfileStatusText>
							</ProfileStatusBadge>
						)}
						{!photoURL && (
							<ProfileEmptyContent style={{ marginTop: 8, textAlign: "center" }}>
								{t("profile.googlePhotoHint")}
							</ProfileEmptyContent>
						)}
					</ProfileHeader>

					<ProfileSection>
						<ProfileSectionTitle>{t("profile.userId")}</ProfileSectionTitle>
						<ProfileSectionContent>{userProfile.id}</ProfileSectionContent>
					</ProfileSection>

					<ProfileSection>
						<ProfileSectionTitle>{t("profile.email")}</ProfileSectionTitle>
						<ProfileSectionContent>{userProfile.email}</ProfileSectionContent>
					</ProfileSection>

					<ProfileSection>
						<ProfileSectionTitle>{t("profile.displayName")}</ProfileSectionTitle>
						<ProfileSectionContent>{displayName}</ProfileSectionContent>
					</ProfileSection>

					{userProfile.phoneNumber && (
						<ProfileSection>
							<ProfileSectionTitle>{t("profile.phoneNumber")}</ProfileSectionTitle>
							<ProfileSectionContent>{userProfile.phoneNumber}</ProfileSectionContent>
						</ProfileSection>
					)}

					{userProfile.bio && (
						<ProfileSection>
							<ProfileSectionTitle>{t("profile.bio")}</ProfileSectionTitle>
							<ProfileSectionContent>{userProfile.bio}</ProfileSectionContent>
						</ProfileSection>
					)}

					{photoURL && (
						<ProfileSection>
							<ProfileSectionTitle>{t("profile.photoURL")}</ProfileSectionTitle>
							<ProfileSectionContent>{photoURL}</ProfileSectionContent>
						</ProfileSection>
					)}

					<ProfileSection>
						<ProfileSectionTitle>{t("profile.profileStatus")}</ProfileSectionTitle>
						<ProfileSectionContent>
							{userProfile.hasProfile ? t("profile.profileComplete") : t("profile.profileIncomplete")}
						</ProfileSectionContent>
					</ProfileSection>

					{createdAt && (
						<ProfileSection>
							<ProfileSectionTitle>{t("profile.memberSince")}</ProfileSectionTitle>
							<ProfileSectionContent>
								{formatDate(createdAt, currentLanguage) || t("profile.notAvailable")}
							</ProfileSectionContent>
						</ProfileSection>
					)}

					{updatedAt && (
						<ProfileSection>
							<ProfileSectionTitle>{t("profile.lastUpdate")}</ProfileSectionTitle>
							<ProfileSectionContent>
								{formatDate(updatedAt, currentLanguage) || t("profile.notAvailable")}
							</ProfileSectionContent>
						</ProfileSection>
					)}
				</Card>
			</ProfileCardContainer>
		</ProfileContainer>
	);
}
