#!/bin/bash

# Script para capturar logs do app ChatUp de forma mais eficiente

PACKAGE="com.chatup.app"

echo "📱 Logs do ChatUp"
echo "=================="
echo ""
echo "Opções:"
echo "1. Ver logs em tempo real (recomendado)"
echo "2. Ver logs salvos"
echo "3. Limpar logs e começar novo"
echo ""
read -p "Escolha uma opção (1-3): " option

case $option in
    1)
        echo ""
        echo "📋 Capturando logs em tempo real..."
        echo "💡 Abra o app e interaja com ele"
        echo "💡 Pressione Ctrl+C para parar"
        echo ""
        adb logcat -c
        adb logcat | grep -iE "chatup|ReactNative|expo|location|Permission|Firebase|useLocation" --line-buffered --color=always
        ;;
    2)
        echo ""
        echo "📋 Últimos logs salvos:"
        echo ""
        adb logcat -d | grep -iE "chatup|ReactNative|expo|location|Permission|Firebase|useLocation" | tail -100
        ;;
    3)
        echo ""
        echo "🧹 Limpando logs..."
        adb logcat -c
        echo "✅ Logs limpos!"
        echo ""
        echo "📋 Agora capturando novos logs..."
        echo "💡 Abra o app e interaja com ele"
        echo "💡 Pressione Ctrl+C para parar"
        echo ""
        adb logcat | grep -iE "chatup|ReactNative|expo|location|Permission|Firebase|useLocation" --line-buffered --color=always
        ;;
    *)
        echo "❌ Opção inválida"
        exit 1
        ;;
esac


