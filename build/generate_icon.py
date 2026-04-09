"""Generate a calorie counter flame icon - red/orange flame on dark grey."""
from PIL import Image, ImageDraw
import os

SIZE = 1024
CENTER = SIZE // 2

img = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
draw = ImageDraw.Draw(img)

# Background: dark grey rounded rectangle
pad = 40
corner_r = 200
draw.rounded_rectangle(
    [pad, pad, SIZE - pad, SIZE - pad],
    radius=corner_r,
    fill=(45, 45, 48),
)

# Main outer flame (red)
cx, cy = CENTER, CENTER + 30
scale = 3.2

pts = [
    (0, -120), (15, -115), (30, -100), (42, -80),
    (55, -55), (65, -30), (72, -5), (75, 15),
    (76, 35), (74, 55), (68, 72), (58, 86),
    (45, 97), (30, 104), (15, 108), (0, 110),
    (-15, 108), (-30, 104), (-45, 97), (-58, 86),
    (-68, 72), (-74, 55), (-76, 35), (-75, 15),
    (-72, -5), (-65, -30), (-55, -55), (-42, -80),
    (-30, -100), (-15, -115),
]
flame_outer = [(cx + p[0] * scale, cy + p[1] * scale) for p in pts]
draw.polygon(flame_outer, fill=(220, 50, 40))  # red

# Inner flame (orange)
inner_scale = 1.8
inner_cy = cy + 60
inner_pts = [
    (0, -100), (12, -95), (24, -82), (35, -62),
    (44, -38), (50, -12), (52, 10), (50, 32),
    (45, 52), (37, 68), (26, 80), (14, 88),
    (0, 92),
    (-14, 88), (-26, 80), (-37, 68), (-45, 52),
    (-50, 32), (-52, 10), (-50, -12), (-44, -38),
    (-35, -62), (-24, -82), (-12, -95),
]
flame_inner = [(cx + p[0] * inner_scale, inner_cy + p[1] * inner_scale) for p in inner_pts]
draw.polygon(flame_inner, fill=(255, 140, 30))  # orange

# Core flame (bright yellow-orange)
core_scale = 0.9
core_cy = cy + 140
core_pts = [
    (0, -90), (10, -82), (20, -65), (28, -42),
    (33, -18), (35, 5), (33, 28), (28, 48),
    (20, 63), (10, 74), (0, 78),
    (-10, 74), (-20, 63), (-28, 48), (-33, 28),
    (-35, 5), (-33, -18), (-28, -42), (-20, -65),
    (-10, -82),
]
flame_core = [(cx + p[0] * core_scale, core_cy + p[1] * core_scale) for p in core_pts]
draw.polygon(flame_core, fill=(255, 210, 80))  # yellow-orange

# Save the 1024x1024 PNG
icon_path = os.path.join(os.path.dirname(__file__), "icon.png")
img.save(icon_path, "PNG")
print(f"Saved {icon_path}")

# Generate .iconset for macOS
iconset_dir = os.path.join(os.path.dirname(__file__), "icon.iconset")
os.makedirs(iconset_dir, exist_ok=True)

sizes = [16, 32, 64, 128, 256, 512, 1024]
for s in sizes:
    resized = img.resize((s, s), Image.LANCZOS)
    resized.save(os.path.join(iconset_dir, f"icon_{s}x{s}.png"), "PNG")
    if s <= 512:
        s2 = s * 2
        resized2 = img.resize((s2, s2), Image.LANCZOS)
        resized2.save(os.path.join(iconset_dir, f"icon_{s}x{s}@2x.png"), "PNG")

print(f"Iconset created at {iconset_dir}")
