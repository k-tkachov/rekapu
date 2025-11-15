#!/bin/bash

# Image optimization script for Rekapu website
# Converts PNG screenshots to optimized WebP format
# Requires: cwebp (install via: brew install webp)

QUALITY=85
PUBLIC_DIR="public"

# Check if cwebp is installed
if ! command -v cwebp &> /dev/null; then
    echo "❌ cwebp not found. Install with: brew install webp"
    exit 1
fi

echo "🖼️  Converting screenshots to WebP (quality: $QUALITY)..."
echo ""

# Function to convert and show stats
convert_image() {
    local input=$1
    local output=$2
    
    if [ ! -f "$input" ]; then
        echo "⚠️  Skipping $input (not found)"
        return
    fi
    
    local input_size=$(du -h "$input" | cut -f1)
    cwebp -q $QUALITY "$input" -o "$output" 2>/dev/null
    local output_size=$(du -h "$output" | cut -f1)
    local reduction=$(echo "scale=1; (1 - $(stat -f%z "$output") / $(stat -f%z "$input")) * 100" | bc)
    
    echo "✅ $(basename "$input") → $(basename "$output")"
    echo "   $input_size → $output_size (${reduction}% smaller)"
}

# Convert language-agnostic step3 (unlocked site - no text)
convert_image "$PUBLIC_DIR/step3.png" "$PUBLIC_DIR/step3.webp"

echo ""
echo "📋 Next steps:"
echo "1. Take localized screenshots for hero, step1, and step2 in each language"
echo "2. Place them in public/en/, public/ru/, public/uk/ as PNG files"
echo "3. Run this script again with --localized flag"
echo ""
echo "For localized conversion, use:"
echo "  ./optimize-images.sh --localized"

# Convert localized images if --localized flag is provided
if [ "$1" = "--localized" ]; then
    echo ""
    echo "🌍 Converting localized screenshots..."
    echo ""
    
    for lang in en ru uk; do
        echo "Language: $lang"
        convert_image "$PUBLIC_DIR/$lang/hero_screenshot.png" "$PUBLIC_DIR/$lang/hero_screenshot.webp"
        convert_image "$PUBLIC_DIR/$lang/step1.png" "$PUBLIC_DIR/$lang/step1.webp"
        convert_image "$PUBLIC_DIR/$lang/step2.png" "$PUBLIC_DIR/$lang/step2.webp"
        echo ""
    done
    
    echo "✨ Done! All images converted to WebP"
    echo ""
    echo "📊 Total savings:"
    du -sh "$PUBLIC_DIR"/*.png "$PUBLIC_DIR"/*/*.png 2>/dev/null | awk '{sum+=$1} END {print "   PNG total: " sum}'
    du -sh "$PUBLIC_DIR"/*.webp "$PUBLIC_DIR"/*/*.webp 2>/dev/null | awk '{sum+=$1} END {print "   WebP total: " sum}'
fi

