import React, { useState, useEffect } from "react";
import { ActivityIndicator, Alert, ScrollView } from "react-native";
import { useTheme } from "styled-components/native";
import { Ionicons } from "@expo/vector-icons";
import Constants from "expo-constants";
import styled from "styled-components/native";
import { Card } from "@/shared/components";
import { useTranslation } from "@/core/i18n";
import { saveLanguage } from "@/core/i18n";

const Container = styled.ScrollView`
	flex: 1;
	background-color: ${(props) => props.theme.colors.background.primary};
`;

const Content = styled.View`
	padding: ${(props) => props.theme.spacing.lg}px;
`;

const Section = styled(Card)`
	margin-bottom: ${(props) => props.theme.spacing.md}px;
	background-color: ${(props) => props.theme.colors.background.card};
`;

const SectionTitle = styled.Text`
	font-size: ${(props) => props.theme.typography.fontSize.lg}px;
	font-weight: ${(props) => props.theme.typography.fontWeight.bold};
	font-family: ${(props) => props.theme.typography.fontFamily.primary};
	color: ${(props) => props.theme.colors.text.primary};
	margin-bottom: ${(props) => props.theme.spacing.sm}px;
`;

const SectionDescription = styled.Text`
	font-size: ${(props) => props.theme.typography.fontSize.sm}px;
	font-family: ${(props) => props.theme.typography.fontFamily.secondary};
	color: ${(props) => props.theme.colors.text.secondary};
	margin-bottom: ${(props) => props.theme.spacing.md}px;
`;

const LanguageOption = styled.TouchableOpacity<{ isSelected: boolean }>`
	flex-direction: row;
	align-items: center;
	justify-content: space-between;
	padding: ${(props) => props.theme.spacing.md}px;
	margin-bottom: ${(props) => props.theme.spacing.sm}px;
	background-color: ${(props) =>
		props.isSelected ? props.theme.colors.background.input : "transparent"};
	border-radius: ${(props) => props.theme.borderRadius.md}px;
	border-width: 1px;
	border-color: ${(props) =>
		props.isSelected ? props.theme.colors.button.primary : props.theme.colors.border.secondary};
`;

const LanguageOptionText = styled.Text`
	font-size: ${(props) => props.theme.typography.fontSize.base}px;
	font-family: ${(props) => props.theme.typography.fontFamily.primary};
	color: ${(props) => props.theme.colors.text.primary};
`;

const VersionInfo = styled.View`
	padding: ${(props) => props.theme.spacing.md}px;
`;

const VersionRow = styled.View`
	flex-direction: row;
	justify-content: space-between;
	align-items: center;
	margin-bottom: ${(props) => props.theme.spacing.sm}px;
`;

const VersionLabel = styled.Text`
	font-size: ${(props) => props.theme.typography.fontSize.base}px;
	font-family: ${(props) => props.theme.typography.fontFamily.primary};
	color: ${(props) => props.theme.colors.text.secondary};
`;

const VersionValue = styled.Text`
	font-size: ${(props) => props.theme.typography.fontSize.base}px;
	font-family: ${(props) => props.theme.typography.fontFamily.primary};
	color: ${(props) => props.theme.colors.text.primary};
	font-weight: ${(props) => props.theme.typography.fontWeight.semibold};
`;

const LoadingContainer = styled.View`
	flex: 1;
	justify-content: center;
	align-items: center;
	padding: ${(props) => props.theme.spacing.xl}px;
`;

interface LanguageOption {
	code: string;
	label: string;
}

export default function SettingsScreen() {
	const theme = useTheme();
	const { t, currentLanguage } = useTranslation();
	const [isChangingLanguage, setIsChangingLanguage] = useState(false);

	const languages: LanguageOption[] = [
		{ code: "pt-BR", label: t("settings.portuguese") },
		{ code: "en", label: t("settings.english") },
		{ code: "es", label: t("settings.spanish") },
	];

	const handleLanguageChange = async (languageCode: string) => {
		if (languageCode === currentLanguage) return;

		setIsChangingLanguage(true);
		try {
			await saveLanguage(languageCode);
			// O idioma será atualizado automaticamente via i18n
			// Não precisamos mostrar alerta, apenas atualizar o estado
		} catch (error) {
			console.error("❌ Erro ao alterar idioma:", error);
			Alert.alert(t("errors.generic"), t("errors.generic"));
		} finally {
			setIsChangingLanguage(false);
		}
	};

	// Obter versão do app
	const appVersion = Constants.expoConfig?.version || Constants.manifest?.version || "1.0.0";
	// Obter versão do runtime EAS
	const runtimeVersion = Constants.expoConfig?.runtimeVersion || Constants.expoConfig?.sdkVersion || Constants.manifest?.sdkVersion || "N/A";

	return (
		<Container>
			<Content>
				{/* Seção de Idioma */}
				<Section>
					<SectionTitle>{t("settings.language")}</SectionTitle>
					<SectionDescription>{t("settings.languageDescription")}</SectionDescription>
					{languages.map((lang) => (
						<LanguageOption
							key={lang.code}
							isSelected={currentLanguage === lang.code}
							onPress={() => handleLanguageChange(lang.code)}
							disabled={isChangingLanguage}
							activeOpacity={0.7}
						>
							<LanguageOptionText>{lang.label}</LanguageOptionText>
							{currentLanguage === lang.code && (
								<Ionicons name="checkmark-circle" size={24} color={theme.colors.button.primary} />
							)}
						</LanguageOption>
					))}
					{isChangingLanguage && (
						<LoadingContainer>
							<ActivityIndicator size="small" color={theme.colors.button.primary} />
						</LoadingContainer>
					)}
				</Section>

				{/* Seção de Versão */}
				<Section>
					<SectionTitle>{t("settings.appVersion")}</SectionTitle>
					<VersionInfo>
						<VersionRow>
							<VersionLabel>{t("settings.appVersion")}</VersionLabel>
							<VersionValue>{appVersion}</VersionValue>
						</VersionRow>
						<VersionRow>
							<VersionLabel>{t("settings.runtimeVersion")}</VersionLabel>
							<VersionValue>{runtimeVersion}</VersionValue>
						</VersionRow>
					</VersionInfo>
				</Section>
			</Content>
		</Container>
	);
}

