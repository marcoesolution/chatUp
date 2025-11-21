import React, { useState, ReactNode } from "react";
import { TextInput, TextInputProps } from "react-native";
import styled, { useTheme } from "styled-components/native";
import { Ionicons } from "@expo/vector-icons";

interface InputProps extends TextInputProps {
	label?: string;
	error?: string;
	icon?: ReactNode;
	showPasswordToggle?: boolean;
}

const Container = styled.View`
	margin-bottom: ${(props) => props.theme.spacing.lg}px;
`;

const Label = styled.Text`
	font-size: ${(props) => props.theme.typography.fontSize.sm}px;
	font-weight: ${(props) => props.theme.typography.fontWeight.semibold};
	font-family: ${(props) => props.theme.typography.fontFamily.primary};
	color: ${(props) => props.theme.colors.text.primary};
	margin-bottom: ${(props) => props.theme.spacing.sm}px;
`;

const InputContainer = styled.View<{ hasError?: boolean }>`
	flex-direction: row;
	align-items: center;
	background-color: ${(props) => props.theme.colors.background.input};
	border-width: 2px;
	border-color: ${(props) => (props.hasError ? props.theme.colors.border.error : props.theme.colors.border.primary)};
	border-radius: ${(props) => props.theme.borderRadius.md}px;
	padding: 0 ${(props) => props.theme.spacing.md}px;
	min-height: 52px;
`;

const IconContainer = styled.View`
	margin-right: ${(props) => props.theme.spacing.md}px;
	justify-content: center;
	align-items: center;
`;

const InputField = styled.TextInput<{ hasError?: boolean }>`
	flex: 1;
	font-size: ${(props) => props.theme.typography.fontSize.base}px;
	font-family: ${(props) => props.theme.typography.fontFamily.primary};
	color: ${(props) => props.theme.colors.text.primary};
	padding: ${(props) => props.theme.spacing.md}px 0;
`;

const PasswordToggle = styled.TouchableOpacity`
	padding: ${(props) => props.theme.spacing.sm}px;
`;

const ErrorText = styled.Text`
	font-size: ${(props) => props.theme.typography.fontSize.xs}px;
	font-family: ${(props) => props.theme.typography.fontFamily.primary};
	color: ${(props) => props.theme.colors.text.error};
	margin-top: ${(props) => props.theme.spacing.xs}px;
`;

export const Input: React.FC<InputProps> = ({
	label,
	error,
	icon,
	showPasswordToggle = false,
	secureTextEntry,
	...textInputProps
}) => {
	const theme = useTheme();
	const [isPasswordVisible, setIsPasswordVisible] = useState(false);

	return (
		<Container>
			{label && <Label>{label}</Label>}
			<InputContainer hasError={!!error}>
				{icon && <IconContainer>{icon}</IconContainer>}
				<InputField
					hasError={!!error}
					placeholderTextColor={theme.colors.text.tertiary}
					secureTextEntry={secureTextEntry && !isPasswordVisible}
					{...textInputProps}
				/>
				{showPasswordToggle && secureTextEntry && (
					<PasswordToggle onPress={() => setIsPasswordVisible(!isPasswordVisible)} activeOpacity={0.7}>
						<Ionicons 
							name={isPasswordVisible ? "eye" : "eye-off"} 
							size={20} 
							color={theme.colors.icon.secondary} 
						/>
					</PasswordToggle>
				)}
			</InputContainer>
			{error && <ErrorText>{error}</ErrorText>}
		</Container>
	);
};
