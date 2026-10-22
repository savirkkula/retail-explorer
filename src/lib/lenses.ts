import type { UnitKpis } from "@/queries/floorplan/unit-kpis";
import { fmtCompact, fmtPct, fmtScore, fmtYears } from "@/lib/format";

export type LensId = "category" | "salesDensity" | "salesGrowth" | "ocr" | "leaseRunway" | "footfall" | "health" | "actions";

type NumericKpiField = {
    [K in keyof UnitKpis]: UnitKpis[K] extends number | null ? K : never;
}[keyof UnitKpis];

export interface Lens {
    id: LensId;
    label: string;
    /** One-line explanation shown under the lens picker. */
    description: string;
    field: NumericKpiField | null;
    ramp: "categorical" | "sequential" | "diverging";
    /** Fixed value mapped to the cold/bad end of the ramp; `null` derives it from the data (5th percentile). */
    lo: number | null;
    /** Fixed value mapped to the hot/good end of the ramp; `null` derives it from the data (95th percentile). */
    hi: number | null;
    format: (v: number | null | undefined) => string;
    /** ECMA-376 format string for DataGrid cells. */
    excelFormat: string;
    /** Short caption for the low and high legend ends when the ramp is diverging. */
    loCaption?: string;
    hiCaption?: string;
}

export const LENSES: Lens[] = [
    {
        id: "category", label: "Category", description: "What each store sells.", field: null, ramp: "categorical",
        lo: null, hi: null, format: () => "", excelFormat: "",
    },
    {
        id: "salesDensity", label: "Sales / m²", description: "Annualised sales per occupied m².", field: "salesPerM2", ramp: "sequential",
        lo: null, hi: null, format: (v) => fmtCompact(v, "€"), excelFormat: "#,##0",
    },
    {
        id: "salesGrowth", label: "Sales growth", description: "Sales versus the same period last year.", field: "salesYoY", ramp: "diverging",
        lo: -0.15, hi: 0.15, format: (v) => fmtPct(v, 0, true), excelFormat: "+0.0%;-0.0%;0.0%", loCaption: "Declining", hiCaption: "Growing",
    },
    {
        id: "ocr", label: "Occupancy cost", description: "Rent plus service charge as a share of sales. Above 15% is stretched.", field: "ocr", ramp: "diverging",
        lo: 0.2, hi: 0.06, format: (v) => fmtPct(v, 1), excelFormat: "0.0%", loCaption: "Stretched", hiCaption: "Comfortable",
    },
    {
        id: "leaseRunway", label: "Lease runway", description: "Years until the current lease expires.", field: "leaseYears", ramp: "sequential",
        lo: 0, hi: 6, format: fmtYears, excelFormat: "0.0",
    },
    {
        id: "footfall", label: "Footfall", description: "Visitors passing the store's zone in the period.", field: "zoneVisitors", ramp: "sequential",
        lo: null, hi: null, format: (v) => fmtCompact(v), excelFormat: "#,##0",
    },
    {
        id: "health", label: "Health score", description: "0–100 blend of sales density, occupancy cost, trend and lease runway.", field: "health", ramp: "diverging",
        lo: 25, hi: 85, format: fmtScore, excelFormat: "0", loCaption: "At risk", hiCaption: "Thriving",
    },
    {
        id: "actions", label: "Actions", description: "Follow-ups your team has opened, is working on, or has finished.", field: null, ramp: "categorical",
        lo: null, hi: null, format: () => "", excelFormat: "",
    },
];

export const LENS_BY_ID: Record<LensId, Lens> = Object.fromEntries(LENSES.map((l) => [l.id, l])) as Record<LensId, Lens>;
