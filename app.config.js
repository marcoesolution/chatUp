/**
 * Configuração dinâmica do Expo
 * Carrega variáveis de ambiente do arquivo .env
 */

require("dotenv").config();

module.exports = {
	expo: {
		name: "chatUp",
		slug: "chatUp",
		version: "1.0.1",
		orientation: "portrait",
		icon: "./assets/icon.png",
		userInterfaceStyle: "light",
		newArchEnabled: true,
		scheme: "chatup",
		splash: {
			image: "./assets/logoIcon.png",
			resizeMode: "contain",
			backgroundColor: "#ffffff",
		},
		ios: {
			supportsTablet: true,
			bundleIdentifier: "com.chatup.app",
			infoPlist: {
				NSLocationWhenInUseUsageDescription:
					"Este app precisa da sua localização para mostrar usuários próximos a você.",
				NSLocationAlwaysAndWhenInUseUsageDescription:
					"Este app precisa da sua localização para mostrar usuários próximos a você.",
			},
		},
		android: {
			adaptiveIcon: {
				foregroundImage: "./assets/adaptive-icon.png",
				backgroundColor: "#ffffff",
			},
			package: "com.chatup.app",
			versionCode: 2,
			edgeToEdgeEnabled: true,
			predictiveBackGestureEnabled: false,
			permissions: [
				"ACCESS_FINE_LOCATION",
				"ACCESS_COARSE_LOCATION",
				"android.permission.ACCESS_COARSE_LOCATION",
				"android.permission.ACCESS_FINE_LOCATION",
			],
			// Otimizações de build - desabilitadas temporariamente para debug
			enableProguardInReleaseBuilds: false,
			enableShrinkResourcesInReleaseBuilds: false,
		},
		web: {
			favicon: "./assets/favicon.png",
		},
		plugins: [
			"expo-router",
			[
				"expo-location",
				{
					locationAlwaysAndWhenInUsePermission:
						"Este app precisa da sua localização para mostrar usuários próximos a você.",
					locationWhenInUsePermission:
						"Este app precisa da sua localização para mostrar usuários próximos a você.",
				},
			],
			"expo-font",
			"expo-sqlite",
		],
		updates: {
			enabled: true,
			checkAutomatically: "ON_LOAD",
			fallbackToCacheTimeout: 0,
			url: "https://u.expo.dev/d662ef19-e2a8-4cf3-b18a-564a4faa4a3d",
		},
		runtimeVersion: {
			policy: "appVersion",
		},
		extra: {
			router: {},
			eas: {
				projectId: "d662ef19-e2a8-4cf3-b18a-564a4faa4a3d",
			},
			// Injetar variáveis de ambiente do Firebase
			firebase: {
				apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
				authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
				projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
				storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
				messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
				appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
				measurementId: process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID,
			},
		},
	},
};
