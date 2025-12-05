import React, { createContext, useContext, useState, useCallback, ReactNode, useEffect } from 'react';
import { Modal, ActivityIndicator, Platform } from 'react-native';
import styled from 'styled-components/native';
import { setCryptoLoadingContext } from '@/core/security/cryptoLoading';

interface CryptoLoadingContextType {
	showLoading: (message?: string) => void;
	hideLoading: () => void;
	isLoading: boolean;
}

const CryptoLoadingContext = createContext<CryptoLoadingContextType | undefined>(undefined);

const Overlay = styled.View`
	flex: 1;
	background-color: rgba(0, 0, 0, 0.7);
	justify-content: center;
	align-items: center;
`;

const LoadingCard = styled.View`
	background-color: ${(props) => props.theme.colors.background.card};
	border-radius: ${(props) => props.theme.borderRadius.lg}px;
	padding: ${(props) => props.theme.spacing.xl}px;
	min-width: 280px;
	align-items: center;
	${Platform.OS === 'ios' ? 'shadow-color: #000; shadow-offset: 0px 4px; shadow-opacity: 0.3; shadow-radius: 8px;' : 'elevation: 8;'}
`;

const LoadingTitle = styled.Text`
	font-size: 18px;
	font-weight: 600;
	color: ${(props) => props.theme.colors.text.primary};
	margin-top: ${(props) => props.theme.spacing.md}px;
	margin-bottom: ${(props) => props.theme.spacing.sm}px;
	text-align: center;
`;

const LoadingMessage = styled.Text`
	font-size: 14px;
	color: ${(props) => props.theme.colors.text.secondary};
	text-align: center;
	line-height: 20px;
`;

interface CryptoLoadingProviderProps {
	children: ReactNode;
}

export function CryptoLoadingProvider({ children }: CryptoLoadingProviderProps) {
	const [isLoading, setIsLoading] = useState(false);
	const [message, setMessage] = useState<string>('Processando...');

	const showLoading = useCallback((customMessage?: string) => {
		setMessage(customMessage || 'Processando operação segura...');
		setIsLoading(true);
	}, []);

	const hideLoading = useCallback(() => {
		setIsLoading(false);
	}, []);

	// Registrar contexto globalmente para uso fora de componentes React
	useEffect(() => {
		setCryptoLoadingContext({ showLoading, hideLoading, isLoading });
	}, [showLoading, hideLoading, isLoading]);

	return (
		<CryptoLoadingContext.Provider value={{ showLoading, hideLoading, isLoading }}>
			{children}
			<Modal
				visible={isLoading}
				transparent
				animationType="fade"
				statusBarTranslucent
			>
				<Overlay>
					<LoadingCard>
						<ActivityIndicator size="large" color="#007AFF" />
						<LoadingTitle>🔐 Segurança</LoadingTitle>
						<LoadingMessage>{message}</LoadingMessage>
					</LoadingCard>
				</Overlay>
			</Modal>
		</CryptoLoadingContext.Provider>
	);
}

export function useCryptoLoading() {
	const context = useContext(CryptoLoadingContext);
	if (!context) {
		throw new Error('useCryptoLoading must be used within CryptoLoadingProvider');
	}
	return context;
}
