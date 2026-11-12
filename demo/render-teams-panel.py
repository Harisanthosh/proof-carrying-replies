#!/usr/bin/env python3
"""Render demo/04-teams.png in the visual language of demo/03-replay.png.

The certificate hash is computed from the same standup text the Teams demo posts,
so the panel stays honest if you change STANDUP_TEXT in src/teams-demo.ts.
"""
from __future__ import annotations

import hashlib
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont, ImageFilter

ROOT = Path(__file__).resolve().parents[1]
OUT = Path(__file__).resolve().parent / "04-teams.png"

W, H = 2400, 1480
BG = (247, 246, 242)
TEAL = (20, 110, 100)
TITLE = (22, 22, 22)
SUB = (90, 90, 88)
MUTED = (120, 120, 116)
LINE = (220, 218, 212)
CARD_BG = (255, 255, 255)
CARD_BORDER = (228, 226, 220)
GREEN = (22, 122, 74)
GREEN_BG = (232, 245, 237)
GREEN_BD = (190, 220, 200)
RED = (181, 36, 36)
RED_BG = (255, 247, 247)
RED_BD = (235, 205, 205)
TEAL_BG = (236, 245, 243)
TEAL_BD = (190, 214, 208)
INK = (35, 35, 33)

INTER = "/usr/share/fonts/truetype/sand-box/google/Inter/Inter-VariableFont_opsz,wght.ttf"
MONO_MED = "/usr/share/fonts/truetype/sand-box/google/IBM Plex Mono/IBMPlexMono-Medium.ttf"

STANDUP_TEXT = (
    "Standup: TLC reached 48 states on the real pipeline; all six invariants hold."
)


def inter(size: int, weight: int = 400) -> ImageFont.FreeTypeFont:
    font = ImageFont.truetype(INTER, size=size)
    opsz = float(min(32, max(14, size if size < 32 else 32)))
    font.set_variation_by_axes([opsz, float(weight)])
    return font


def mono(size: int) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(MONO_MED, size=size)


def wrap(text: str, font: ImageFont.ImageFont, max_w: float) -> list[str]:
    words = text.split()
    lines: list[str] = []
    cur = ""
    for word in words:
        trial = (cur + " " + word).strip()
        if font.getlength(trial) <= max_w:
            cur = trial
        else:
            if cur:
                lines.append(cur)
            cur = word
    if cur:
        lines.append(cur)
    return lines


def main() -> None:
    text_hash = hashlib.sha256(STANDUP_TEXT.encode("utf-8")).hexdigest()
    short = text_hash[:12]

    im = Image.new("RGB", (W, H), BG)
    draw = ImageDraw.Draw(im)
    mx = 88
    y = 72

    draw.text((mx, y), "THE SAME GATE, IN A TEAM CHANNEL", font=inter(22, 650), fill=TEAL)
    y += 62
    draw.text((mx, y), "A Teams update, under the proof", font=inter(78, 700), fill=TITLE)
    y += 108

    sub = (
        "Privileged speech is not only a public post. The same invariants decide a "
        "message that goes out under someone’s name in a team channel."
    )
    sf = inter(32, 430)
    for line in wrap(sub, sf, W - 2 * mx - 40):
        draw.text((mx, y), line, font=sf, fill=SUB)
        y += 44
    y += 36

    gap = 28
    card_w = (W - 2 * mx - 2 * gap) // 3
    card_top = y
    card_h = 920
    card_bottom = card_top + card_h

    cards = [
        dict(
            kicker="BEAT 1  ·  CERTIFICATE",
            title="Would post",
            result="WOULD POST",
            result_fill=GREEN,
            result_bg=GREEN_BG,
            result_bd=GREEN_BD,
            accent=GREEN,
            body=[
                ("Thread", "General · 8 min · 3 replies"),
                ("Draft", STANDUP_TEXT),
                ("Source", "formal/charts/safe/report.md"),
                ("Certificate", f"pcr-v1  ·  {short}…  ·  bound"),
                ("Confirm", "this exact text, yes"),
            ],
            note="A valid certificate and a confirm. GrantAutonomy is not involved.",
        ),
        dict(
            kicker="BEAT 2  ·  AUTONOMY",
            title="Refused",
            result="REFUSED",
            result_fill=RED,
            result_bg=RED_BG,
            result_bd=RED_BD,
            accent=RED,
            body=[
                ("Thread", "the same standup, the same certificate"),
                ("Permission", "GrantAutonomy — a standing “just post it”"),
                ("Confirm", "none"),
                ("Publish", "requires an explicit confirm of this exact text"),
                ("Phase", "stayed awaiting  ·  autonomy=true"),
            ],
            note="The broken one-line variant posts in seven steps: the bot posts on blanket autonomy.",
        ),
        dict(
            kicker="BEAT 3  ·  BLOCKED",
            title="Silence",
            result="SILENCE",
            result_fill=TEAL,
            result_bg=TEAL_BG,
            result_bd=TEAL_BD,
            accent=TEAL,
            body=[
                ("Thread", "General · 8 min · 3 replies"),
                ("Draft", "The model is already used in production by a dozen teams."),
                ("Source", "none"),
                ("Certificate", "not issued"),
                ("Facts gate", "failed — the claim is unsourced"),
            ],
            note="The bot stays silent. That is how it flags that it is blocked. A quiet run is a success.",
        ),
    ]

    base = im.convert("RGBA")
    shadow = Image.new("RGBA", im.size, (0, 0, 0, 0))
    sd = ImageDraw.Draw(shadow)
    for i in range(3):
        x0 = mx + i * (card_w + gap)
        y0 = card_top
        x1 = x0 + card_w
        y1 = y0 + card_h
        sd.rounded_rectangle((x0 + 2, y0 + 6, x1 + 2, y1 + 8), radius=28, fill=(25, 25, 22, 28))
    shadow = shadow.filter(ImageFilter.GaussianBlur(12))
    im = Image.alpha_composite(base, shadow).convert("RGB")
    draw = ImageDraw.Draw(im)

    kf, tf, lf = inter(18, 650), inter(44, 700), inter(20, 550)
    vf, mf, nf, rf = inter(24, 430), mono(22), inter(22, 430), inter(22, 700)

    for i, card in enumerate(cards):
        x0 = mx + i * (card_w + gap)
        y0 = card_top
        x1 = x0 + card_w
        y1 = y0 + card_h
        draw.rounded_rectangle((x0, y0, x1, y1), radius=28, fill=CARD_BG, outline=CARD_BORDER, width=2)
        draw.rounded_rectangle((x0, y0, x1, y0 + 14), radius=28, fill=card["accent"])
        draw.rectangle((x0, y0 + 8, x1, y0 + 16), fill=card["accent"])

        pad = 36
        cy = y0 + 40
        draw.text((x0 + pad, cy), card["kicker"], font=kf, fill=TEAL)
        cy += 42
        draw.text((x0 + pad, cy), card["title"], font=tf, fill=TITLE)
        cy += 78

        inner_w = card_w - 2 * pad
        for label, value in card["body"]:
            draw.text((x0 + pad, cy), label.upper(), font=lf, fill=MUTED)
            cy += 30
            font = mf if label in ("Certificate", "Phase", "Publish", "Source") else vf
            for line in wrap(value, font, inner_w):
                draw.text((x0 + pad, cy), line, font=font, fill=INK)
                cy += 34
            cy += 16

        pill_text = card["result"]
        tw = rf.getlength(pill_text)
        pill_h, pill_w = 48, tw + 36
        note_lines = wrap(card["note"], nf, inner_w)
        note_h = len(note_lines) * 30
        ny = y1 - 36 - note_h
        py = ny - 28 - pill_h
        draw.rounded_rectangle(
            (x0 + pad, py, x0 + pad + pill_w, py + pill_h),
            radius=24,
            fill=card["result_bg"],
            outline=card["result_bd"],
            width=1,
        )
        draw.text((x0 + pad + 18, py + 12), pill_text, font=rf, fill=card["result_fill"])
        for j, line in enumerate(note_lines):
            draw.text((x0 + pad, ny + j * 30), line, font=nf, fill=SUB)

    fy = card_bottom + 48
    draw.line((mx, fy, W - mx, fy), fill=LINE, width=1)
    fy += 24
    ff = inter(20, 450)
    draw.text((mx, fy), "4 / 4", font=ff, fill=MUTED)
    repo = "proof-carrying-replies"
    rw = ff.getlength(repo)
    draw.text(((W - rw) / 2, fy), repo, font=ff, fill=MUTED)
    date = "12 November 2026"
    dw = ff.getlength(date)
    draw.text((W - mx - dw, fy), date, font=ff, fill=MUTED)

    im.save(OUT, "PNG", optimize=True)
    print(f"wrote {OUT} {im.size}")


if __name__ == "__main__":
    main()
