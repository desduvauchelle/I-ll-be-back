from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageEnhance


SOURCE = Path("/Users/denisduvauchelle/.codex/generated_images/019f9aa4-5b0c-7533-b500-85a0040c83e1/exec-cd1173b2-854a-47d9-83df-e81500b135b7.png")
OUTPUT = Path("assets/ill-be-back-rules-poster.png")
IMPACT = "/System/Library/Fonts/Supplemental/Impact.ttf"
SANS_BOLD = "/System/Library/Fonts/Supplemental/Arial Bold.ttf"
SANS = "/System/Library/Fonts/Supplemental/Arial.ttf"


def font(path: str, size: int):
    return ImageFont.truetype(path, size)


def wrapped(draw, text, xy, face, fill, width, spacing=5):
    words = text.split()
    lines, line = [], ""
    for word in words:
        trial = f"{line} {word}".strip()
        if draw.textlength(trial, font=face) <= width:
            line = trial
        else:
            if line:
                lines.append(line)
            line = word
    if line:
        lines.append(line)
    x, y = xy
    line_h = face.size + spacing
    for item in lines:
        draw.text((x, y), item, font=face, fill=fill)
        y += line_h
    return y


def section(draw, x, y, number, title, body, width):
    draw.rounded_rectangle((x, y, x + 38, y + 38), radius=3, fill=(238, 238, 238, 255))
    nfont = font(IMPACT, 24)
    nt = str(number)
    nb = draw.textbbox((0, 0), nt, font=nfont)
    draw.text((x + 19 - (nb[2] - nb[0]) / 2, y + 5), nt, font=nfont, fill=(8, 8, 8, 255))
    draw.text((x + 52, y - 1), title, font=font(SANS_BOLD, 25), fill=(255, 255, 255, 255))
    draw.line((x + 52, y + 34, x + width, y + 34), fill=(150, 150, 150, 255), width=1)
    return wrapped(draw, body, (x + 52, y + 45), font(SANS, 19), (225, 225, 225, 255), width - 52, 5)


OUTPUT.parent.mkdir(parents=True, exist_ok=True)
base = Image.open(SOURCE).convert("L").convert("RGBA")
base = ImageEnhance.Contrast(base).enhance(1.15)

# Darken the copy field while preserving the generated texture.
shade = Image.new("RGBA", base.size, (0, 0, 0, 0))
sd = ImageDraw.Draw(shade)
sd.rectangle((24, 20, 1080, 925), fill=(0, 0, 0, 102))
sd.rectangle((53, 235, 1050, 904), fill=(0, 0, 0, 70))
base = Image.alpha_composite(base, shade)
draw = ImageDraw.Draw(base)

# Title lockup.
draw.text((63, 35), "I'LL BE BACK", font=font(IMPACT, 104), fill=(247, 247, 247, 255), stroke_width=1, stroke_fill=(0, 0, 0, 255))
draw.text((68, 147), "THE ZERO-TRUST CARD GAME", font=font(SANS_BOLD, 25), fill=(205, 205, 205, 255))
draw.rectangle((68, 188, 990, 193), fill=(240, 240, 240, 255))
draw.text((68, 202), "3 < 4 < 5 < 6 < 7 < 8 < 9 < 10 < J < Q < K < A < 2", font=font(SANS_BOLD, 20), fill=(235, 235, 235, 255))

left_x, right_x = 68, 567
col_w = 448

section(draw, left_x, 260, 1, "LOAD THE DECK", "2-6 players. Deal 8 cards each. No jokers; suits do not matter. For game one, draw high to choose the starter. Open with any same-rank set.", col_w)
section(draw, left_x, 466, 2, "BEAT IT OR BUILD IT", "Play exactly the current count at a higher rank. Or add any number of the active rank to raise the count. Pair of 7s? Play a higher pair, or add a 7 to make triples.", col_w)
section(draw, left_x, 692, 3, "BLUFF. DRAW. RETURN.", "Claim you cannot play - even when you can. Draw the current count. Then play any legal response from your whole hand, or decline. There is zero trust.", col_w)

section(draw, right_x, 260, 4, "WHEN IT COMES BACK", "After everyone declines, the last player to make a valid play chooses: continue the sequence, or clear it and restart with any same-rank set.", col_w)
section(draw, right_x, 466, 5, "RECYCLE THE PAST", "If the draw pile empties, keep all hands and the current active set in place. Shuffle every older played card. If too few remain, draw only what is available.", col_w)
section(draw, right_x, 692, 6, "GET OUT", "Empty your hand and leave the game. Continue until one player remains. Next game: loser gives winner their best card; winner returns any card. Loser starts.", col_w)

# Footer microcopy and frame accents.
draw.text((69, 882), "SAME RANK RAISES THE COUNT  //  HIGHER RANK MATCHES THE COUNT", font=font(SANS_BOLD, 16), fill=(185, 185, 185, 255))
draw.rectangle((1059, 47, 1064, 892), fill=(170, 170, 170, 150))
draw.text((1080, 851), "NO HONOR SYSTEM", font=font(SANS_BOLD, 15), fill=(200, 200, 200, 255))

base.convert("RGB").save(OUTPUT, quality=96)
print(OUTPUT.resolve())
