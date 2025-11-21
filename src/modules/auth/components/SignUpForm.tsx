import React from "react";
import { useForm, Controller } from "react-hook-form";
import { KeyboardAvoidingView, Platform, ScrollView } from "react-native";
import styled, { useTheme } from "styled-components/native";
import { Mail, Lock, User } from "lucide-react-native";
import { Input, Button, Link } from "@/shared/components";
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
	color: ${(props) => props.theme.colors.error};
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
					<Title>Create Account</Title>
					<Subtitle>Sign up to start chatting</Subtitle>

					{error && <ErrorText>{error}</ErrorText>}

					<Controller
						control={control}
						rules={{
							required: "Nome é obrigatório",
							minLength: {
								value: 2,
								message: "Nome deve ter no mínimo 2 caracteres",
							},
						}}
						render={({ field: { onChange, onBlur, value } }) => (
							<Input
								label="Name"
								placeholder="Enter your name"
								icon={<User size={20} color={theme.colors.icon.secondary} strokeWidth={2} />}
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
							title="Sign Up"
							onPress={handleSubmit(handleFormSubmit)}
							variant="primary"
							loading={isLoading}
						/>
					</ButtonContainer>

					<FooterContainer>
						<FooterText>Already have an account? </FooterText>
						<Link onPress={onGoToLogin} variant="primary">
							Log In
						</Link>
					</FooterContainer>
				</Form>
			</ScrollContent>
		</FormContainer>
	);
};

