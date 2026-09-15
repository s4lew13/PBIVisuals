from PIL import Image, ImageDraw, ImageFont
import math

W, H = 700, 520
img = Image.new("RGB", (W, H), (250, 249, 248))
draw = ImageDraw.Draw(img)

cx, cy = 260, 260
outer_r = 190
inner_r = outer_r * 0.15
ring_gap = 2
base_color = (91, 79, 233)

data = [
    ("2026-01", [100, 62, 41, 29, 21]),
    ("2026-02", [100, 58, 37, 25, 18]),
    ("2026-03", [100, 65, 46, 33, 24]),
    ("2026-04", [100, 70, 51, 38, 29]),
    ("2026-05", [100, 68, 48, 35, 27]),
]

cohort_count = len(data)
period_count = 5
band = (outer_r - inner_r) / cohort_count

def lerp_color(t, base):
    bg = (255, 255, 255)
    r = int(bg[0] + (base[0]-bg[0])*t)
    g = int(bg[1] + (base[1]-bg[1])*t)
    b = int(bg[2] + (base[2]-bg[2])*t)
    return (r, g, b)

for cohort_idx, (name, periods) in enumerate(data):
    max_val = max(periods)
    r_in = inner_r + cohort_idx * band + ring_gap
    r_out = inner_r + (cohort_idx + 1) * band - ring_gap
    for period_idx, val in enumerate(periods):
        t = val / max_val
        color = lerp_color(0.15 + t*0.85, base_color)
        a0 = period_idx * (360 / period_count) - 90
        a1 = (period_idx + 1) * (360 / period_count) - 90 - 2.5
        bbox = [cx - r_out, cy - r_out, cx + r_out, cy + r_out]
        draw.pieslice(bbox, a0, a1, fill=color)

# punch inner hole ring by ring boundaries (draw background circle rings as separators)
for cohort_idx in range(cohort_count + 1):
    r = inner_r + cohort_idx * band
    draw.ellipse([cx-r, cy-r, cx+r, cy+r], outline=(250,249,248), width=3)

# center hole
draw.ellipse([cx-inner_r, cy-inner_r, cx+inner_r, cy+inner_r], fill=(250,249,248))

try:
    font_big = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 30)
    font_small = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 13)
    font_legend = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 14)
    font_title = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 20)
except Exception:
    font_big = font_small = font_legend = font_title = ImageFont.load_default()

avg = sum(sum(p) for _, p in data) / sum(len(p) for _, p in data)
txt = f"{avg:.0f}%"
w = draw.textlength(txt, font=font_big)
draw.text((cx - w/2, cy - 22), txt, fill=(32,31,30), font=font_big)
txt2 = "śr. retencja"
w2 = draw.textlength(txt2, font=font_small)
draw.text((cx - w2/2, cy + 10), txt2, fill=(96,94,92), font=font_small)

# legend
lx, ly = 480, 90
for i, (name, _) in enumerate(data):
    t = 1 - i / cohort_count
    color = lerp_color(0.15 + t*0.85, base_color)
    draw.rounded_rectangle([lx, ly + i*26, lx+14, ly+14+i*26], radius=3, fill=color)
    draw.text((lx+22, ly+i*26), name, fill=(32,31,30), font=font_legend)

draw.text((30, 20), "Cohort Pulse Radial — podgląd koncepcji", fill=(32,31,30), font=font_title)
draw.text((30, 46), "Każdy pierścień = kohorta. Każdy segment = okres. Jaśniejszy = niższa retencja.", fill=(96,94,92), font=font_small)

img.save("/home/user/workspace/pbi-custom-visual/preview/preview_render.png")
print("saved")
