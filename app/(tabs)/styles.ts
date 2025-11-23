import styled from "styled-components/native";

// ============================================================================
// Estilos para ConversationsScreen (index.tsx)
// ============================================================================

const ConversationsContainer = styled.View`
	flex: 1;
	background-color: ${(props) => props.theme.colors.background.primary};
`;

const ConversationsContactItem = styled.TouchableOpacity`
	flex-direction: row;
	align-items: center;
	padding: ${(props) => props.theme.spacing.md}px ${(props) => props.theme.spacing.lg}px;
	border-bottom-width: 1px;
	border-bottom-color: ${(props) => props.theme.colors.border.secondary};
	background-color: ${(props) => props.theme.colors.background.secondary};
`;

const ConversationsAvatarContainer = styled.View`
	width: 56px;
	height: 56px;
	border-radius: 28px;
	background-color: ${(props) => props.theme.colors.button.primary};
	justify-content: center;
	align-items: center;
	margin-right: ${(props) => props.theme.spacing.md}px;
`;

const ConversationsAvatarText = styled.Text`
	font-size: 24px;
	font-weight: 600;
	color: ${(props) => props.theme.colors.text.primary};
`;

const ConversationsContactInfo = styled.View`
	flex: 1;
	flex-direction: row;
	justify-content: space-between;
	align-items: center;
`;

const ConversationsContactDetails = styled.View`
	flex: 1;
`;

const ConversationsContactName = styled.Text`
	font-size: 16px;
	font-weight: 600;
	color: ${(props) => props.theme.colors.text.primary};
	margin-bottom: 4px;
`;

const ConversationsLastMessage = styled.Text`
	font-size: 14px;
	color: ${(props) => props.theme.colors.text.secondary};
`;

const ConversationsUnreadBadge = styled.View`
	min-width: 24px;
	height: 24px;
	border-radius: 12px;
	background-color: ${(props) => props.theme.colors.status.info};
	justify-content: center;
	align-items: center;
	padding-horizontal: 8px;
	margin-left: ${(props) => props.theme.spacing.sm}px;
`;

const ConversationsUnreadCount = styled.Text`
	font-size: 12px;
	font-weight: 600;
	color: ${(props) => props.theme.colors.text.primary};
`;

const ConversationsEmptyContainer = styled.View`
	flex: 1;
	justify-content: center;
	align-items: center;
	padding: ${(props) => props.theme.spacing.xl}px;
`;

const ConversationsEmptyText = styled.Text`
	font-size: 16px;
	color: ${(props) => props.theme.colors.text.tertiary};
	text-align: center;
`;

const ConversationsErrorText = styled.Text`
	font-size: 16px;
	color: ${(props) => props.theme.colors.status.error};
	text-align: center;
	margin-bottom: ${(props) => props.theme.spacing.md}px;
`;

const ConversationsErrorContainer = styled.View`
	align-items: center;
	justify-content: center;
	padding: ${(props) => props.theme.spacing.xl}px;
`;

const ConversationsErrorIcon = styled.View`
	margin-bottom: ${(props) => props.theme.spacing.lg}px;
`;

const ConversationsErrorButtonContainer = styled.View`
	margin-top: ${(props) => props.theme.spacing.lg}px;
	width: 100%;
	max-width: 300px;
`;

const ConversationsLoadingContainer = styled.View`
	flex: 1;
	justify-content: center;
	align-items: center;
`;

const ConversationsDistanceText = styled.Text`
	font-size: 12px;
	color: ${(props) => props.theme.colors.text.tertiary};
	margin-top: 2px;
`;

// ============================================================================
// Estilos para ProfileScreen (profile.tsx)
// ============================================================================

const ProfileContainer = styled.ScrollView`
	flex: 1;
	background-color: ${(props) => props.theme.colors.background.primary};
`;

const ProfileCenterContainer = styled.View`
	flex: 1;
	justify-content: center;
	align-items: center;
	min-height: 400px;
`;

const ProfileCardContainer = styled.View`
	margin: ${(props) => props.theme.spacing.md}px;
`;

const ProfileHeader = styled.View`
	align-items: center;
	margin-bottom: ${(props) => props.theme.spacing.lg}px;
`;

const ProfileAvatarContainer = styled.View`
	width: 100px;
	height: 100px;
	border-radius: 50px;
	background-color: ${(props) => props.theme.colors.button.primary};
	justify-content: center;
	align-items: center;
	margin-bottom: ${(props) => props.theme.spacing.md}px;
	overflow: hidden;
`;

const ProfileAvatarImage = styled.Image`
	width: 100%;
	height: 100%;
	resize-mode: cover;
`;

const ProfileAvatarText = styled.Text`
	font-size: 40px;
	font-weight: bold;
	color: ${(props) => props.theme.colors.text.primary};
`;

const ProfileName = styled.Text`
	font-size: 24px;
	font-weight: bold;
	color: ${(props) => props.theme.colors.text.primary};
	margin-bottom: 4px;
	text-align: center;
`;

const ProfileEmail = styled.Text`
	font-size: 16px;
	color: ${(props) => props.theme.colors.text.secondary};
	text-align: center;
`;

const ProfileSection = styled.View`
	margin-bottom: ${(props) => props.theme.spacing.lg}px;
	padding-bottom: ${(props) => props.theme.spacing.md}px;
	border-bottom-width: 1px;
	border-bottom-color: ${(props) => props.theme.colors.border.secondary};
`;

const ProfileSectionTitle = styled.Text`
	font-size: 12px;
	font-weight: 600;
	color: ${(props) => props.theme.colors.text.tertiary};
	margin-bottom: 8px;
	text-transform: uppercase;
	letter-spacing: 0.5px;
`;

const ProfileSectionContent = styled.Text`
	font-size: 16px;
	color: ${(props) => props.theme.colors.text.primary};
	line-height: 24px;
`;

const ProfileEmptyContent = styled.Text`
	font-size: 14px;
	color: ${(props) => props.theme.colors.text.tertiary};
	font-style: italic;
`;

const ProfileErrorText = styled.Text`
	font-size: 16px;
	color: ${(props) => props.theme.colors.text.error};
	text-align: center;
`;

const ProfileEmptyText = styled.Text`
	font-size: 16px;
	color: ${(props) => props.theme.colors.text.tertiary};
	text-align: center;
`;

const ProfileStatusBadge = styled.View`
	padding: 4px 12px;
	border-radius: 12px;
	background-color: ${(props) => props.theme.colors.status.success};
	margin-top: 8px;
	align-self: flex-start;
`;

const ProfileStatusText = styled.Text`
	font-size: 12px;
	font-weight: 600;
	color: ${(props) => props.theme.colors.text.primary};
`;

// ============================================================================
// Exports - ConversationsScreen
// ============================================================================
export {
	ConversationsContainer as Container,
	ConversationsContactItem as ContactItem,
	ConversationsAvatarContainer as AvatarContainer,
	ConversationsAvatarText as AvatarText,
	ConversationsContactInfo as ContactInfo,
	ConversationsContactDetails as ContactDetails,
	ConversationsContactName as ContactName,
	ConversationsLastMessage as LastMessage,
	ConversationsUnreadBadge as UnreadBadge,
	ConversationsUnreadCount as UnreadCount,
	ConversationsEmptyContainer as EmptyContainer,
	ConversationsEmptyText as EmptyText,
	ConversationsErrorText as ErrorText,
	ConversationsErrorContainer as ErrorContainer,
	ConversationsErrorIcon as ErrorIcon,
	ConversationsErrorButtonContainer as ErrorButtonContainer,
	ConversationsLoadingContainer as LoadingContainer,
	ConversationsDistanceText as DistanceText,
};

// ============================================================================
// Exports - ProfileScreen
// ============================================================================
export {
	ProfileContainer,
	ProfileCenterContainer,
	ProfileCardContainer,
	ProfileHeader,
	ProfileAvatarContainer,
	ProfileAvatarImage,
	ProfileAvatarText,
	ProfileName,
	ProfileEmail,
	ProfileSection,
	ProfileSectionTitle,
	ProfileSectionContent,
	ProfileEmptyContent,
	ProfileErrorText,
	ProfileEmptyText,
	ProfileStatusBadge,
	ProfileStatusText,
};
