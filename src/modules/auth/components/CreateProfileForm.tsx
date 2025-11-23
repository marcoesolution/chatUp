import React, { useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { KeyboardAvoidingView, Platform, ScrollView } from "react-native";
import styled, { useTheme } from "styled-components/native";
import { Ionicons } from "@expo/vector-icons";
import { Input, Button } from "@/shared/components";
import { useTranslation } from "@/core/i18n";
import type { CreateProfileData } from "../types";

interface CreateProfileFormProps {
	onSubmit: (data: CreateProfileData) => void;
	isLoading?: boolean;
	error?: string | null;
	initialEmail?: string;
	initialName?: string;
}

const FormContainer = styled(KeyboardAvoidingView)`
	flex: 1;
	background-color: ${(props) => props.theme.colors.background.primary};
`;

const ScrollContent = styled(ScrollView)`
	flex: 1;
`;

const Form = styled.View`
	padding: ${(props) => props.theme.spacing.lg}px;
`;

const Title = styled.Text`
	font-size: ${(props) => props.theme.typography.fontSize["3xl"]}px;
	font-weight: ${(props) => props.theme.typography.fontWeight.extrabold};
	font-family: ${(props) => props.theme.typography.fontFamily.primary};
	color: ${(props) => props.theme.colors.text.primary};
	margin-bottom: ${(props) => props.theme.spacing.sm}px;
	letter-spacing: -0.5px;
	text-align: center;
`;

const Subtitle = styled.Text`
	font-size: ${(props) => props.theme.typography.fontSize.base}px;
	font-family: ${(props) => props.theme.typography.fontFamily.secondary};
	color: ${(props) => props.theme.colors.text.secondary};
	margin-bottom: ${(props) => props.theme.spacing.xl}px;
	line-height: ${(props) => props.theme.typography.lineHeight.normal};
	text-align: center;
`;

const ButtonContainer = styled.View`
	margin-top: 8px;
	margin-bottom: 24px;
`;

const ErrorText = styled.Text`
	color: ${(props) => props.theme.colors.text.error};
	font-size: ${(props) => props.theme.typography.fontSize.sm}px;
	font-family: ${(props) => props.theme.typography.fontFamily.primary};
	margin-bottom: ${(props) => props.theme.spacing.md}px;
	text-align: center;
`;

const InfoText = styled.Text`
	font-size: ${(props) => props.theme.typography.fontSize.sm}px;
	font-family: ${(props) => props.theme.typography.fontFamily.secondary};
	color: ${(props) => props.theme.colors.text.secondary};
	margin-bottom: ${(props) => props.theme.spacing.md}px;
	text-align: center;
	font-style: italic;
`;

export const CreateProfileForm: React.FC<CreateProfileFormProps> = ({
	onSubmit,
	isLoading = false,
	error,
	initialEmail = "",
	initialName = "",
}) => {
	const theme = useTheme();
	const { t } = useTranslation();
	const {
		control,
		handleSubmit,
		formState: { errors },
		reset,
	} = useForm<CreateProfileData>({
		defaultValues: {
			email: initialEmail,
			displayName: initialName,
			phoneNumber: "",
			bio: "",
		},
	});

	// Atualizar valores do formulário quando as props mudarem
	useEffect(() => {
		reset({
			email: initialEmail || "",
			displayName: initialName || "",
			phoneNumber: "",
			bio: "",
		});
	}, [initialEmail, initialName, reset]);

	const handleFormSubmit = (data: CreateProfileData) => {
		onSubmit(data);
	};

	return (
		<FormContainer
			behavior={Platform.OS === "ios" ? "padding" : "height"}
			keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
		>
			<ScrollContent contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
				<Form>
					<Title>{t("auth.completeProfile")}</Title>
					<Subtitle>{t("auth.completeProfileSubtitle")}</Subtitle>

					{error && <ErrorText>{error}</ErrorText>}

					<InfoText>{t("auth.canUpdateLater")}</InfoText>

					<Controller
						control={control}
						rules={{
							required: t("auth.displayNameRequired"),
							minLength: {
								value: 2,
								message: t("auth.nameMinLength"),
							},
						}}
						render={({ field: { onChange, onBlur, value } }) => (
							<Input
								label={t("auth.displayName")}
								placeholder={t("auth.displayNamePlaceholder")}
								icon={<Ionicons name="person" size={20} color={theme.colors.icon.secondary} />}
								autoCapitalize="words"
								autoCorrect={false}
								value={value}
								onChangeText={onChange}
								onBlur={onBlur}
								error={errors.displayName?.message}
							/>
						)}
						name="displayName"
					/>

					<Controller
						control={control}
						rules={{
							required: t("auth.emailRequired"),
							pattern: {
								value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
								message: t("auth.emailInvalid"),
							},
						}}
						render={({ field: { onChange, onBlur, value } }) => (
							<Input
								label={t("auth.email")}
								placeholder={t("auth.emailPlaceholder")}
								keyboardType="email-address"
								autoCapitalize="none"
								autoCorrect={false}
								value={value || initialEmail || ""}
								onChangeText={onChange}
								onBlur={onBlur}
								error={errors.email?.message}
								editable={false}
							/>
						)}
						name="email"
					/>

					<Controller
						control={control}
						rules={{}}
						render={({ field: { onChange, onBlur, value } }) => (
							<Input
								label={t("auth.phoneOptional")}
								placeholder={t("auth.phoneNumberPlaceholder")}
								icon={<Ionicons name="call" size={20} color={theme.colors.icon.secondary} />}
								keyboardType="phone-pad"
								autoCapitalize="none"
								autoCorrect={false}
								value={value}
								onChangeText={onChange}
								onBlur={onBlur}
								error={errors.phoneNumber?.message}
							/>
						)}
						name="phoneNumber"
					/>

					<Controller
						control={control}
						rules={{
							maxLength: {
								value: 200,
								message: t("auth.bioMaxLength"),
							},
						}}
						render={({ field: { onChange, onBlur, value } }) => (
							<Input
								label={t("auth.bioOptional")}
								placeholder={t("auth.bioPlaceholder")}
								icon={<Ionicons name="document-text" size={20} color={theme.colors.icon.secondary} />}
								multiline
								numberOfLines={4}
								autoCapitalize="sentences"
								autoCorrect={true}
								value={value}
								onChangeText={onChange}
								onBlur={onBlur}
								error={errors.bio?.message}
							/>
						)}
						name="bio"
					/>

					<ButtonContainer>
						<Button
							title={t("auth.completeProfileButton")}
							onPress={handleSubmit(handleFormSubmit)}
							variant="primary"
							loading={isLoading}
						/>
					</ButtonContainer>
				</Form>
			</ScrollContent>
		</FormContainer>
	);
};
