import 'styled-components/native';
import { Theme } from '@/core/theme';

declare module 'styled-components/native' {
	export interface DefaultTheme extends Theme {}
}

