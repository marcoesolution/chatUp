import React from "react";
import { useForm, Controller } from "react-hook-form";
import { KeyboardAvoidingView, Platform, ScrollView } from "react-native";
import styled, { useTheme } from "styled-components/native";
import { Ionicons } from "@expo/vector-icons";
import { Input, Button, Link } from "@/shared/components";
import { useTranslation } from "@/core/i18n";
import type { RegisterData } from "../types";

interface SignUpFormProps {
	onSubmit: (data: RegisterData) => void;
	onGoToLogin: () => void;
	isLoading?: boolean;
	error?: string | null;
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

const FooterContainer = styled.View`
	flex-direction: row;
	justify-content: center;
	align-items: center;
	margin-top: 24px;
`;

const FooterText = styled.Text`
	font-size: ${(props) => props.theme.typography.fontSize.sm}px;
	font-family: ${(props) => props.theme.typography.fontFamily.secondary};
	color: ${(props) => props.theme.colors.text.secondary};
`;

export const SignUpForm: React.FC<SignUpFormProps> = ({ onSubmit, onGoToLogin, isLoading = false, error }) => {
	const theme = useTheme();
	const { t } = useTranslation();
	const {
		control,
		handleSubmit,
		formState: { errors },
	} = useForm<RegisterData>({
		defaultValues: {
			name: "",
			email: "",
			password: "",
		},
	});

	const handleFormSubmit = (data: RegisterData) => {
		onSubmit(data);
	};

	return (
		<FormContainer
			behavior={Platform.OS === "ios" ? "padding" : "height"}
			keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
		>
			<ScrollContent contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
				<Form>
					<Title>{t("auth.createAccount")}</Title>
					<Subtitle>{t("auth.signUpSubtitle")}</Subtitle>

					{error && <ErrorText>{error}</ErrorText>}

					<Controller
						control={control}
						rules={{
							required: t("auth.nameRequired"),
							minLength: {
								value: 2,
								message: t("auth.nameMinLength"),
							},
						}}
						render={({ field: { onChange, onBlur, value } }) => (
							<Input
								label={t("auth.name")}
								placeholder={t("auth.namePlaceholder")}
								icon={<Ionicons name="person" size={20} color={theme.colors.icon.secondary} />}
								autoCapitalize="words"
								autoCorrect={false}
								value={value}
								onChangeText={onChange}
								onBlur={onBlur}
								error={errors.name?.message}
							/>
						)}
						name="name"
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
								icon={<Ionicons name="mail" size={20} color={theme.colors.icon.secondary} />}
								keyboardType="email-address"
								autoCapitalize="none"
								autoCorrect={false}
								value={value}
								onChangeText={onChange}
								onBlur={onBlur}
								error={errors.email?.message}
							/>
						)}
						name="email"
					/>

					<Controller
						control={control}
						rules={{
							required: t("auth.passwordRequired"),
							minLength: {
								value: 6,
								message: t("auth.passwordMinLength"),
							},
						}}
						render={({ field: { onChange, onBlur, value } }) => (
							<Input
								label={t("auth.password")}
								placeholder={t("auth.passwordPlaceholder")}
								icon={<Ionicons name="lock-closed" size={20} color={theme.colors.icon.secondary} />}
								secureTextEntry
								showPasswordToggle
								autoCapitalize="none"
								autoCorrect={false}
								value={value}
								onChangeText={onChange}
								onBlur={onBlur}
								error={errors.password?.message}
							/>
						)}
						name="password"
					/>

					<ButtonContainer>
						<Button
							title={t("auth.signUp")}
							onPress={handleSubmit(handleFormSubmit)}
							variant="primary"
							loading={isLoading}
						/>
					</ButtonContainer>

					<FooterContainer>
						<FooterText>{t("auth.alreadyHaveAccount")}</FooterText>
						<Link onPress={onGoToLogin} variant="primary">
							{t("auth.login")}
						</Link>
					</FooterContainer>
				</Form>
			</ScrollContent>
		</FormContainer>
	);
};
