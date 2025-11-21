import { ActivityIndicator, ScrollView } from 'react-native';
import styled, { useTheme } from 'styled-components/native';
import { useProfile } from '@/modules/profile/hooks/useProfile';
import { Card } from '@/shared/components';

const Container = styled.ScrollView`
	flex: 1;
	background-color: ${(props) => props.theme.colors.background.primary};
`;

const CenterContainer = styled.View`
	flex: 1;
	justify-content: center;
	align-items: center;
	min-height: 400px;
`;

const CardContainer = styled.View`
	margin: ${(props) => props.theme.spacing.md}px;
`;

const Header = styled.View`
	align-items: center;
	margin-bottom: ${(props) => props.theme.spacing.lg}px;
`;

const Avatar = styled.View`
	width: 80px;
	height: 80px;
	border-radius: 40px;
	background-color: ${(props) => props.theme.colors.button.primary};
	justify-content: center;
	align-items: center;
	margin-bottom: ${(props) => props.theme.spacing.md}px;
`;

const AvatarText = styled.Text`
	font-size: 32px;
	font-weight: bold;
	color: ${(props) => props.theme.colors.text.primary};
`;

const Name = styled.Text`
	font-size: 24px;
	font-weight: bold;
	color: ${(props) => props.theme.colors.text.primary};
	margin-bottom: 4px;
`;

const Email = styled.Text`
	font-size: 16px;
	color: ${(props) => props.theme.colors.text.secondary};
`;

const Section = styled.View`
	margin-bottom: ${(props) => props.theme.spacing.lg}px;
`;

const SectionTitle = styled.Text`
	font-size: 14px;
	font-weight: 600;
	color: ${(props) => props.theme.colors.text.tertiary};
	margin-bottom: 4px;
	text-transform: uppercase;
`;

const SectionContent = styled.Text`
	font-size: 16px;
	color: ${(props) => props.theme.colors.text.primary};
`;

const ErrorText = styled.Text`
	font-size: 16px;
	color: ${(props) => props.theme.colors.text.error};
`;

const EmptyText = styled.Text`
	font-size: 16px;
	color: ${(props) => props.theme.colors.text.tertiary};
`;

export default function ProfileScreen() {
	const { profile, isLoading, error } = useProfile();
	const theme = useTheme();

	if (isLoading) {
		return (
			<CenterContainer>
				<ActivityIndicator size="large" color={theme.colors.button.primary} />
			</CenterContainer>
		);
	}

	if (error) {
		return (
			<CenterContainer>
				<ErrorText>Erro ao carregar perfil</ErrorText>
			</CenterContainer>
		);
	}

	if (!profile) {
		return (
			<CenterContainer>
				<EmptyText>Perfil não encontrado</EmptyText>
			</CenterContainer>
		);
	}

	return (
		<Container>
			<CardContainer>
				<Card
					style={{
						backgroundColor: theme.colors.background.card,
					}}
				>
					<Header>
						<Avatar>
							<AvatarText>{profile.name.charAt(0).toUpperCase()}</AvatarText>
						</Avatar>
						<Name>{profile.name}</Name>
						<Email>{profile.email}</Email>
					</Header>

					{profile.bio && (
						<Section>
							<SectionTitle>Bio</SectionTitle>
							<SectionContent>{profile.bio}</SectionContent>
						</Section>
					)}

					{profile.phone && (
						<Section>
							<SectionTitle>Telefone</SectionTitle>
							<SectionContent>{profile.phone}</SectionContent>
						</Section>
					)}

					{profile.location && (
						<Section>
							<SectionTitle>Localização</SectionTitle>
							<SectionContent>{profile.location}</SectionContent>
						</Section>
					)}

					<Section>
						<SectionTitle>Membro desde</SectionTitle>
						<SectionContent>
							{new Date(profile.createdAt).toLocaleDateString('pt-BR')}
						</SectionContent>
					</Section>
				</Card>
			</CardContainer>
		</Container>
	);
}

