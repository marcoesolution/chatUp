import React from "react";
import { ThemeProvider as StyledThemeProvider } from "styled-components/native";
import { darkTheme } from "./index";

interface ThemeProviderProps {
	children: React.ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
	return <StyledThemeProvider theme={darkTheme}>{children}</StyledThemeProvider>;
};
