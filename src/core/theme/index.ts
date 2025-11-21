/**
 * Tema do ChatUp
 * Sistema de temas usando styled-components
 */

import { colors } from "./colors";
import { typography } from "./typography";

export const darkTheme = {
	colors,
	typography,
	spacing: {
		xs: 4,
		sm: 8,
		md: 16,
		lg: 24,
		xl: 32,
		"2xl": 48,
	},
	borderRadius: {
		sm: 8,
		md: 12,
		lg: 16,
		xl: 24,
		full: 9999,
	},
	shadow: {
		sm: {
			shadowColor: "#000",
			shadowOffset: { width: 0, height: 1 },
			shadowOpacity: 0.1,
			shadowRadius: 2,
			elevation: 2,
		},
		md: {
			shadowColor: "#000",
			shadowOffset: { width: 0, height: 2 },
			shadowOpacity: 0.15,
			shadowRadius: 4,
			elevation: 4,
		},
		lg: {
			shadowColor: "#000",
			shadowOffset: { width: 0, height: 4 },
			shadowOpacity: 0.2,
			shadowRadius: 8,
			elevation: 8,
		},
	},
} as const;

export type Theme = typeof darkTheme;

// Declaração de tipos para styled-components
declare module "styled-components/native" {
	export interface DefaultTheme extends Theme {}
}
