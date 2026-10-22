import type { UnitKpis } from "@/queries/floorplan/unit-kpis";
import { fmtPct } from "@/lib/format";
import type { ActionType } from "@/lib/actions";

export type InsightId = "vacant" | "ocr" | "lease-expiring" | "lease-runway" | "sales-weak" | "sales-strong" | "sales-down" | "sales-up" | "rent-below-market";

export interface Insight {
    id: InsightId;
    tone: "warn" | "good" | "info";
    text: string;
    /** The follow-up this flag usually calls for; absent when no action is needed. */
    action?: ActionType;
}

/** Plain-language flags derived from a store's KPI values. */
export function deriveInsights(kpi: UnitKpis): Insight[] {
    const out: Insight[] = [];
    if (kpi.isVacant === 1) {
        out.push({ id: "vacant", tone: "info", text: "Vacant: market rent potential is open for leasing.", action: "market-vacant" });
        return out;
    }
    if (kpi.ocr != null && kpi.ocr > 0.15) {
        out.push({ id: "ocr", tone: "warn", text: `Occupancy cost is ${fmtPct(kpi.ocr)}, above the 15% stress line.`, action: "rent-review" });
    }
    if (kpi.leaseYears != null) {
        const months = Math.round(kpi.leaseYears * 12);
        if (months <= 12) out.push({ id: "lease-expiring", tone: "warn", text: `Lease expires in ${months} month${months === 1 ? "" : "s"}.`, action: "renewal" });
        else if (months <= 24) out.push({ id: "lease-runway", tone: "info", text: `Lease runway is ${(kpi.leaseYears).toFixed(1)} years.` });
    }
    if (kpi.salesIndex != null && kpi.salesIndex < 0.85) {
        out.push({ id: "sales-weak", tone: "warn", text: `Sales density is ${fmtPct(1 - kpi.salesIndex, 0)} below its category average.`, action: "performance-review" });
    } else if (kpi.salesIndex != null && kpi.salesIndex > 1.15) {
        out.push({ id: "sales-strong", tone: "good", text: `Sales density is ${fmtPct(kpi.salesIndex - 1, 0)} above its category average.` });
    }
    if (kpi.salesYoY != null && kpi.salesYoY <= -0.08) {
        out.push({ id: "sales-down", tone: "warn", text: `Sales are down ${fmtPct(-kpi.salesYoY, 0)} year on year.`, action: "performance-review" });
    } else if (kpi.salesYoY != null && kpi.salesYoY >= 0.08) {
        out.push({ id: "sales-up", tone: "good", text: `Sales are up ${fmtPct(kpi.salesYoY, 0)} year on year.` });
    }
    if (kpi.rentVsErv != null && kpi.rentVsErv <= -0.1) {
        out.push({ id: "rent-below-market", tone: "info", text: `Base rent is ${fmtPct(-kpi.rentVsErv, 0)} below market rent.`, action: "rent-review" });
    }
    return out;
}
