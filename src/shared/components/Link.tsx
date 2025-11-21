import React from 'react';
import { TouchableOpacity, TouchableOpacityProps } from 'react-native';
import styled from 'styled-components/native';

interface LinkProps extends TouchableOpacityProps {
	children: React.ReactNode;
	variant?: 'primary' | 'secondary';
}

const LinkText = styled.Text<{ variant?: 'primary' | 'secondary' }>`
	font-size: ${(props) => props.theme.typography.fontSize.sm}px;
	font-weight: ${(props) => props.theme.typography.fontWeight.semibold};
	font-family: ${(props) => props.theme.typography.fontFamily.primary};
	color: ${(props) =>
		props.variant === 'secondary'
			? props.theme.colors.text.tertiary
			: props.theme.colors.button.primary};
`;

export const Link: React.FC<LinkProps> = ({
	children,
	variant = 'primary',
	...touchableProps
}) => {
	return (
		<TouchableOpacity activeOpacity={0.7} {...touchableProps}>
			<LinkText variant={variant}>{children}</LinkText>
		</TouchableOpacity>
	);
};

