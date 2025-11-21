import axios, { AxiosInstance, AxiosRequestConfig, AxiosError } from 'axios';

// Configuração base do Axios
const baseURL = process.env.EXPO_PUBLIC_API_URL || 'https://api.example.com';

// Criação da instância do Axios
export const axiosInstance: AxiosInstance = axios.create({
  baseURL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor para adicionar token de autenticação (se necessário)
axiosInstance.interceptors.request.use(
  (config) => {
    // Aqui você pode adicionar lógica para incluir tokens de autenticação
    // Exemplo: const token = await AsyncStorage.getItem('token');
    // if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  }
);

// Interceptor para tratamento de erros
axiosInstance.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    // Tratamento centralizado de erros
    if (error.response) {
      // Erro com resposta do servidor
      switch (error.response.status) {
        case 401:
          // Não autorizado - redirecionar para login
          break;
        case 403:
          // Proibido
          break;
        case 404:
          // Não encontrado
          break;
        case 500:
          // Erro interno do servidor
          break;
        default:
          break;
      }
    } else if (error.request) {
      // Erro de rede
      console.error('Network error:', error.request);
    } else {
      // Erro na configuração da requisição
      console.error('Error:', error.message);
    }
    return Promise.reject(error);
  }
);

export default axiosInstance;

