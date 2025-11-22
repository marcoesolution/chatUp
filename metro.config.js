// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Garantir que o watch mode está ativo
config.watchFolders = [__dirname];
config.resolver.sourceExts.push('cjs');

// Configurações para melhorar o hot reload
config.server = {
  ...config.server,
  enhanceMiddleware: (middleware) => {
    return middleware;
  },
};

// Configurações de cache mais agressivas para desenvolvimento
if (process.env.NODE_ENV !== 'production') {
  config.cacheStores = [
    // Usar cache em memória para desenvolvimento mais rápido
  ];
}

module.exports = config;

