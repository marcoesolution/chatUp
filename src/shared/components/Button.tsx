import React from 'react';
import { ActivityIndicator, ViewStyle } from 'react-native';
import styled from 'styled-components/native';

interface ButtonProps {
	title: string;
	onPress: () => void;
	variant?: 'primary' | 'secondary' | 'save' | 'delete' | 'warning' | 'default' | 'outline';
	loading?: boolean;
	disabled?: boolean;
	style?: ViewStyle;
}

const StyledButton = styled.TouchableOpacity<{
	variant: string;
	disabled: boolean;
}>`
	padding: ${(props) => props.theme.spacing.md}px ${(props) => props.theme.spacing.lg}px;
	border-radius: ${(props) => props.theme.borderRadius.md}px;
	align-items: center;
	justify-content: center;
	min-height: 48px;
	background-color: ${(props) => {
		if (props.disabled) return props.theme.colors.button.disabled;
		switch (props.variant) {
			case 'save':
				return props.theme.colors.button.save;
			case 'delete':
				return props.theme.colors.button.delete;
			case 'warning':
				return props.theme.colors.button.warning;
			case 'secondary':
				return props.theme.colors.button.secondary;
			case 'outline':
				return 'transparent';
			case 'default':
			case 'primary':
			default:
				return props.theme.colors.button.primary;
		}
	}};
	border-width: ${(props) => (props.variant === 'outline' ? '2px' : '0px')};
	border-color: ${(props) =>
		props.variant === 'outline'
			? props.theme.colors.button.primary
			: 'transparent'};
	opacity: ${(props) => (props.disabled ? 0.5 : 1)};
`;

const ButtonText = styled.Text<{
	variant: string;
	disabled: boolean;
}>`
	font-size: ${(props) => props.theme.typography.fontSize.base}px;
	font-weight: ${(props) => props.theme.typography.fontWeight.semibold};
	font-family: ${(props) => props.theme.typography.fontFamily.primary};
	color: ${(props) => {
		if (props.disabled) return props.theme.colors.button.textDisabled;
		if (props.variant === 'outline') {
			return props.theme.colors.button.primary;
		}
		return props.theme.colors.button.text;
	}};
`;

export const Button: React.FC<ButtonProps> = ({
	title,
	onPress,
	variant = 'primary',
	loading = false,
	disabled = false,
	style,
}) => {
	const isDisabled = disabled || loading;

	return (
		<StyledButton
			variant={variant}
			disabled={isDisabled}
			onPress={onPress}
			activeOpacity={0.7}
			style={style}
		>
			{loading ? (
				<ActivityIndicator
					color={
						variant === 'outline'
							? '#5b9bd5'
							: '#ffffff'
					}
				/>
			) : (
				<ButtonText variant={variant} disabled={isDisabled}>
					{title}
				</ButtonText>
			)}
		</StyledButton>
	);
};
