from PIL import Image, ImageDraw, ImageFont, ImageFilter
import os

WIDTH = 1024
HEIGHT = 500

ORANGE = (245, 124, 0)
ORANGE_DARK = (230, 81, 0)
WHITE = (255, 255, 255)
BLACK = (10, 10, 10)
CHARCOAL = (24, 24, 24)


def get_font(size, bold=False):
    candidates = (
        [
            "C:/Windows/Fonts/segoeuib.ttf",
            "C:/Windows/Fonts/arialbd.ttf",
            "C:/Windows/Fonts/calibrib.ttf",
        ]
        if bold
        else [
            "C:/Windows/Fonts/segoeui.ttf",
            "C:/Windows/Fonts/arial.ttf",
            "C:/Windows/Fonts/calibri.ttf",
        ]
    )
    for path in candidates:
        try:
            return ImageFont.truetype(path, size)
        except OSError:
            continue
    return ImageFont.load_default()


def text_size(draw_ctx, text, font):
    left, top, right, bottom = draw_ctx.textbbox((0, 0), text, font=font)
    return right - left, bottom - top


def draw_pill(draw_ctx, x, y, label, font):
    width, _ = text_size(draw_ctx, label, font)
    pill_width = width + 30
    draw_ctx.rounded_rectangle(
        [x, y, x + pill_width, y + 34],
        radius=17,
        fill=(255, 255, 255, 14),
        outline=ORANGE + (95,),
        width=1,
    )
    draw_ctx.text((x + 15, y + 8), label, font=font, fill=WHITE + (235,))
    return pill_width


img = Image.new("RGBA", (WIDTH, HEIGHT), BLACK + (255,))
draw = ImageDraw.Draw(img)

for y in range(HEIGHT):
    ratio = y / HEIGHT
    red = int(BLACK[0] * (1 - ratio) + CHARCOAL[0] * ratio)
    green = int(BLACK[1] * (1 - ratio) + CHARCOAL[1] * ratio)
    blue = int(BLACK[2] * (1 - ratio) + CHARCOAL[2] * ratio)
    draw.line([(0, y), (WIDTH, y)], fill=(red, green, blue, 255))

glow = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
glow_draw = ImageDraw.Draw(glow)
glow_draw.ellipse([560, -120, 1060, 300], fill=ORANGE + (34,))
glow_draw.ellipse([-140, 260, 220, 620], fill=ORANGE_DARK + (22,))
glow = glow.filter(ImageFilter.GaussianBlur(90))
img = Image.alpha_composite(img, glow)

texture = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
texture_draw = ImageDraw.Draw(texture)
for x in range(-240, WIDTH + 200, 52):
    texture_draw.line([(x, 0), (x + 250, HEIGHT)], fill=(255, 255, 255, 8), width=1)
img = Image.alpha_composite(img, texture)

left_panel = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
panel_draw = ImageDraw.Draw(left_panel)
panel_draw.rounded_rectangle(
    [60, 60, 320, 420],
    radius=32,
    fill=(255, 255, 255, 16),
    outline=ORANGE + (65,),
    width=2,
)
panel_draw.rounded_rectangle([84, 84, 296, 396], radius=24, fill=(0, 0, 0, 120))
panel_draw.rounded_rectangle([110, 116, 240, 124], radius=4, fill=ORANGE + (255,))
panel_draw.rounded_rectangle([110, 136, 214, 142], radius=3, fill=WHITE + (120,))

panel_draw.rounded_rectangle([128, 176, 204, 286], radius=10, fill=WHITE + (240,))
panel_draw.rounded_rectangle([214, 214, 266, 286], radius=8, fill=WHITE + (220,))
for row in range(4):
    for col in range(2):
        panel_draw.rectangle([144 + col * 24, 192 + row * 22, 158 + col * 24, 206 + row * 22], fill=ORANGE_DARK + (230,))
for row in range(2):
    panel_draw.rectangle([230, 228 + row * 24, 244, 242 + row * 24], fill=ORANGE_DARK + (220,))

panel_draw.ellipse([254, 156, 280, 182], fill=ORANGE + (245,))
panel_draw.rectangle([266, 144, 268, 194], fill=WHITE + (220,))
panel_draw.rectangle([242, 168, 292, 170], fill=WHITE + (220,))
panel_draw.rounded_rectangle([110, 318, 206, 324], radius=3, fill=WHITE + (100,))
panel_draw.rounded_rectangle([110, 336, 270, 342], radius=3, fill=ORANGE + (180,))
img = Image.alpha_composite(img, left_panel)

draw = ImageDraw.Draw(img)

small_font = get_font(22, bold=True)
title_font = get_font(72, bold=True)
subtitle_font = get_font(20)
pill_font = get_font(14, bold=True)
stat_value_font = get_font(24, bold=True)
stat_label_font = get_font(13)
footer_font = get_font(16, bold=True)

content_x = 380
title_y = 92

draw.rounded_rectangle([content_x, 74, content_x + 68, 80], radius=3, fill=ORANGE + (255,))
draw.rounded_rectangle([content_x + 78, 74, content_x + 110, 80], radius=3, fill=WHITE + (110,))

draw.text((content_x, title_y), "GESTAO PREDIAL E", font=small_font, fill=WHITE + (210,))
draw.text((content_x, title_y + 30), "Limpeza", font=title_font, fill=ORANGE + (255,))
draw.text((content_x, 214), "Controle operacional com padrao, agilidade e visibilidade.", font=subtitle_font, fill=WHITE + (210,))
draw.text((content_x, 244), "Feito para equipes, condominios e rotina predial.", font=subtitle_font, fill=WHITE + (170,))

row_1 = ["Checklists", "Escalas", "OS"]
row_2 = ["Relatorios", "Vistorias", "QRCode"]

x_cursor = content_x
for label in row_1:
    x_cursor += draw_pill(draw, x_cursor, 308, label, pill_font) + 12

x_cursor = content_x
for label in row_2:
    x_cursor += draw_pill(draw, x_cursor, 352, label, pill_font) + 12

stat_cards = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
stat_draw = ImageDraw.Draw(stat_cards)
stat_data = [
    (828, 92, "24/7", "Operacao"),
    (828, 190, "360", "Gestao"),
    (828, 288, "SLA", "Controle"),
]
for x, y, value, label in stat_data:
    stat_draw.rounded_rectangle(
        [x, y, x + 128, y + 74],
        radius=20,
        fill=(255, 255, 255, 14),
        outline=ORANGE + (78,),
        width=1,
    )
    stat_draw.text((x + 22, y + 14), value, font=stat_value_font, fill=ORANGE + (255,))
    stat_draw.text((x + 22, y + 44), label, font=stat_label_font, fill=WHITE + (190,))
img = Image.alpha_composite(img, stat_cards)

footer = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
footer_draw = ImageDraw.Draw(footer)
footer_draw.rectangle([0, 446, WIDTH, HEIGHT], fill=(0, 0, 0, 120))
footer_draw.line([(0, 446), (WIDTH, 446)], fill=ORANGE + (55,), width=1)
img = Image.alpha_composite(img, footer)

draw = ImageDraw.Draw(img)
footer_text = "gestaoelimpeza.com.br"
footer_width, _ = text_size(draw, footer_text, footer_font)
draw.text(((WIDTH - footer_width) // 2, 462), footer_text, font=footer_font, fill=ORANGE + (230,))

output_path = os.path.expanduser("~/OneDrive/Área de Trabalho/banner-gestaoelimpeza-1024x500.png")
img.convert("RGB").save(output_path, "PNG", quality=95)
print(f"Banner saved to: {output_path}")
print(f"Size: {(WIDTH, HEIGHT)}")
