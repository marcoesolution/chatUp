import { QueryClient } from '@tanstack/react-query';
import { onlineManager } from '@tanstack/react-query';
import NetInfo from '@react-native-community/netinfo';
import { AppState, AppStateStatus } from 'react-native';
import { focusManager } from '@tanstack/react-query';
import { axiosInstance } from '@/api/axiosClient';

// Configuração do onlineManager para React Native
onlineManager.setEventListener((setOnline) => {
  return NetInfo.addEventListener((state) => {
    setOnline(!!state.isConnected);
  });
});

// Configuração do focusManager para React Native
function onAppStateChange(status: AppStateStatus) {
  if (status === 'active') {
    focusManager.setFocused(true);
  } else {
    focusManager.setFocused(false);
  }
}

// Listener para mudanças no estado do app
const subscription = AppState.addEventListener('change', onAppStateChange);

// Cleanup function (opcional, mas recomendado)
// subscription.remove();

// Criação da instância do QueryClient
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Query function padrão usando Axios
      queryFn: async ({ queryKey, signal }) => {
        const url = Array.isArray(queryKey) ? queryKey[0] : queryKey;
        const { data } = await axiosInstance.get(String(url), { signal });
        return data;
      },
      // Configurações padrão
      staleTime: 1000 * 60 * 5, // 5 minutos
      gcTime: 1000 * 60 * 10, // 10 minutos (anteriormente cacheTime)
      retry: 2,
      refetchOnWindowFocus: false, // Desabilitado pois usamos focusManager customizado
      refetchOnReconnect: true,
    },
    mutations: {
      retry: 1,
    },
  },
});

