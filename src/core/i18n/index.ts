import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import * as Localization from "expo-localization";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ptBR } from "./locales/pt-BR";
import { en } from "./locales/en";
import { es } from "./locales/es";

const LANGUAGE_STORAGE_KEY = "@chatup:language";

// Mapear códigos de idioma do sistema para nossos códigos
const getSystemLanguage = (): string => {
	const locales = Localization.getLocales();
	if (locales && locales.length > 0) {
		const locale = locales[0];
		const languageCode = locale.languageCode || locale.languageTag?.split("-")[0] || "en";

		// Mapear para nossos códigos suportados
		if (languageCode === "pt") return "pt-BR";
		if (languageCode === "es") return "es";
		return "en";
	}
	return "en";
};

// Carregar idioma salvo ou usar o do sistema
export const getSavedLanguage = async (): Promise<string> => {
	try {
		const savedLanguage = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);
		if (savedLanguage && ["pt-BR", "en", "es"].includes(savedLanguage)) {
			return savedLanguage;
		}
		return getSystemLanguage();
	} catch (error) {
		console.error("❌ Erro ao carregar idioma salvo:", error);
		return getSystemLanguage();
	}
};

// Salvar idioma selecionado
export const saveLanguage = async (language: string): Promise<void> => {
	try {
		await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, language);
		await i18n.changeLanguage(language);
	} catch (error) {
		console.error("❌ Erro ao salvar idioma:", error);
		throw error;
	}
};

// Inicializar i18n
export const initI18n = async (): Promise<void> => {
	const savedLanguage = await getSavedLanguage();

	i18n.use(initReactI18next).init({
		compatibilityJSON: "v4",
		resources: {
			"pt-BR": {
				translation: ptBR,
			},
			en: {
				translation: en,
			},
			es: {
				translation: es,
			},
		},
		lng: savedLanguage,
		fallbackLng: "en",
		interpolation: {
			escapeValue: false,
		},
		react: {
			useSuspense: false,
		},
	});
};

export default i18n;

// Exportar hooks
export { useTranslation } from "./hooks/useTranslation";
