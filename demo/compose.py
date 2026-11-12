#!/usr/bin/env python3
"""Compose the shareable demo image from the proved and broken statecharts."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageFilter

ROOT = Path("/workspace/proof-carrying-replies")
OUT = ROOT / "demo" / "proof-carrying-replies.png"

INTER = "/usr/share/fonts/truetype/sand-box/google/Inter/Inter-VariableFont_opsz,wght.ttf"
PLEX_MONO = "/usr/share/fonts/truetype/sand-box/google/IBM Plex Mono/IBMPlexMono-Regular.ttf"
PLEX_MONO_B = "/usr/share/fonts/truetype/sand-box/google/IBM Plex Mono/IBMPlexMono-Bold.ttf"
PLEX = "/usr/share/fonts/truetype/sand-box/google/IBM Plex Sans/IBMPlexSans-Regular.ttf"
# fall back through known paths
import os
def find_plex():
    base = "/usr/share/fonts/truetype/sand-box/google"
    for name in ["IBM Plex Sans/IBMPlexSans-Regular.ttf",
                 "IBM Plex Sans/IBMPlexSans-Medium.ttf"]:
        p = os.path.join(base, name)
        if os.path.exists(p):
            return p
    return INTER

PLEX = find_plex()

PAPER = (247, 246, 242, 255)
INK = (22, 22, 22, 255)
MUTED = (90, 90, 88, 255)
LINE = (210, 208, 202, 255)
BLUE = (22, 128, 243, 255)
ORANGE = (232, 115, 12, 255)
RED = (205, 40, 52, 255)
TEAL = (20, 110, 100, 255)
WHITE = (255, 255, 255, 255)
CARD = (255, 255, 255, 255)
OK_BG = (223, 242, 232, 255)
BAD_BG = (255, 236, 238, 255)
OK_FG = (20, 110, 70, 255)
BAD_FG = (180, 32, 42, 255)


def font(path, size, weight=400):
    try:
        f = ImageFont.truetype(path, size=size)
        # variable font weight via set_variation
        try:
            f.set_variation_by_axes([14, weight])  # opsz, wght for Inter
        except Exception:
            try:
                f.set_variation_by_name("Regular" if weight < 500 else "Bold")
            except Exception:
                pass
        return f
    except Exception:
        return ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", size=size)


def trim(im, pad=16, bg=(250, 250, 250)):
    px = im.convert("RGB")
    w, h = px.size

    def white(c):
        return c[0] >= bg[0] and c[1] >= bg[1] and c[2] >= bg[2]

    cols = []
    for x in range(w):
        if any(not white(px.getpixel((x, y))) for y in range(0, h, 2)):
            cols.append(x)
    rows = []
    for y in range(h):
        if any(not white(px.getpixel((x, y))) for x in range(0, w, 2)):
            rows.append(y)
    if not cols or not rows:
        return im
    l, r, t, b = cols[0], cols[-1], rows[0], rows[-1]
    l = max(0, l - pad)
    t = max(0, t - pad)
    r = min(w - 1, r + pad)
    b = min(h - 1, b + pad)
    return im.crop((l, t, r + 1, b + 1))


def rounded(im, radius=24):
    im = im.convert("RGBA")
    mask = Image.new("L", im.size, 0)
    d = ImageDraw.Draw(mask)
    d.rounded_rectangle((0, 0, im.size[0] - 1, im.size[1] - 1), radius, fill=255)
    out = Image.new("RGBA", im.size, (0, 0, 0, 0))
    out.paste(im, (0, 0))
    out.putalpha(mask)
    return out


def shadow_card(inner, radius=24, pad=0, shadow=18):
    w, h = inner.size
    canvas = Image.new("RGBA", (w + shadow * 2, h + shadow * 2), (0, 0, 0, 0))
    sh = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
    sd = ImageDraw.Draw(sh)
    sd.rounded_rectangle(
        (shadow, shadow + 4, shadow + w, shadow + h + 4),
        radius,
        fill=(20, 20, 20, 40),
    )
    sh = sh.filter(ImageFilter.GaussianBlur(10))
    canvas.alpha_composite(sh)
    canvas.alpha_composite(rounded(inner, radius), (shadow, shadow))
    return canvas


def wrap(draw, text, fnt, max_w):
    words = text.split()
    lines, cur = [], ""
    for w in words:
        trial = (cur + " " + w).strip()
        if draw.textlength(trial, font=fnt) <= max_w:
            cur = trial
        else:
            if cur:
                lines.append(cur)
            cur = w
    if cur:
        lines.append(cur)
    return lines


def main():
    safe = trim(Image.open(ROOT / "formal/charts/safe/chart.png"))
    broken = trim(Image.open(ROOT / "formal/charts/broken/chart.png"))

    W = 2400
    margin = 80
    content_w = W - 2 * margin

    # scale charts to content width
    def scale_to_w(im, width):
        r = width / im.size[0]
        return im.resize((width, int(im.size[1] * r)), Image.Resampling.LANCZOS)

    # We'll compute height as we go on a tall canvas, then crop.
    H = 5200
    img = Image.new("RGBA", (W, H), PAPER)
    d = ImageDraw.Draw(img)

    f_kicker = font(INTER, 22, 500)
    f_title = font(INTER, 78, 650)
    f_dek = font(INTER, 34, 400)
    f_h2 = font(INTER, 36, 620)
    f_body = font(INTER, 28, 400)
    f_small = font(INTER, 22, 400)
    f_mono = ImageFont.truetype(PLEX_MONO, 22)
    f_mono_b = ImageFont.truetype(PLEX_MONO_B, 22)
    f_badge = font(INTER, 20, 600)
    f_caption = font(INTER, 24, 500)

    y = 72
    # kicker
    d.text((margin, y), "A FORMALLY VERIFIED GROK BOT PIPELINE", font=f_kicker, fill=TEAL)
    y += 50
    d.text((margin, y), "Proof-carrying replies", font=f_title, fill=INK)
    y += 108
    dek = (
        "A public reply cannot be offered without a machine-checked certificate. "
        "The certificate is bound to this exact text. Standing autonomy is not a confirm."
    )
    for line in wrap(d, dek, f_dek, content_w):
        d.text((margin, y), line, font=f_dek, fill=MUTED)
        y += 46
    y += 28

    # stats row
    stats = [
        ("48", "states explored"),
        ("6", "invariants hold"),
        ("7", "steps to the old-policy bug"),
        ("5 of 7", "real replies now rejected"),
    ]
    gap = 24
    sw = (content_w - gap * 3) // 4
    sh = 130
    for i, (num, label) in enumerate(stats):
        x = margin + i * (sw + gap)
        box = Image.new("RGBA", (sw, sh), CARD)
        bd = ImageDraw.Draw(box)
        bd.rounded_rectangle((0, 0, sw - 1, sh - 1), 16, fill=WHITE, outline=LINE, width=2)
        bd.text((24, 18), num, font=f_h2, fill=INK)
        bd.text((24, 74), label, font=f_small, fill=MUTED)
        img.alpha_composite(box, (x, y))
    y += sh + 56

    # --- proved chart ---
    d.text((margin, y), "The proved pipeline", font=f_h2, fill=INK)
    y += 48
    d.text(
        (margin, y),
        "The only path to Posted is: you confirm this exact text, then post the confirmed text.",
        font=f_body,
        fill=MUTED,
    )
    y += 52
    s = scale_to_w(safe.convert("RGBA"), content_w)
    # white card background
    card = Image.new("RGBA", (s.size[0] + 48, s.size[1] + 48), WHITE)
    card.paste(s, (24, 24))
    sc = shadow_card(card)
    img.alpha_composite(sc, (margin - 18, y))
    y += sc.size[1] + 20
    d.text(
        (margin, y),
        "All six invariants hold, plus NoDeadlock. 48 states, 94 steps. TLC found no way to post without a confirm.",
        font=f_small,
        fill=MUTED,
    )
    y += 70

    # --- broken chart ---
    d.text((margin, y), "The old policy, caught", font=f_h2, fill=INK)
    y += 48
    d.text(
        (margin, y),
        "One added action — post when autonomy is granted, even with no confirm — breaks two invariants.",
        font=f_body,
        fill=MUTED,
    )
    y += 52
    b = scale_to_w(broken.convert("RGBA"), content_w)
    card = Image.new("RGBA", (b.size[0] + 48, b.size[1] + 48), WHITE)
    card.paste(b, (24, 24))
    sc = shadow_card(card)
    img.alpha_composite(sc, (margin - 18, y))
    y += sc.size[1] + 20
    d.text(
        (margin, y),
        "Orange is the break. Blue borders are the shortest path to it. The new arrow reads: “the bot posts on blanket autonomy.”",
        font=f_small,
        fill=MUTED,
    )
    y += 70

    # --- 7-step path ---
    d.text((margin, y), "Shortest counterexample — 7 steps", font=f_h2, fill=INK)
    y += 56
    steps = [
        ("0", "Idle", False),
        ("1", "you grant blanket autonomy", False),
        ("2", "a fresh thread appears", False),
        ("3", "freshness passes", False),
        ("4", "every claim is sourced", False),
        ("5", "issue a certificate for this text", False),
        ("6", "offer the draft, do not post", False),
        ("7", "the bot posts on blanket autonomy", True),
    ]
    box_h = 28 + len(steps) * 52
    box = Image.new("RGBA", (content_w, box_h), WHITE)
    bd = ImageDraw.Draw(box)
    bd.rounded_rectangle((0, 0, content_w - 1, box_h - 1), 16, fill=WHITE, outline=LINE, width=2)
    yy = 20
    for n, label, bad in steps:
        col = RED if bad else INK
        mf = f_mono_b if bad else f_mono
        bd.text((28, yy), n, font=mf, fill=ORANGE if bad else BLUE)
        bd.text((80, yy), label, font=mf, fill=col)
        yy += 52
    sc = shadow_card(box, radius=16, shadow=14)
    img.alpha_composite(sc, (margin - 14, y))
    y += sc.size[1] + 56

    # --- replay table ---
    d.text((margin, y), "Replay of real posts  ·  11–12 November 2026", font=f_h2, fill=INK)
    y += 48
    d.text(
        (margin, y),
        "These are this account’s actual offered or posted replies, run through the proved policy.",
        font=f_body,
        fill=MUTED,
    )
    y += 52

    rows = [
        ("Case", "Then", "Age / burial", "Now", "Result at the time", True),
        ("@AravSrinivas, 11 Nov", "offered", "97 min, 121 replies", "REJECT  freshness", "56 impressions, 0 likes", False),
        ("@DrJimFan, 11 Nov", "offered", "~26 hours", "REJECT  freshness", "7 impressions", False),
        ("@robbyant_brain, 11 Nov", "offered", "~47 hours", "REJECT  freshness", "6 impressions, 1 like", False),
        ("@normandipalo, 11 Nov", "offered", "~27 hours, 40 replies", "REJECT  freshness", "7 impressions", False),
        ("@TheAhmadOsman, 12 Nov", "offered", "40 min, 11 replies", "REJECT  freshness", "10 minutes past the gate", False),
        ("@aakashgupta, 12 Nov", "offered", "10 min, 1 reply", "WOULD POST", "claim sourced from Dexerto", False),
        ("@theo, 12 Nov", "offered", "30 min, 21 replies", "WOULD POST", "opinion only, on the boundary", False),
    ]
    col_w = [520, 200, 420, 420, content_w - 520 - 200 - 420 - 420]
    row_h = 58
    table_h = row_h * len(rows) + 8
    box = Image.new("RGBA", (content_w, table_h), WHITE)
    bd = ImageDraw.Draw(box)
    bd.rounded_rectangle((0, 0, content_w - 1, table_h - 1), 16, fill=WHITE, outline=LINE, width=2)
    yy = 0
    for i, row in enumerate(rows):
        header = row[-1]
        vals = row[:-1]
        if header:
            bd.rectangle((1, 1, content_w - 2, row_h), fill=(245, 244, 240, 255))
        elif "WOULD POST" in vals[3]:
            bd.rectangle((1, yy, content_w - 2, yy + row_h), fill=(240, 250, 244, 255))
        elif "REJECT" in vals[3]:
            bd.rectangle((1, yy, content_w - 2, yy + row_h), fill=(255, 247, 247, 255))
        if i > 0:
            bd.line((16, yy, content_w - 16, yy), fill=LINE, width=1)
        x = 24
        for j, (val, cw) in enumerate(zip(vals, col_w)):
            f = f_badge if header else (f_mono_b if j == 3 else f_small)
            if header:
                col = MUTED
            elif j == 3 and "REJECT" in val:
                col = BAD_FG
            elif j == 3 and "WOULD" in val:
                col = OK_FG
            else:
                col = INK
            bd.text((x, yy + 16), val, font=f, fill=col)
            x += cw
        yy += row_h
    sc = shadow_card(box, radius=16, shadow=14)
    img.alpha_composite(sc, (margin - 14, y))
    y += sc.size[1] + 36
    d.text(
        (margin, y),
        "5 of 7 replies actually offered would be rejected. The two that pass still need a confirm of this exact text before they can be posted.",
        font=f_body,
        fill=INK,
    )
    y += 80

    # footer
    d.line((margin, y, W - margin, y), fill=LINE, width=1)
    y += 28
    d.text(
        (margin, y),
        "proof-carrying-replies   ·   TLA+ / TLC   ·   invariants are never weakened   ·   12 November 2026",
        font=f_mono,
        fill=MUTED,
    )
    y += 80

    final = img.crop((0, 0, W, y)).convert("RGB")
    # slight downsample? keep 2400 wide for sharpness
    OUT.parent.mkdir(parents=True, exist_ok=True)
    final.save(OUT, "PNG", optimize=True)
    print("wrote", OUT, final.size)


if __name__ == "__main__":
    main()
