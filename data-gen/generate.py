"""Generates the synthetic retail demo dataset as parquet files.

Everything here is invented demo data. Only portfolio-level 2025 totals (36.2M visitors,
EUR 617.3M sales) and a few published floor counts/areas are taken from public sources.

Usage: python generate.py [output_dir]
"""

from __future__ import annotations

import math
import sys
from dataclasses import dataclass, field
from datetime import date, timedelta
from pathlib import Path

import numpy as np
import pandas as pd

from geometry import LAYOUTS, centroid, fmt_points, inset, poly_area, rect_poly, subdivide

SEED = 20261018
WINDOW_START = date(2024, 1, 1)
WINDOW_END = date(2026, 9, 30)
CAL_YEAR = 2025
TARGET_SALES = 617.3e6
TARGET_VISITORS = 36.2e6

# Per-category economics. dens: sales EUR/m2/yr; erv: market rent EUR/m2/month; sc: service charge;
# pct: turnover rent share; growth: annual sales trend; ticket: average basket EUR.
CATS: dict[str, dict[str, float]] = {
    "Fashion":           dict(dens=5200, erv=52, sc=8, pct=0.09, growth=-0.02, ticket=62),
    "Beauty & Health":   dict(dens=7200, erv=62, sc=8, pct=0.09, growth=0.06, ticket=38),
    "Food & Dining":     dict(dens=6500, erv=60, sc=9, pct=0.10, growth=0.07, ticket=21),
    "Grocery":           dict(dens=10500, erv=30, sc=7, pct=0.04, growth=0.02, ticket=31),
    "Sports & Outdoor":  dict(dens=4000, erv=38, sc=7, pct=0.08, growth=0.03, ticket=85),
    "Home & Living":     dict(dens=3500, erv=28, sc=7, pct=0.07, growth=-0.03, ticket=70),
    "Electronics":       dict(dens=8800, erv=45, sc=8, pct=0.05, growth=-0.01, ticket=130),
    "Services":          dict(dens=3500, erv=36, sc=8, pct=0.10, growth=0.03, ticket=45),
    "Leisure":           dict(dens=2600, erv=22, sc=7, pct=0.08, growth=0.05, ticket=24),
}

ROLE_WEIGHTS: dict[str, dict[str, float]] = {
    "ground": {"Fashion": .34, "Beauty & Health": .2, "Electronics": .1, "Sports & Outdoor": .08, "Food & Dining": .12, "Services": .05, "Home & Living": .05, "Grocery": .06},
    "mid":    {"Fashion": .3, "Home & Living": .14, "Sports & Outdoor": .14, "Beauty & Health": .1, "Electronics": .1, "Services": .12, "Food & Dining": .1},
    "mid2":   {"Fashion": .26, "Home & Living": .2, "Sports & Outdoor": .12, "Beauty & Health": .12, "Services": .15, "Electronics": .08, "Food & Dining": .07},
    "top":    {"Food & Dining": .38, "Leisure": .22, "Sports & Outdoor": .1, "Services": .1, "Home & Living": .1, "Fashion": .1},
    "base":   {"Grocery": .2, "Services": .3, "Electronics": .15, "Food & Dining": .2, "Beauty & Health": .15},
}
ROLE_SALES = {"ground": 1.25, "mid": 1.0, "mid2": 0.9, "top": 0.8, "base": 0.85}
ROLE_FOOT = {"ground": 1.0, "mid": 0.7, "mid2": 0.62, "top": 0.55, "base": 0.5}

STEMS = ["Kaarna", "Lumo", "Tuuli", "Vaalea", "Harmaa", "Pilvi", "Nokka", "Aalto", "Kanto", "Rantala", "Orvokki", "Tähti",
         "Saari", "Kivi", "Hetki", "Laine", "Sointu", "Koivu", "Linna", "Metsä", "Vesa", "Auri", "Taika", "Mänty", "Halla",
         "Kajo", "Solmu", "Virta", "Kuura", "Lehto", "Pihla", "Ruska", "Syksy", "Talvi", "Ilves", "Sumu", "Ranta", "Nordis",
         "Kerttu", "Oiva"]
SUFFIX: dict[str, list[str]] = {
    "Fashion": ["Atelier", "Wear", "Studio", "Denim", "Label", "& Co", "Outfitters", "Collective"],
    "Beauty & Health": ["Beauty", "Skin Lab", "Apothecary", "Salon", "Optics", "Wellness"],
    "Food & Dining": ["Kitchen", "Bakery", "Ramen", "Burger Bar", "Coffee", "Bistro", "Pizzeria", "Deli", "Sushi", "Grill", "Tea House"],
    "Grocery": ["Fresh Corner", "Organic Market", "Delikatess", "Candy Hall"],
    "Sports & Outdoor": ["Sport", "Outdoor", "Bike Works", "Run Lab", "Climb"],
    "Home & Living": ["Home", "Living", "Interiors", "Design House", "Lighting", "Textiles"],
    "Electronics": ["Tech", "Digital", "Mobile", "Audio", "Gadgets", "Games"],
    "Services": ["Optician", "Dry Clean", "Travel", "Photo Studio", "Repair", "Shoe Repair", "Tailor"],
    "Leisure": ["Arcade", "Escape Room", "Bowling", "Toy House", "Books & Games", "Kids Club"],
}

DOW_SALES = np.array([0.82, 0.84, 0.90, 1.00, 1.15, 1.45, 0.95])
DOW_FOOT = np.array([0.85, 0.85, 0.92, 1.00, 1.12, 1.30, 0.95])
MONTH_SALES = np.array([0.85, 0.82, 0.90, 0.92, 0.98, 0.98, 0.92, 0.95, 0.97, 1.00, 1.10, 1.55])
HOURS = list(range(9, 21))
HOUR_W = np.array([0.03, 0.06, 0.09, 0.12, 0.11, 0.09, 0.09, 0.10, 0.11, 0.10, 0.07, 0.03])
OPEN_HOURS = {**{d: set(range(12)) for d in range(5)}, 5: set(range(0, 9)), 6: set(range(3, 9))}

PROPERTIES: list[dict] = [
    dict(key=1, code="FOR", name="Forum", city="Helsinki", district="Kamppi", kind="ring", avg_w=100, gla=40000, year=1983,
         prop_mult=1.12, growth=0.02, visitor_share=0.45,
         floors=[(1, "1", "Retail", "ground"), (2, "2", "Retail", "mid"), (3, "3", "Retail", "mid"),
                 (4, "4", "Retail", "mid2"), (5, "5", "Retail", "top")],
         anchors=[dict(level=1, sel=("largest", 0), name="Nordlund Department Store", cat="Fashion", real=False),
                  dict(level=2, sel=("median",), name="Beyond Retro", cat="Fashion", real=True),
                  dict(level=5, sel=("largest", 0), name="Kaari Cinema", cat="Leisure", real=False)]),
    dict(key=2, code="CIT", name="Citycenter", city="Helsinki", district="Kluuvi", kind="spine", avg_w=42, gla=36000, year=1967,
         prop_mult=1.05, growth=0.03, visitor_share=0.25,
         floors=[(-1, "B1", "Retail", "base"), (1, "1", "Retail", "ground"), (2, "2", "Retail", "top"),
                 (3, "3", "Office", None), (4, "4", "Office", None), (5, "5", "Office", None),
                 (6, "6", "Office", None), (7, "7", "Office", None)],
         anchors=[dict(level=1, sel=("cap", 0), name="XXL", cat="Sports & Outdoor", real=True),
                  dict(level=2, sel=("cap", 1), name="Elixia", cat="Services", real=True),
                  dict(level=-1, sel=("largest", 0), name="Fresh & Co Market", cat="Grocery", real=False)]),
    dict(key=3, code="RAT", name="Ratina", city="Tampere", district="Ratina", kind="wings", avg_w=52, gla=52000, year=2018,
         prop_mult=0.88, growth=0.05, visitor_share=0.30,
         floors=[(-2, "P2", "Parking", None), (-1, "P1", "Parking", None), (1, "1", "Retail", "ground"),
                 (2, "2", "Retail", "mid"), (3, "3", "Retail", "top")],
         anchors=[dict(level=1, sel=("largest", 0), name="Ratina Fresh Market", cat="Grocery", real=False),
                  dict(level=1, sel=("largest", 1), name="Vuoksi Grocer", cat="Grocery", real=False),
                  dict(level=2, sel=("largest", 0), name="Halla Home & Garden", cat="Home & Living", real=False),
                  dict(level=3, sel=("largest", 0), name="Suvanto Cinema", cat="Leisure", real=False)]),
]


def d2k(d: date) -> int:
    return d.year * 10000 + d.month * 100 + d.day


@dataclass
class Unit:
    key: int
    prop: dict
    floor_key: int
    level: int
    role: str
    rect: tuple
    poly: list
    canvas_area: float
    cx: float
    cy: float
    zone_key: int
    category: str = ""
    anchor: dict | None = None
    is_cap: bool = False
    area: float = 0.0
    erv: float = 0.0
    code: str = ""
    hub_dist: float = 0.0
    size_disc: float = 1.0
    leases: list = field(default_factory=list)

    def __hash__(self) -> int:
        return self.key

    def __eq__(self, other: object) -> bool:
        return self is other


def main(out_dir: Path) -> None:
    rng = np.random.default_rng(SEED)
    out_dir.mkdir(parents=True, exist_ok=True)

    # ---------- geometry, floors, zones, units ----------
    dim_property, dim_floor, dim_zone, dim_shape = [], [], [], []
    units: list[Unit] = []
    floor_key = zone_key = shape_key = 0
    unit_key = 0
    floor_rows: dict[int, dict] = {}

    for spec in PROPERTIES:
        prop_units: list[Unit] = []
        for sort_order, (level, label, ftype, role) in enumerate(spec["floors"]):
            floor_key += 1
            frng = np.random.default_rng([SEED, spec["key"], level + 10])
            layout = LAYOUTS[spec["kind"]](frng, spec["avg_w"])
            floor_rows[floor_key] = dict(floor_key=floor_key, property_key=spec["key"], level_number=level, level_label=label,
                                         floor_type=ftype, sort_order=sort_order, role=role)
            dim_shape.append(dict(shape_key=(shape_key := shape_key + 1), floor_key=floor_key, shape_type="outline", shape_name="Outline",
                                  points=fmt_points(layout.outline)))
            for i, a in enumerate(layout.atria):
                dim_shape.append(dict(shape_key=(shape_key := shape_key + 1), floor_key=floor_key, shape_type="atrium", shape_name=f"Atrium {i + 1}", points=fmt_points(a)))
            for i, c in enumerate(layout.concourse):
                dim_shape.append(dict(shape_key=(shape_key := shape_key + 1), floor_key=floor_key, shape_type="concourse", shape_name=f"Concourse {i + 1}", points=fmt_points(rect_poly(c))))
            if level == 1 or (ftype == "Retail" and level == min(f[0] for f in spec["floors"] if f[2] == "Retail")):
                for i, e in enumerate(layout.entrances):
                    dim_shape.append(dict(shape_key=(shape_key := shape_key + 1), floor_key=floor_key, shape_type="entrance", shape_name=f"Entrance {i + 1}", points=fmt_points(rect_poly(e))))
            if ftype != "Retail":
                continue

            zone_keys = []
            for zname, (zx, zy) in layout.zones:
                zone_key += 1
                zone_keys.append(zone_key)
                dim_zone.append(dict(zone_key=zone_key, property_key=spec["key"], floor_key=floor_key, zone_name=zname, center_x=zx, center_y=zy))

            rects: list[tuple[tuple, bool]] = [(r, False) for r in layout.unit_rects]
            cap_anchor = {a["sel"][1]: a for a in spec["anchors"] if a["level"] == level and a["sel"][0] == "cap"}
            for idx, (cap, axis) in enumerate(layout.caps):
                if idx in cap_anchor:
                    rects.append((cap, True))
                else:
                    rects.extend((r, False) for r in subdivide(cap, axis, 3, frng))
            for r, is_cap in rects:
                r2 = inset(r)
                poly = rect_poly(r2)
                cx, cy = centroid(poly)
                dists = [math.hypot(cx - zx, cy - zy) for _, (zx, zy) in layout.zones]
                zk = zone_keys[int(np.argmin(dists))]
                unit_key += 1
                u = Unit(unit_key, spec, floor_key, level, role, r2, poly, poly_area(poly), cx, cy, zk, is_cap=is_cap)
                u.hub_dist = math.hypot(cx - layout.hub[0], cy - layout.hub[1])
                prop_units.append(u)

        # scale canvas -> m2 so the retail floors sum to the target GLA
        total = sum(u.canvas_area for u in prop_units)
        scale = spec["gla"] / total
        for u in prop_units:
            u.area = round(u.canvas_area * scale, 1)

        # anchors
        for a in spec["anchors"]:
            cands = [u for u in prop_units if u.level == a["level"] and u.anchor is None]
            if a["sel"][0] == "cap":
                u = next(u for u in cands if u.is_cap and abs(u.cx - (110 if a["sel"][1] == 0 else 890)) < 5)
            elif a["sel"][0] == "largest":
                u = sorted(cands, key=lambda x: -x.canvas_area)[a["sel"][1]]
            else:
                srt = sorted(cands, key=lambda x: x.canvas_area)
                u = srt[len(srt) // 2]
            u.anchor = a

        # categories
        for u in prop_units:
            if u.anchor:
                u.category = u.anchor["cat"]
            else:
                w = ROLE_WEIGHTS[u.role]
                names = list(w)
                p = np.array([w[n] for n in names])
                u.category = str(rng.choice(names, p=p / p.sum()))
        units.extend(prop_units)

        dim_property.append(dict(property_key=spec["key"], property_code=spec["code"], property_name=spec["name"], city=spec["city"],
                                 district=spec["district"], floors_total=len(spec["floors"]),
                                 retail_floors=sum(1 for f in spec["floors"] if f[2] == "Retail"), gla_m2=float(spec["gla"]),
                                 year_built=spec["year"], layout_kind=spec["kind"], canvas_width=1000, canvas_height=600))

    # unit codes, rent levels
    for spec in PROPERTIES:
        per_floor: dict[int, list[Unit]] = {}
        for u in units:
            if u.prop is spec:
                per_floor.setdefault(u.floor_key, []).append(u)
        for fk, lst in per_floor.items():
            lst.sort(key=lambda x: (round(x.cy / 40), x.cx))
            label = floor_rows[fk]["level_label"]
            for i, u in enumerate(lst, 1):
                u.code = f"{spec['code']}-{label}-{i:02d}"
    for u in units:
        c = CATS[u.category]
        size_disc = float(np.clip((u.area / 250) ** -0.18, 0.55, 1.3))
        rent_size = 1.0 if u.area < 500 else (0.8 if u.area < 1000 else 0.6)
        pm = {1: 1.0, 2: 1.0, 3: 0.78}[u.prop["key"]]
        role_rent = {"ground": 1.2, "mid": 1.0, "mid2": 0.9, "top": 0.8, "base": 0.8}[u.role]
        u.erv = round(c["erv"] * pm * role_rent * rent_size, 2)
        u.size_disc = size_disc

    U = len(units)
    unit_idx = {u.key: i for i, u in enumerate(units)}
    area = np.array([u.area for u in units])

    # ---------- tenants & leases ----------
    pools: dict[str, list[str]] = {}
    for cat in CATS:
        names = [f"{s} {suf}" for s in STEMS for suf in SUFFIX[cat]]
        rng.shuffle(names)
        pools[cat] = names[:45]
    tenants: dict[str, dict] = {}

    def tenant_key(name: str, cat: str, real: bool = False) -> int:
        if name not in tenants:
            origin = "International" if real and name != "Elixia" else str(rng.choice(["International", "Domestic", "Local"], p=[0.35, 0.4, 0.25]))
            tenants[name] = dict(tenant_key=len(tenants) + 1, tenant_name=name, category=cat, origin=origin, is_real_brand=real)
        return tenants[name]["tenant_key"]

    leases: list[dict] = []

    def add_lease(u: Unit, tkey: int, start: date, end: date, rent: float | None = None) -> dict:
        c = CATS[u.category]
        years_to_now = (WINDOW_END - start).days / 365.25
        r = rent if rent is not None else u.erv * rng.uniform(0.88, 1.08) / (1.02 ** max(years_to_now, 0))
        lease = dict(lease_key=len(leases) + 1, unit_key=u.key, tenant_key=tkey, start_date=start, end_date=end,
                     rent_m2=round(float(r), 2), turnover_pct=c["pct"], sc_m2=c["sc"], area_m2=u.area)
        lease["annual_base_rent_eur"] = round(lease["rent_m2"] * u.area * 12, 2)
        leases.append(lease)
        u.leases.append(lease)
        return lease

    used_by_prop: dict[int, set[str]] = {}

    def pick_tenant(u: Unit) -> int:
        used = used_by_prop.setdefault(u.prop["key"], set())
        for name in pools[u.category]:
            if name not in used:
                used.add(name)
                return tenant_key(name, u.category)
        return tenant_key(f"{u.category} Pop-up {len(tenants)}", u.category)

    story: dict[str, list[Unit]] = {"cliff": [], "weak": [], "vacant": [], "xxl": [], "xxl_nb": []}
    forum_f2 = [u for u in units if u.prop["key"] == 1 and u.level == 2 and not u.anchor]
    forum_f3 = [u for u in units if u.prop["key"] == 1 and u.level == 3 and not u.anchor and 60 < u.area < 450]
    rat_f3 = [u for u in units if u.prop["key"] == 3 and u.level == 3 and not u.anchor and u.area < 500]
    story["cliff"] = list(rng.choice(forum_f2, 8, replace=False))
    story["weak"] = list(rng.choice(forum_f3, 6, replace=False))
    story["vacant"] = list(rng.choice(rat_f3, 4, replace=False))

    for u in units:
        if u.anchor and u.anchor["name"] == "XXL":
            story["xxl"] = [u]
            story["xxl_nb"] = [x for x in units if x.floor_key == u.floor_key and x.zone_key == u.zone_key and x is not u]

    for u in units:
        if u.anchor:
            a = u.anchor
            tk = tenant_key(a["name"], a["cat"], a["real"])
            if a["name"] == "XXL":
                prev = tenant_key("Kaino Sports Hall", u.category)
                add_lease(u, prev, date(2019, 3, 1), date(2025, 2, 28))
                add_lease(u, tk, date(2025, 11, 1), date(2035, 10, 31), rent=u.erv * 0.95)
            else:
                st = date(2018, 1, 1) + timedelta(days=int(rng.integers(0, 1500)))
                add_lease(u, tk, st, st + timedelta(days=365 * int(rng.choice([10, 12, 15]))))
            continue
        if u in story["cliff"]:
            end = date(2026, 11, 1) + timedelta(days=int(rng.integers(0, 300)))
            add_lease(u, pick_tenant(u), date(2021, 1, 1) + timedelta(days=int(rng.integers(0, 600))), end)
            continue
        if u in story["vacant"]:
            add_lease(u, pick_tenant(u), date(2021, 6, 1), date(2025, 12, 31))
            continue
        # ordinary: leases rolling across the window
        remaining = float(rng.uniform(0.1, 8.0))
        end = WINDOW_START + timedelta(days=int(remaining * 365))
        term = int(rng.choice([3, 5, 5, 7, 10]))
        start = min(end - timedelta(days=term * 365), WINDOW_START - timedelta(days=int(rng.integers(30, 400))))
        tk = pick_tenant(u)
        add_lease(u, tk, start, end)
        while end < WINDOW_END:
            if rng.random() < 0.65:
                nxt = end + timedelta(days=1)
                term = int(rng.choice([3, 5, 5, 7]))
                prev_rent = u.leases[-1]["rent_m2"]
                end = nxt + timedelta(days=term * 365)
                add_lease(u, tk, nxt, end, rent=prev_rent * rng.uniform(0.96, 1.07))
            else:
                nxt = end + timedelta(days=1 + int(rng.integers(30, 240)))
                if nxt > WINDOW_END:
                    break
                term = int(rng.choice([3, 5, 5, 7]))
                tk = pick_tenant(u)
                end = nxt + timedelta(days=term * 365)
                add_lease(u, tk, nxt, end)

    # ---------- calendar ----------
    days = [WINDOW_START + timedelta(days=i) for i in range((WINDOW_END - WINDOW_START).days + 1)]
    D = len(days)
    dow = np.array([d.weekday() for d in days])
    month = np.array([d.month for d in days])
    ordinals = np.array([d.toordinal() for d in days])
    month_idx = np.array([(d.year - WINDOW_START.year) * 12 + d.month - 1 for d in days])
    M = int(month_idx.max()) + 1
    closed = {date(y, 1, 1) for y in (2024, 2025, 2026)} | {date(y, 12, 6) for y in (2024, 2025)} | {date(y, 12, 25) for y in (2024, 2025)}
    closed |= {date(2024, 3, 31), date(2025, 4, 20), date(2026, 4, 5)}
    closed_mask = np.array([d in closed for d in days])
    half_mask = np.array([d.month == 12 and d.day == 24 for d in days])
    in_cal = np.array([d.year == CAL_YEAR for d in days])

    def shift(arr: np.ndarray) -> np.ndarray:
        return arr / arr[in_cal].mean()

    season = shift(MONTH_SALES[month - 1] * DOW_SALES[dow])
    season_foot = shift((MONTH_SALES[month - 1] ** 0.7) * DOW_FOOT[dow])

    # ---------- sales ----------
    prop_growth = np.array([u.prop["growth"] for u in units])
    cat_growth = np.array([CATS[u.category]["growth"] for u in units])
    hub_f = np.array([0.85 + 0.4 * math.exp(-((u.hub_dist / 260) ** 2)) for u in units])
    role_f = np.array([ROLE_SALES[u.role] for u in units])
    prop_m = np.array([u.prop["prop_mult"] for u in units])
    size_f = np.array([u.size_disc for u in units])
    cat_d = np.array([CATS[u.category]["dens"] for u in units])
    unit_noise = rng.lognormal(0, 0.22, U)
    dens = cat_d * prop_m * role_f * hub_f * size_f * unit_noise
    base_daily = dens * area / 365.0

    t_years = (ordinals - date(2025, 7, 1).toordinal()) / 365.25
    trend = (1 + cat_growth + prop_growth)[:, None] ** t_years[None, :]
    noise = rng.lognormal(-0.5 * 0.14**2, 0.14, (U, D))
    mult = np.ones((U, D))

    def ramp(start: date, days_: int = 45) -> np.ndarray:
        x = (ordinals - start.toordinal()) / days_
        return np.clip(x, 0, 1)

    for u in story["weak"]:
        mult[unit_idx[u.key]] *= 1 - 0.38 * ramp(date(2025, 4, 1), 90)
    r = ramp(date(2025, 11, 1), 45)
    for u in story["xxl_nb"]:
        mult[unit_idx[u.key]] *= 1 + 0.10 * r

    occ = np.zeros((U, D), dtype=bool)
    ten = np.zeros((U, D), dtype=np.int32)
    for lease in leases:
        i = unit_idx[lease["unit_key"]]
        a = max(0, (lease["start_date"] - WINDOW_START).days)
        b = min(D - 1, (lease["end_date"] - WINDOW_START).days)
        if b >= a:
            occ[i, a : b + 1] = True
            ten[i, a : b + 1] = lease["tenant_key"]

    sales = base_daily[:, None] * season[None, :] * trend * noise * mult * occ
    sales[:, closed_mask] = 0
    sales[:, half_mask] *= 0.55
    raw = sales[:, in_cal].sum()
    factor = TARGET_SALES / raw
    sales *= factor
    print(f"sales calibration factor {factor:.3f} (raw 2025 {raw / 1e6:.1f}M)")

    ticket = np.array([CATS[u.category]["ticket"] for u in units])
    ui, di = np.nonzero(sales > 0)
    fact_sales = pd.DataFrame({
        "date_key": [d2k(days[j]) for j in di],
        "unit_key": [units[i].key for i in ui],
        "tenant_key": ten[ui, di],
        "sales_eur": np.round(sales[ui, di], 2),
        "transactions": np.maximum(1, np.round(sales[ui, di] / ticket[ui] * rng.uniform(0.9, 1.1, len(ui)))).astype(int),
    })

    # ---------- footfall ----------
    zone_info = {z["zone_key"]: z for z in dim_zone}
    zone_area: dict[int, float] = {}
    for u in units:
        zone_area[u.zone_key] = zone_area.get(u.zone_key, 0) + u.area
    foot_rows = []
    zkeys = sorted(zone_info)
    base_z = np.zeros(len(zkeys))
    for spec in PROPERTIES:
        zs = [z for z in zkeys if zone_info[z]["property_key"] == spec["key"]]
        weights = []
        for z in zs:
            role = floor_rows[zone_info[z]["floor_key"]]["role"]
            weights.append(ROLE_FOOT[role] * (zone_area.get(z, 1) ** 0.7))
        weights = np.array(weights) / sum(weights)
        for z, w in zip(zs, weights):
            base_z[zkeys.index(z)] = spec["visitor_share"] * TARGET_VISITORS * w / 365.0
    fnoise = rng.lognormal(-0.5 * 0.07**2, 0.07, (len(zkeys), D))
    fmult = np.ones((len(zkeys), D))
    xxl_floor = story["xxl"][0].floor_key
    xxl_zone = story["xxl"][0].zone_key
    fmult[zkeys.index(xxl_zone)] *= 1 + 0.12 * r
    daily = base_z[:, None] * season_foot[None, :] * fnoise * fmult
    daily[:, closed_mask] *= 0.05
    profile = np.zeros((7, 12))
    for d_ in range(7):
        w = np.zeros(12)
        for h in OPEN_HOURS[d_]:
            w[h] = HOUR_W[h]
        profile[d_] = w / w.sum()
    foot = daily[:, :, None] * profile[dow][None, :, :]
    fcal = foot[:, in_cal, :].sum()
    foot *= TARGET_VISITORS / fcal
    zi, dj, hk = np.nonzero(foot > 0.5)
    fact_foot = pd.DataFrame({
        "date_key": [d2k(days[j]) for j in dj],
        "zone_key": [zkeys[i] for i in zi],
        "hour": np.array(HOURS)[hk],
        "visitors": np.round(foot[zi, dj, hk]).astype(int),
    })
    print(f"footfall 2025 total {foot[:, in_cal, :].sum() / 1e6:.2f}M, rows {len(fact_foot):,}")

    # ---------- monthly rent ----------
    onehot = np.zeros((D, M))
    onehot[np.arange(D), month_idx] = 1
    sales_m = sales @ onehot
    month_starts = [date(WINDOW_START.year + (WINDOW_START.month - 1 + m) // 12, (WINDOW_START.month - 1 + m) % 12 + 1, 1) for m in range(M)]
    rent_rows = []
    for u in units:
        i = unit_idx[u.key]
        for m, ms in enumerate(month_starts):
            mid = ms + timedelta(days=14)
            lease = next((l for l in u.leases if l["start_date"] <= mid <= l["end_date"]), None)
            c = CATS[u.category]
            row = dict(month_date_key=d2k(ms), unit_key=u.key, lease_key=None, area_m2=u.area, occupied_area_m2=0.0,
                       base_rent_eur=0.0, turnover_top_up_eur=0.0, service_charge_eur=0.0,
                       erv_eur=round(u.erv * u.area, 2), vacant_erv_eur=round(u.erv * u.area, 2))
            if lease:
                idx_years = int((ms - lease["start_date"]).days // 365.25)
                base = lease["rent_m2"] * u.area * (1.02 ** max(idx_years, 0))
                top_up = max(0.0, lease["turnover_pct"] * sales_m[i, m] - base)
                row.update(lease_key=lease["lease_key"], occupied_area_m2=u.area, base_rent_eur=round(base, 2),
                           turnover_top_up_eur=round(top_up, 2), service_charge_eur=round(lease["sc_m2"] * u.area, 2), vacant_erv_eur=0.0)
            rent_rows.append(row)
    fact_rent = pd.DataFrame(rent_rows)
    fact_rent["lease_key"] = fact_rent["lease_key"].astype("Int64")

    # ---------- energy ----------
    energy_rows = []
    heat_season = np.array([1.7, 1.6, 1.3, 0.9, 0.5, 0.35, 0.3, 0.3, 0.5, 0.9, 1.3, 1.6])
    floor_area: dict[int, float] = {}
    for u in units:
        floor_area[u.floor_key] = floor_area.get(u.floor_key, 0) + u.area
    for fk, a_ in floor_area.items():
        spec = next(p for p in PROPERTIES if p["key"] == floor_rows[fk]["property_key"])
        for m, ms in enumerate(month_starts):
            elec = a_ * 6.2 * rng.uniform(0.95, 1.05)
            heat = a_ * 5.5 * heat_season[ms.month - 1] * rng.uniform(0.95, 1.05)
            if spec["key"] == 1 and floor_rows[fk]["level_number"] == 4 and ms >= date(2026, 1, 1):
                elec *= 1.3
                heat *= 1.15
            energy_rows.append(dict(month_date_key=d2k(ms), floor_key=fk, electricity_kwh=round(elec), heating_kwh=round(heat)))
    fact_energy = pd.DataFrame(energy_rows)

    # ---------- dimensions ----------
    cal = pd.DataFrame({"date": pd.date_range(date(2024, 1, 1), date(2026, 12, 31))})
    cal["date_key"] = cal["date"].dt.year * 10000 + cal["date"].dt.month * 100 + cal["date"].dt.day
    cal["year"] = cal["date"].dt.year
    cal["quarter"] = cal["date"].dt.quarter
    cal["month_number"] = cal["date"].dt.month
    cal["month_name"] = cal["date"].dt.strftime("%b")
    cal["year_month"] = cal["date"].dt.strftime("%Y-%m")
    cal["month_start"] = cal["date"].dt.to_period("M").dt.to_timestamp()
    cal["day_of_week_number"] = cal["date"].dt.dayofweek + 1
    cal["day_name"] = cal["date"].dt.strftime("%a")
    cal["is_weekend"] = cal["date"].dt.dayofweek >= 5
    cal["week_number"] = cal["date"].dt.isocalendar().week.astype(int)
    for col in ("date", "month_start"):
        cal[col] = cal[col].dt.date

    dim_unit = pd.DataFrame([dict(unit_key=u.key, property_key=u.prop["key"], floor_key=u.floor_key, zone_key=u.zone_key, unit_code=u.code,
                                  area_m2=u.area, category=u.category,
                                  unit_type=("Anchor" if u.anchor else "Restaurant" if u.category == "Food & Dining" else "Service" if u.category == "Services" else "Store"),
                                  is_anchor=bool(u.anchor), erv_per_m2_month=u.erv, centroid_x=round(u.cx, 1), centroid_y=round(u.cy, 1),
                                  polygon_points=fmt_points(u.poly)) for u in units])
    dim_floor_df = pd.DataFrame([{k: v for k, v in r.items() if k != "role"} for r in floor_rows.values()])
    gla_by_floor = {fk: round(v, 1) for fk, v in floor_area.items()}
    dim_floor_df["gla_m2"] = dim_floor_df["floor_key"].map(gla_by_floor).fillna(0.0)
    lease_df = pd.DataFrame(leases).rename(columns={"rent_m2": "base_rent_per_m2_month", "turnover_pct": "turnover_rent_pct", "sc_m2": "service_charge_per_m2_month"})

    tables = {
        "dim_property": pd.DataFrame(dim_property), "dim_floor": dim_floor_df, "dim_zone": pd.DataFrame(dim_zone),
        "dim_floor_shape": pd.DataFrame(dim_shape), "dim_unit": dim_unit, "dim_tenant": pd.DataFrame(tenants.values()),
        "dim_lease": lease_df, "dim_date": cal, "fact_sales_daily": fact_sales, "fact_footfall_hourly": fact_foot,
        "fact_rent_monthly": fact_rent, "fact_energy_monthly": fact_energy,
    }
    for name, df in tables.items():
        df.to_parquet(out_dir / f"{name}.parquet", index=False)
        print(f"{name:22s} {len(df):>9,} rows")

    # ---------- sanity report ----------
    s25 = fact_sales[fact_sales.date_key // 10000 == CAL_YEAR].merge(dim_unit[["unit_key", "property_key"]], on="unit_key")
    print("2025 sales by property (M):", (s25.groupby("property_key").sales_eur.sum() / 1e6).round(1).to_dict())
    r25 = fact_rent[fact_rent.month_date_key // 10000 == CAL_YEAR].merge(dim_unit[["unit_key", "property_key"]], on="unit_key")
    tot = r25.groupby("property_key")[["base_rent_eur", "turnover_top_up_eur", "service_charge_eur", "occupied_area_m2", "area_m2"]].sum()
    ocr = (tot.base_rent_eur + tot.turnover_top_up_eur + tot.service_charge_eur) / (s25.groupby("property_key").sales_eur.sum())
    print("OCR 2025:", ocr.round(3).to_dict(), "| occupancy:", (tot.occupied_area_m2 / tot.area_m2).round(3).to_dict())


if __name__ == "__main__":
    main(Path(sys.argv[1]) if len(sys.argv) > 1 else Path(__file__).parent / "out")
