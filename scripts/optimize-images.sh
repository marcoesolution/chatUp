#!/bin/bash

# Script para otimizar imagens do projeto ChatUp
# Requer: imagemagick ou sharp-cli (npm install -g sharp-cli)

echo "🖼️  Otimizando Imagens do ChatUp"
echo "=================================="
echo ""

# Verificar se estamos no diretório correto
if [ ! -d "assets" ]; then
    echo "❌ Erro: Diretório 'assets' não encontrado"
    exit 1
fi

# Cores para output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Criar diretório de backup
BACKUP_DIR="assets/backup-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$BACKUP_DIR"

echo "📁 Criando backup em: $BACKUP_DIR"
echo ""

# Função para otimizar PNG usando imagemagick
optimize_png_imagemagick() {
    local file=$1
    local output=$2
    
    if command -v convert &> /dev/null; then
        convert "$file" -strip -quality 85 -resize "2048x2048>" "$output" 2>/dev/null
        return $?
    fi
    return 1
}

# Função para otimizar PNG usando sharp-cli
optimize_png_sharp() {
    local file=$1
    local output=$2
    
    if command -v sharp &> /dev/null; then
        sharp -i "$file" -o "$output" --resize 2048 --png 2>/dev/null
        return $?
    fi
    return 1
}

# Função para otimizar imagem
optimize_image() {
    local file=$1
    local filename=$(basename "$file")
    local extension="${filename##*.}"
    local name="${filename%.*}"
    
    # Fazer backup
    cp "$file" "$BACKUP_DIR/$filename"
    
    # Verificar tamanho original
    original_size=$(stat -f%z "$file" 2>/dev/null || stat -c%s "$file" 2>/dev/null)
    original_size_mb=$(echo "scale=2; $original_size / 1024 / 1024" | bc)
    
    echo "   📄 Processando: $filename (${original_size_mb}MB)"
    
    # Tentar otimizar
    temp_file="${file}.tmp"
    optimized=false
    
    case "$extension" in
        png|PNG)
            if optimize_png_sharp "$file" "$temp_file"; then
                optimized=true
            elif optimize_png_imagemagick "$file" "$temp_file"; then
                optimized=true
            else
                echo -e "   ${YELLOW}⚠️  Nenhuma ferramenta de otimização encontrada para PNG${NC}"
                echo "   💡 Instale: npm install -g sharp-cli"
                echo "   💡 Ou: brew install imagemagick (macOS) / apt-get install imagemagick (Linux)"
            fi
            ;;
        jpg|jpeg|JPG|JPEG)
            if command -v sharp &> /dev/null; then
                sharp -i "$file" -o "$temp_file" --resize 2048 --jpeg 2>/dev/null && optimized=true
            elif command -v convert &> /dev/null; then
                convert "$file" -strip -quality 85 -resize "2048x2048>" "$temp_file" 2>/dev/null && optimized=true
            else
                echo -e "   ${YELLOW}⚠️  Nenhuma ferramenta de otimização encontrada para JPEG${NC}"
            fi
            ;;
        *)
            echo -e "   ${YELLOW}⚠️  Formato não suportado: $extension${NC}"
            ;;
    esac
    
    if [ "$optimized" = true ]; then
        new_size=$(stat -f%z "$temp_file" 2>/dev/null || stat -c%s "$temp_file" 2>/dev/null)
        new_size_mb=$(echo "scale=2; $new_size / 1024 / 1024" | bc)
        reduction=$(echo "scale=1; (($original_size - $new_size) * 100) / $original_size" | bc)
        
        if [ "$(echo "$new_size < $original_size" | bc)" -eq 1 ]; then
            mv "$temp_file" "$file"
            echo -e "   ${GREEN}✅ Otimizado: ${original_size_mb}MB → ${new_size_mb}MB (${reduction}% redução)${NC}"
        else
            rm "$temp_file"
            echo -e "   ${YELLOW}⚠️  Imagem já otimizada ou otimização aumentou o tamanho${NC}"
        fi
    fi
}

# Processar todas as imagens
total_files=0
optimized_files=0

for file in assets/*.{png,jpg,jpeg,PNG,JPG,JPEG} 2>/dev/null; do
    if [ -f "$file" ]; then
        total_files=$((total_files + 1))
        optimize_image "$file"
        if [ $? -eq 0 ]; then
            optimized_files=$((optimized_files + 1))
        fi
        echo ""
    fi
done

# Resumo
echo "=================================="
echo "📊 Resumo da Otimização:"
echo "   Total de arquivos: $total_files"
echo "   Arquivos otimizados: $optimized_files"
echo "   Backup salvo em: $BACKUP_DIR"
echo ""

# Verificar tamanho total
if [ -d "assets" ]; then
    total_size=$(du -sh assets 2>/dev/null | cut -f1)
    echo "📁 Tamanho total do diretório assets: $total_size"
    echo ""
fi

# Recomendações
echo "💡 Recomendações:"
echo "   1. Teste as imagens otimizadas no app"
echo "   2. Se algo não funcionar, restaure do backup:"
echo "      cp $BACKUP_DIR/* assets/"
echo "   3. Para otimização avançada, use ferramentas online:"
echo "      - TinyPNG: https://tinypng.com"
echo "      - Squoosh: https://squoosh.app"
echo ""

echo "✅ Otimização concluída!"

