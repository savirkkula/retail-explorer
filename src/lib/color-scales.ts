import { interpolateRgbBasis } from "d3-interpolate";
import type { UnitKpis } from "@/queries/floorplan/unit-kpis";
import { categoryIndex } from "@/lib/categories";
import type { MapActionStatus } from "@/lib/actions";
import type { Lens } from "@/lib/lenses";

export interface Palette {
    data: string[];
    seq: string[];
    div: string[];
    vacant: string;
    slab: string;
    slabEdge: string;
    background: string;
    foreground: string;
    signal: string;
}

function token(style: CSSStyleDeclaration, name: string, fallback: string): string {
    return style.getPropertyValue(name).trim() || fallback;
}

/** Resolves the design tokens in global.css to concrete colors for WebGL. */
export function readPalette(): Palette {
    const style = getComputedStyle(document.documentElement);
    const range = (prefix: string, n: number) => Array.from({ length: n }, (_, i) => token(style, `${prefix}${i + 1}`, "#888888"));
    return {
        data: range("--color-data-", 10),
        seq: range("--ramp-seq-", 5),
        div: range("--ramp-div-", 5),
        vacant: token(style, "--color-vacant", "#999999"),
        slab: token(style, "--color-slab", "#dddddd"),
        slabEdge: token(style, "--color-slab-edge", "#bbbbbb"),
        background: token(style, "--color-background", "#ffffff"),
        foreground: token(style, "--color-foreground", "#000000"),
        signal: token(style, "--color-signal", "#ff5500"),
    };
}

export interface LegendCategory {
    label: string;
    color: string;
}

export interface Legend {
    kind: "categories" | "gradient";
    categories: LegendCategory[];
    /** Gradient stops from low to high. */
    stops: string[];
    loLabel: string;
    hiLabel: string;
    loCaption?: string;
    hiCaption?: string;
}

export interface Colorizer {
    colorOf: (category: string, kpi: UnitKpis | undefined, unitKey?: number) => string;
    /** When true, vacant units take their color from `colorOf` instead of the muted vacant color. */
    colorsVacant: boolean;
    legend: Legend;
}

function quantile(sorted: number[], q: number): number {
    if (sorted.length === 0) return 0;
    const pos = (sorted.length - 1) * q;
    const base = Math.floor(pos);
    const rest = pos - base;
    return sorted[base + 1] !== undefined ? sorted[base] + rest * (sorted[base + 1] - sorted[base]) : sorted[base];
}

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

export function createColorizer(
    lens: Lens,
    kpis: UnitKpis[],
    categories: string[],
    palette: Palette,
    actionStatus: ReadonlyMap<number, MapActionStatus> = new Map(),
): Colorizer {
    if (lens.id === "actions") {
        const colors: Record<MapActionStatus | "none", string> = {
            open: palette.data[1],
            "in-progress": palette.data[0],
            done: palette.div[4],
            none: palette.vacant,
        };
        return {
            colorOf: (_category, _kpi, unitKey) => colors[(unitKey != null ? actionStatus.get(unitKey) : undefined) ?? "none"],
            colorsVacant: true,
            legend: {
                kind: "categories",
                categories: [
                    { label: "Open", color: colors.open },
                    { label: "In progress", color: colors["in-progress"] },
                    { label: "Done", color: colors.done },
                    { label: "No action", color: colors.none },
                ],
                stops: [],
                loLabel: "",
                hiLabel: "",
            },
        };
    }

    if (lens.ramp === "categorical" || lens.field === null) {
        return {
            colorOf: (category) => palette.data[Math.min(categoryIndex(category), palette.data.length - 1)],
            colorsVacant: false,
            legend: {
                kind: "categories",
                categories: categories.map((label) => ({ label, color: palette.data[Math.min(categoryIndex(label), palette.data.length - 1)] })),
                stops: [],
                loLabel: "",
                hiLabel: "",
            },
        };
    }

    const field = lens.field;
    const values = kpis
        .filter((k) => k.isVacant === 0)
        .map((k) => k[field])
        .filter((v): v is number => typeof v === "number")
        .sort((a, b) => a - b);
    const lo = lens.lo ?? quantile(values, 0.05);
    const hi = lens.hi ?? quantile(values, 0.95);
    const stops = lens.ramp === "diverging" ? palette.div : palette.seq;
    const interpolate = interpolateRgbBasis(stops);
    const span = hi - lo || 1;

    return {
        colorOf: (_category, kpi) => {
            const v = kpi?.[field];
            if (typeof v !== "number") return palette.vacant;
            return interpolate(clamp01((v - lo) / span));
        },
        colorsVacant: false,
        legend: {
            kind: "gradient",
            categories: [],
            stops: Array.from({ length: 9 }, (_, i) => interpolate(i / 8)),
            loLabel: lens.format(lo),
            hiLabel: lens.format(hi),
            loCaption: lens.loCaption,
            hiCaption: lens.hiCaption,
        },
    };
}
