const { withAppBuildGradle, withGradleProperties } = require("@expo/config-plugins");

/**
 * Plugin para otimizar o build Android com ProGuard, minificação e outras otimizações
 */
const withAndroidOptimization = (config) => {
	// Configurar Gradle Properties
	config = withGradleProperties(config, (config) => {
		const gradleProperties = config.modResults;

		// Habilitar R8 full mode (mais agressivo que ProGuard)
		gradleProperties.push({
			type: "property",
			key: "android.enableR8.fullMode",
			value: "true",
		});

		// Habilitar ProGuard em builds de release
		gradleProperties.push({
			type: "property",
			key: "android.enableProguardInReleaseBuilds",
			value: "true",
		});

		// Comprimir bibliotecas nativas
		gradleProperties.push({
			type: "property",
			key: "android.bundle.enableUncompressedNativeLibs",
			value: "false",
		});

		return config;
	});

	// Modificar o build.gradle do app
	config = withAppBuildGradle(config, (config) => {
		let buildGradle = config.modResults.contents;

		// Adicionar minificação e shrinkResources no buildType release
		if (buildGradle.includes("buildTypes")) {
			// Se já existe buildTypes, adicionar configurações no release
			if (buildGradle.includes("release {")) {
				// Verificar se já tem minifyEnabled
				if (!buildGradle.includes("minifyEnabled")) {
					buildGradle = buildGradle.replace(
						/(release\s*\{)/,
						"$1\n            minifyEnabled true\n            shrinkResources true\n            proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'"
					);
				}
			} else {
				// Adicionar release block se não existir
				buildGradle = buildGradle.replace(
					/(buildTypes\s*\{)/,
					"$1\n        release {\n            minifyEnabled true\n            shrinkResources true\n            proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'\n        }"
				);
			}
		} else {
			// Adicionar buildTypes completo se não existir
			buildGradle = buildGradle.replace(
				/(android\s*\{)/,
				"$1\n    buildTypes {\n        release {\n            minifyEnabled true\n            shrinkResources true\n            proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'\n        }\n    }"
			);
		}

		config.modResults.contents = buildGradle;
		return config;
	});

	return config;
};

module.exports = withAndroidOptimization;
