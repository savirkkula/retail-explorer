"""Schematic floor layouts for the demo shopping centers (not to scale, not real plans)."""

from __future__ import annotations

from dataclasses import dataclass, field

import numpy as np

Rect = tuple[float, float, float, float]
Point = tuple[float, float]

INSET = 1.4


def rect_poly(r: Rect) -> list[Point]:
    x0, y0, x1, y1 = r
    return [(x0, y0), (x1, y0), (x1, y1), (x0, y1)]


def inset(r: Rect, d: float = INSET) -> Rect:
    x0, y0, x1, y1 = r
    return (x0 + d, y0 + d, x1 - d, y1 - d)


def poly_area(pts: list[Point]) -> float:
    s = 0.0
    for i, (x0, y0) in enumerate(pts):
        x1, y1 = pts[(i + 1) % len(pts)]
        s += x0 * y1 - x1 * y0
    return abs(s) / 2


def centroid(pts: list[Point]) -> Point:
    return (sum(p[0] for p in pts) / len(pts), sum(p[1] for p in pts) / len(pts))


def fmt_points(pts: list[Point]) -> str:
    return " ".join(f"{x:.1f},{y:.1f}" for x, y in pts)


def subdivide(rect: Rect, axis: str, n: int, rng: np.random.Generator) -> list[Rect]:
    x0, y0, x1, y1 = rect
    n = max(1, n)
    w = rng.uniform(0.7, 1.3, n)
    w = w / w.sum()
    length = (x1 - x0) if axis == "x" else (y1 - y0)
    pos = x0 if axis == "x" else y0
    out: list[Rect] = []
    for frac in w:
        seg = length * frac
        out.append((pos, y0, pos + seg, y1) if axis == "x" else (x0, pos, x1, pos + seg))
        pos += seg
    return out


@dataclass
class FloorLayout:
    kind: str
    outline: list[Point]
    atria: list[list[Point]]
    concourse: list[Rect]
    entrances: list[Rect]
    hub: Point
    zones: list[tuple[str, Point]]
    unit_rects: list[Rect] = field(default_factory=list)
    caps: list[tuple[Rect, str]] = field(default_factory=list)


def _bands(spec: list[tuple[Rect, str]], avg_w: float, rng: np.random.Generator) -> list[Rect]:
    out: list[Rect] = []
    for rect, axis in spec:
        length = (rect[2] - rect[0]) if axis == "x" else (rect[3] - rect[1])
        out.extend(subdivide(rect, axis, int(round(length / avg_w)), rng))
    return out


def ring_layout(rng: np.random.Generator, avg_w: float) -> FloorLayout:
    spec = [
        ((20, 20, 980, 110), "x"), ((20, 490, 980, 580), "x"),
        ((20, 110, 110, 490), "y"), ((890, 110, 980, 490), "y"),
        ((160, 160, 840, 240), "x"), ((160, 360, 840, 440), "x"),
        ((160, 240, 240, 360), "y"), ((760, 240, 840, 360), "y"),
    ]
    return FloorLayout(
        kind="ring",
        outline=rect_poly((20, 20, 980, 580)),
        atria=[rect_poly((240, 240, 760, 360))],
        concourse=[(110, 110, 890, 160), (110, 440, 890, 490), (110, 160, 160, 440), (840, 160, 890, 440)],
        entrances=[(460, 0, 540, 20), (0, 260, 20, 340), (980, 260, 1000, 340)],
        hub=(500, 300),
        zones=[("North", (500, 65)), ("South", (500, 535)), ("West", (65, 300)), ("East", (935, 300)), ("Court", (500, 300))],
        unit_rects=_bands(spec, avg_w, rng),
    )


def spine_layout(rng: np.random.Generator, avg_w: float) -> FloorLayout:
    spec = [
        ((200, 120, 470, 230), "x"), ((530, 120, 800, 230), "x"),
        ((200, 290, 470, 400), "x"), ((530, 290, 800, 400), "x"),
    ]
    return FloorLayout(
        kind="spine",
        outline=rect_poly((20, 120, 980, 400)),
        atria=[],
        concourse=[(200, 230, 800, 290), (470, 120, 530, 400)],
        entrances=[(0, 200, 20, 320), (980, 200, 1000, 320), (460, 100, 540, 120)],
        hub=(500, 260),
        zones=[("West", (110, 260)), ("Centre", (500, 260)), ("East", (890, 260))],
        unit_rects=_bands(spec, avg_w, rng),
        caps=[((20, 120, 200, 400), "y"), ((800, 120, 980, 400), "y")],
    )


def wings_layout(rng: np.random.Generator, avg_w: float) -> FloorLayout:
    spec = [
        ((40, 40, 150, 560), "y"), ((210, 40, 330, 270), "y"), ((210, 330, 330, 560), "y"),
        ((330, 200, 670, 270), "x"), ((330, 330, 670, 400), "x"),
        ((670, 40, 790, 270), "y"), ((670, 330, 790, 560), "y"), ((850, 40, 960, 560), "y"),
    ]
    outline = [(40, 40), (330, 40), (330, 200), (670, 200), (670, 40), (960, 40),
               (960, 560), (670, 560), (670, 400), (330, 400), (330, 560), (40, 560)]
    return FloorLayout(
        kind="wings",
        outline=outline,
        atria=[],
        concourse=[(150, 40, 210, 560), (790, 40, 850, 560), (330, 270, 670, 330), (210, 270, 330, 330), (670, 270, 790, 330)],
        entrances=[(20, 250, 40, 350), (960, 250, 980, 350), (460, 180, 540, 200)],
        hub=(500, 300),
        zones=[("Left wing", (190, 300)), ("Bridge", (500, 300)), ("Right wing", (810, 300))],
        unit_rects=_bands(spec, avg_w, rng),
    )


LAYOUTS = {"ring": ring_layout, "spine": spine_layout, "wings": wings_layout}
