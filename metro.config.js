// Learn more https://docs.expo.dev/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Excluir arquivos desnecessários do bundle
config.resolver.blockList = [
	// Excluir scripts
	/scripts\/.*\.sh$/,
	/scripts\/.*\.md$/,
	// Excluir arquivos de build
	/build-.*\.apk$/,
	/.*\.apk$/,
	/.*\.aab$/,
	// Excluir arquivos de documentação
	/README\.md$/,
	/docs\/.*/,
];

// Otimizações adicionais
config.transformer = {
	...config.transformer,
	// Minificar código
	minifierConfig: {
		keep_classnames: false,
		keep_fnames: false,
		mangle: {
			keep_classnames: false,
			keep_fnames: false,
		},
	},
};

module.exports = config;

