/**
 * Paleta de cores do ChatUp
 * Cores pastéis, suaves, sóbrias e elegantes
 */

export const colors = {
	// Backgrounds
	background: {
		primary: "#0f1a1f", // Azul escuro profundo e elegante
		secondary: "#1a2a35", // Azul escuro médio
		tertiary: "#243a47", // Azul escuro claro
		card: "#1e2d38", // Fundo de cards
		input: "#253642", // Fundo de inputs
	},

	// Textos
	text: {
		primary: "#ffffff", // Branco puro
		secondary: "#b8c5d1", // Azul acinzentado claro
		tertiary: "#8a9ba8", // Azul acinzentado médio
		disabled: "#5a6b78", // Azul acinzentado escuro
		error: "#ff6b6b", // Vermelho pastel suave
	},

	// Botões
	button: {
		primary: "#5b9bd5", // Azul pastel elegante
		primaryHover: "#4a8bc4",
		secondary: "#7fb3d3", // Azul pastel claro
		secondaryHover: "#6ea2c2",
		save: "#6bcf7f", // Verde pastel suave
		saveHover: "#5abe6f",
		delete: "#e88a8a", // Vermelho pastel suave
		deleteHover: "#d77a7a",
		warning: "#f4a261", // Laranja pastel suave
		warningHover: "#e39251",
		default: "#5b9bd5", // Azul padrão
		defaultHover: "#4a8bc4",
		disabled: "#3a4a55", // Cinza desabilitado
		text: "#ffffff", // Texto dos botões
		textDisabled: "#5a6b78",
	},

	// Bordas e divisores
	border: {
		primary: "#2a3a45", // Borda principal
		secondary: "#1e2d38", // Borda secundária
		error: "#ff6b6b", // Borda de erro
		focus: "#5b9bd5", // Borda de foco
	},

	// Ícones
	icon: {
		primary: "#b8c5d1", // Ícones principais
		secondary: "#8a9ba8", // Ícones secundários
		accent: "#5b9bd5", // Ícones de destaque
		disabled: "#5a6b78", // Ícones desabilitados
	},

	// Status e feedback
	status: {
		success: "#6bcf7f", // Verde sucesso
		error: "#ff6b6b", // Vermelho erro
		warning: "#f4a261", // Laranja aviso
		info: "#5b9bd5", // Azul informação
	},

	// Overlay e modais
	overlay: {
		backdrop: "rgba(15, 26, 31, 0.8)", // Overlay escuro
		modal: "#1a2a35", // Fundo de modal
	},
} as const;

export type Colors = typeof colors;
