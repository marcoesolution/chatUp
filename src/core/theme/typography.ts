/**
 * Tipografia do ChatUp
 */

export const typography = {
	fontFamily: {
		primary: "System", // Fonte primária (será substituída por fonte customizada se necessário)
		secondary: "System", // Fonte secundária
	},
	fontSize: {
		xs: 12,
		sm: 14,
		base: 16,
		lg: 18,
		xl: 20,
		"2xl": 24,
		"3xl": 32,
		"4xl": 40,
	},
	fontWeight: {
		normal: "400" as const,
		medium: "500" as const,
		semibold: "600" as const,
		bold: "700" as const,
		extrabold: "800" as const,
	},
	lineHeight: {
		tight: 1.2,
		normal: 1.5,
		relaxed: 1.75,
	},
} as const;

export type Typography = typeof typography;
