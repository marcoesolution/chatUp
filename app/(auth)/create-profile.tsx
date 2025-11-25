import React from "react";
import { StatusBar, Alert } from "react-native";
import { useRouter } from "expo-router";
import styled from "styled-components/native";
import { CreateProfileForm } from "@/modules/auth/components";
import { useAuth } from "@/modules/auth";
import type { CreateProfileData } from "@/modules/auth/types";

const Container = styled.View`
	flex: 1;
	background-color: #ffffff;
`;

const Header = styled.View`
	padding: 24px;
	padding-top: 60px;
	background-color: #667eea;
	align-items: center;
`;

const LogoContainer = styled.View`
	width: 80px;
	height: 80px;
	border-radius: 40px;
	background-color: #ffffff;
	align-items: center;
	justify-content: center;
	margin-bottom: 16px;
	shadow-color: #000;
	shadow-offset: 0px 4px;
	shadow-opacity: 0.2;
	shadow-radius: 8px;
	elevation: 8;
`;

const LogoText = styled.Text`
	font-size: 32px;
	font-weight: 800;
	color: #667eea;
`;

const Slogan = styled.Text`
	font-size: 14px;
	color: #ffffff;
	font-weight: 600;
	opacity: 0.9;
	letter-spacing: 0.5px;
`;

export default function CreateProfileScreen() {
	const router = useRouter();
	const { firebaseUser, userProfile, createProfile, isLoading, error, refreshProfile } = useAuth();

	// Garantir que temos os dados do usuário
	const userEmail = firebaseUser?.email || userProfile?.email || "";
	const userName = firebaseUser?.displayName || userProfile?.displayName || "";
	const userPhoneNumber = userProfile?.phoneNumber || "";
	const userBio = userProfile?.bio || "";

	// Atualizar perfil quando a tela for montada para garantir que temos os dados mais recentes
	React.useEffect(() => {
		if (firebaseUser && refreshProfile) {
			refreshProfile();
		}
	}, [firebaseUser]);

	const handleCreateProfile = async (data: CreateProfileData) => {
		if (!firebaseUser?.uid) {
			Alert.alert("Erro", "Usuário não autenticado");
			return;
		}

		try {
			await createProfile(firebaseUser.uid, data);
			// Após criar perfil, redirecionar para a tela principal
			router.replace("/(tabs)");
		} catch (err: any) {
			Alert.alert("Erro", err.message || "Não foi possível criar o perfil. Tente novamente.");
		}
	};

	return (
		<Container>
			<StatusBar barStyle="light-content" />
			<Header>
				<LogoContainer>
					<LogoText>💬</LogoText>
				</LogoContainer>
				<Slogan>Complete seu perfil</Slogan>
			</Header>
			<CreateProfileForm
				onSubmit={handleCreateProfile}
				isLoading={isLoading}
				error={error}
				initialEmail={userEmail}
				initialName={userName}
				initialPhoneNumber={userPhoneNumber}
				initialBio={userBio}
			/>
		</Container>
	);
}
