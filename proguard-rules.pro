# Add project specific ProGuard rules here.
# You can control the set of applied configuration files using the
# proguardFiles setting in build.gradle.

# ============================================
# React Native
# ============================================
-keep class com.facebook.react.** { *; }
-keep class com.facebook.hermes.** { *; }
-keep class com.facebook.jni.** { *; }
-dontwarn com.facebook.react.**

# Keep React Native JavaScript interface
-keep @interface com.facebook.proguard.annotations.DoNotStrip
-keep @interface com.facebook.proguard.annotations.KeepGettersAndSetters
-keep @com.facebook.proguard.annotations.DoNotStrip class *
-keep @com.facebook.proguard.annotations.KeepGettersAndSetters class *
-keepclassmembers class * {
    @com.facebook.proguard.annotations.DoNotStrip *;
}

# ============================================
# Expo
# ============================================
-keep class expo.modules.** { *; }
-keep class org.unimodules.** { *; }
-dontwarn expo.modules.**
-dontwarn org.unimodules.**

# Expo Router
-keep class expo.router.** { *; }

# Expo Location
-keep class expo.modules.location.** { *; }

# Expo Auth Session
-keep class expo.modules.authsession.** { *; }

# Expo Crypto
-keep class expo.modules.crypto.** { *; }

# Expo Image
-keep class expo.modules.image.** { *; }

# ============================================
# Firebase - CRÍTICO PARA EVITAR CRASHES
# ============================================
-keep class com.google.firebase.** { *; }
-keep class com.google.android.gms.** { *; }
-dontwarn com.google.firebase.**
-dontwarn com.google.android.gms.**

# Firebase Auth
-keep class com.google.firebase.auth.** { *; }
-keep class com.google.android.gms.auth.** { *; }
-keep class com.google.android.gms.common.** { *; }

# Firebase Firestore
-keep class com.google.firebase.firestore.** { *; }
-keep class com.google.firestore.** { *; }
-keep class com.google.firebase.firestore.local.** { *; }

# Firebase Storage
-keep class com.google.firebase.storage.** { *; }

# Firebase Analytics
-keep class com.google.firebase.analytics.** { *; }

# ============================================
# Outras Dependências
# ============================================
# AsyncStorage
-keep class com.reactnativecommunity.asyncstorage.** { *; }

# NetInfo
-keep class com.reactnativecommunity.netinfo.** { *; }

# Styled Components
-keep class com.styledcomponents.** { *; }

# React Query
-keep class com.tanstack.query.** { *; }

# ============================================
# Criptografia e Segurança - CRÍTICO
# ============================================
# Módulo nativo de criptografia
-keep class com.chatup.app.crypto.** { *; }
-keepclassmembers class com.chatup.app.crypto.** { *; }
-keep class com.chatup.app.crypto.CryptoModule { *; }
-keep class com.chatup.app.crypto.CryptoPackage { *; }

# Kotlin Coroutines (usado pelo CryptoModule)
-keep class kotlinx.coroutines.** { *; }
-keep class kotlin.coroutines.** { *; }
-dontwarn kotlinx.coroutines.**

# Keychain (react-native-keychain)
-keep class com.oblador.keychain.** { *; }
-keep class com.facebook.react.bridge.** { *; }

# SecureStore (expo-secure-store)
-keep class expo.modules.securestore.** { *; }

# MMKV (react-native-mmkv) - usado pelo Signal Protocol
-keep class com.tencent.mmkv.** { *; }
-keep class com.reactnativemmkv.** { *; }

# Bibliotecas de criptografia JavaScript (via reflection)
# Manter todas as classes que podem ser usadas via reflection
-keep class * implements java.security.Key { *; }
-keep class javax.crypto.** { *; }
-keep class java.security.** { *; }

# Proteger métodos nativos de criptografia
-keepclassmembers class com.chatup.app.crypto.CryptoModule {
    public *;
    @com.facebook.react.bridge.ReactMethod *;
}

# ============================================
# Métodos Nativos e Interfaces
# ============================================
# Keep native methods
-keepclasseswithmembernames class * {
    native <methods>;
}

# Keep JavaScript interface
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

# ============================================
# Serialização
# ============================================
# Keep Parcelable implementations
-keep class * implements android.os.Parcelable {
    public static final android.os.Parcelable$Creator *;
}

# Keep Serializable classes
-keepclassmembers class * implements java.io.Serializable {
    static final long serialVersionUID;
    private static final java.io.ObjectStreamField[] serialPersistentFields;
    private void writeObject(java.io.ObjectOutputStream);
    private void readObject(java.io.ObjectInputStream);
    java.lang.Object writeReplace();
    java.lang.Object readResolve();
}

# ============================================
# Atributos e Anotações
# ============================================
-keepattributes *Annotation*
-keepattributes Signature
-keepattributes Exceptions
-keepattributes InnerClasses
-keepattributes EnclosingMethod

# Keep line numbers for stack traces
-keepattributes SourceFile,LineNumberTable

# ============================================
# Recursos
# ============================================
# Keep classes R (recursos)
-keepclassmembers class **.R$* {
    public static <fields>;
}

# ============================================
# Erros e Exceções
# ============================================
# Manter classes de erro para stack traces úteis
-keep class * extends java.lang.Exception
-keep class * extends java.lang.Error

# ============================================
# Otimizações
# ============================================
# Remove logging em release (opcional - pode ajudar a reduzir tamanho)
-assumenosideeffects class android.util.Log {
    public static *** d(...);
    public static *** v(...);
    public static *** i(...);
}
-keepattributes SourceFile,LineNumberTable
-renamesourcefileattribute SourceFile

