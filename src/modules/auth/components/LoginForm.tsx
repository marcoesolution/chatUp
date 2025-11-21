import React from "react";
import { useForm, Controller } from "react-hook-form";
import { KeyboardAvoidingView, Platform, ScrollView } from "react-native";
import styled, { useTheme } from "styled-components/native";
import { Mail, Lock, Chrome, Facebook } from "lucide-react-native";
import { Input, Button, Link } from "@/shared/components";
import type { LoginCredentials } from "../types";

interface LoginFormProps {
	onSubmit: (data: LoginCredentials) => void;
	onForgotPassword: () => void;
	isLoading?: boolean;
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

const DividerContainer = styled.View`
	flex-direction: row;
	align-items: center;
	margin: 24px 0;
`;

const DividerLine = styled.View`
	flex: 1;
	height: 1px;
	background-color: ${(props) => props.theme.colors.border.secondary};
`;

const DividerText = styled.Text`
	margin: 0 ${(props) => props.theme.spacing.md}px;
	font-size: ${(props) => props.theme.typography.fontSize.sm}px;
	font-family: ${(props) => props.theme.typography.fontFamily.primary};
	color: ${(props) => props.theme.colors.text.secondary};
`;

const SocialButton = styled.TouchableOpacity`
	flex-direction: row;
	align-items: center;
	justify-content: center;
	background-color: ${(props) => props.theme.colors.background.input};
	border-radius: ${(props) => props.theme.borderRadius.md}px;
	padding: ${(props) => props.theme.spacing.md}px;
	margin-bottom: ${(props) => props.theme.spacing.md}px;
`;

const SocialButtonText = styled.Text`
	font-size: ${(props) => props.theme.typography.fontSize.base}px;
	font-weight: ${(props) => props.theme.typography.fontWeight.semibold};
	font-family: ${(props) => props.theme.typography.fontFamily.primary};
	color: ${(props) => props.theme.colors.text.primary};
	margin-left: ${(props) => props.theme.spacing.md}px;
`;

const SocialIconContainer = styled.View`
	width: 20px;
	height: 20px;
	justify-content: center;
	align-items: center;
`;

const ForgotPasswordContainer = styled.View`
	align-items: flex-end;
	margin-top: 8px;
	margin-bottom: 24px;
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

export const LoginForm: React.FC<LoginFormProps> = ({ onSubmit, onForgotPassword, isLoading = false }) => {
	const theme = useTheme();
	const {
		control,
		handleSubmit,
		formState: { errors },
	} = useForm<LoginCredentials>({
		defaultValues: {
			email: "",
			password: "",
		},
	});

	const handleFormSubmit = (data: LoginCredentials) => {
		console.log("Login form submitted:", data);
		onSubmit(data);
	};

	return (
		<FormContainer
			behavior={Platform.OS === "ios" ? "padding" : "height"}
			keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
		>
			<ScrollContent contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
				<Form>
					<Title>Welcome Back!</Title>
					<Subtitle>Log in to continue your conversations</Subtitle>

					<Controller
						control={control}
						rules={{
							required: "Email é obrigatório",
							pattern: {
								value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
								message: "Email inválido",
							},
						}}
						render={({ field: { onChange, onBlur, value } }) => (
							<Input
								label="Email"
								placeholder="Enter your email"
								icon={<Mail size={20} color={theme.colors.icon.secondary} strokeWidth={2} />}
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
							required: "Senha é obrigatória",
							minLength: {
								value: 6,
								message: "Senha deve ter no mínimo 6 caracteres",
							},
						}}
						render={({ field: { onChange, onBlur, value } }) => (
							<Input
								label="Password"
								placeholder="Enter your password"
								icon={<Lock size={20} color={theme.colors.icon.secondary} strokeWidth={2} />}
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
							title="Log In"
							onPress={handleSubmit(handleFormSubmit)}
							variant="primary"
							loading={isLoading}
						/>
					</ButtonContainer>

					<ForgotPasswordContainer>
						<Link onPress={onForgotPassword} variant="primary">
							Forgot Password?
						</Link>
					</ForgotPasswordContainer>

					<DividerContainer>
						<DividerLine />
						<DividerText>OR</DividerText>
						<DividerLine />
					</DividerContainer>

					<SocialButton activeOpacity={0.7} disabled>
						<SocialIconContainer>
							<Chrome size={20} color={theme.colors.icon.primary} strokeWidth={2} />
						</SocialIconContainer>
						<SocialButtonText>Continue with Google</SocialButtonText>
					</SocialButton>

					<SocialButton activeOpacity={0.7} disabled>
						<SocialIconContainer>
							<Facebook size={20} color={theme.colors.icon.primary} strokeWidth={2} />
						</SocialIconContainer>
						<SocialButtonText>Continue with Facebook</SocialButtonText>
					</SocialButton>

					<FooterContainer>
						<FooterText>Don't have an account? </FooterText>
						<Link onPress={() => {}} variant="primary">
							Sign Up
						</Link>
					</FooterContainer>
				</Form>
			</ScrollContent>
		</FormContainer>
	);
};
