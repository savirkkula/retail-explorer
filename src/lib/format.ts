const eur = new Intl.NumberFormat("en-GB", { maximumFractionDigits: 0 });

export function fmtInt(v: number | null | undefined): string {
    return v == null || Number.isNaN(v) ? "–" : eur.format(Math.round(v));
}

export function fmtEur(v: number | null | undefined): string {
    return v == null || Number.isNaN(v) ? "–" : `€${eur.format(Math.round(v))}`;
}

/** Compact currency/number: 1.2k, 4.5M. */
export function fmtCompact(v: number | null | undefined, prefix = ""): string {
    if (v == null || Number.isNaN(v)) return "–";
    const abs = Math.abs(v);
    if (abs >= 1e9) return `${prefix}${(v / 1e9).toFixed(2)}B`;
    if (abs >= 1e6) return `${prefix}${(v / 1e6).toFixed(1)}M`;
    if (abs >= 1e4) return `${prefix}${(v / 1e3).toFixed(0)}k`;
    if (abs >= 1e3) return `${prefix}${(v / 1e3).toFixed(1)}k`;
    return `${prefix}${Math.round(v)}`;
}

export function fmtPct(v: number | null | undefined, digits = 1, signed = false): string {
    if (v == null || Number.isNaN(v)) return "–";
    const s = (v * 100).toFixed(digits);
    return `${signed && v > 0 ? "+" : ""}${s}%`;
}

export function fmtYears(v: number | null | undefined): string {
    return v == null || Number.isNaN(v) ? "–" : `${v.toFixed(1)} yrs`;
}

export function fmtScore(v: number | null | undefined): string {
    return v == null || Number.isNaN(v) ? "–" : String(Math.round(v));
}

export function fmtDate(iso: string | null | undefined): string {
    return iso ? iso.slice(0, 10) : "–";
}
