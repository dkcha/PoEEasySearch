#!/usr/bin/env python3
"""
Create simple PNG icons for the extension.
This creates basic colored squares as placeholders.
"""

try:
    from PIL import Image, ImageDraw, ImageFont
    PIL_AVAILABLE = True
except ImportError:
    PIL_AVAILABLE = False

import os

def create_simple_png_icon(size, filename):
    """Create a simple PNG icon using PIL if available."""
    if not PIL_AVAILABLE:
        print(f"⚠️  PIL not available, creating placeholder file for {filename}")
        with open(f"icons/{filename}", 'w') as f:
            f.write(f"PNG placeholder for {filename} - {size}x{size}")
        return
    
    # Create image with PoE-themed colors
    img = Image.new('RGBA', (size, size), (26, 24, 16, 255))  # Dark brown background
    draw = ImageDraw.Draw(img)
    
    # Draw a golden border
    border_width = max(1, size // 16)
    draw.rectangle([0, 0, size-1, size-1], outline=(212, 175, 55, 255), width=border_width)
    
    # Draw inner design - simple jewel shape
    center = size // 2
    radius = size // 3
    
    # Draw a diamond/jewel shape
    points = [
        (center, center - radius),      # top
        (center + radius//2, center),   # right
        (center, center + radius),      # bottom
        (center - radius//2, center)    # left
    ]
    draw.polygon(points, fill=(255, 107, 53, 200), outline=(212, 175, 55, 255))
    
    # Add "PoE" text if icon is large enough
    if size >= 32:
        try:
            # Try to use a default font
            font_size = max(8, size // 8)
            font = ImageFont.load_default()
            text = "PoE" if size >= 48 else "P"
            
            # Get text bounding box
            bbox = draw.textbbox((0, 0), text, font=font)
            text_width = bbox[2] - bbox[0]
            text_height = bbox[3] - bbox[1]
            
            # Center the text
            text_x = (size - text_width) // 2
            text_y = (size - text_height) // 2 + radius//3
            
            draw.text((text_x, text_y), text, fill=(212, 175, 55, 255), font=font)
            
        except Exception as e:
            print(f"⚠️  Could not add text to {filename}: {e}")
    
    # Save the image
    img.save(f"icons/{filename}")
    print(f"✅ Created {filename} ({size}x{size})")

def create_all_icons():
    """Create all required icon sizes."""
    
    # Ensure icons directory exists
    os.makedirs('icons', exist_ok=True)
    
    icon_sizes = [
        (16, 'icon16.png'),
        (32, 'icon32.png'),
        (48, 'icon48.png'),
        (128, 'icon128.png')
    ]
    
    if not PIL_AVAILABLE:
        print("📦 PIL (Pillow) not installed. Installing it will create proper PNG icons.")
        print("   Run: pip install Pillow")
        print("   For now, creating text placeholders...")
    
    for size, filename in icon_sizes:
        create_simple_png_icon(size, filename)
    
    print()
    if PIL_AVAILABLE:
        print("✅ All PNG icons created successfully!")
    else:
        print("⚠️  Text placeholders created. Install PIL for proper PNG icons:")
        print("   pip install Pillow")
        print("   Then run this script again")

if __name__ == "__main__":
    create_all_icons()
