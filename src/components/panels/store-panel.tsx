import { useMemo } from "react";
import { X } from "lucide-react";
import { useMallData } from "@/hooks/use-mall-data";
import { useMallState } from "@/hooks/mall-state";
import { GridQuery, Section, VegaQuery } from "@/components/query-visuals";
import { KpiTile } from "@/components/panels/kpi-tile";
import { StoreActions } from "@/components/panels/store-actions";
import { findUnit } from "@/lib/mall-model";
import { deriveInsights } from "@/lib/insights";
import { fmtCompact, fmtDate, fmtInt, fmtPct, fmtScore } from "@/lib/format";
import { resolvePeriod } from "@/lib/periods";
import { cn } from "@/lib/utils";
import { leaseHistoryQuery } from "@/queries/store/lease-history";
import { rentStackQuery } from "@/queries/store/rent-stack";
import { unitTrendQuery } from "@/queries/store/unit-trend";
import { zoneHeatmapQuery } from "@/queries/store/zone-heatmap";

function HealthDial({ score }: { score: number | null }) {
    const value = score == null ? 0 : Math.max(0, Math.min(100, score));
    const radius = 44;
    const arc = Math.PI * radius;
    const tone = score == null ? "stroke-muted-foreground" : value < 40 ? "stroke-destructive" : value < 60 ? "stroke-signal" : "stroke-success";
    return (
        <figure className="flex flex-col items-center" aria-label={`Health score ${fmtScore(score)} out of 100`}>
            <svg viewBox="0 0 100 56" className="w-32" role="img" aria-hidden>
                <path d="M 6 50 A 44 44 0 0 1 94 50" fill="none" className="stroke-muted" strokeWidth={9} strokeLinecap="round" />
                <path
                    d="M 6 50 A 44 44 0 0 1 94 50"
                    fill="none"
                    className={cn("transition-[stroke-dashoffset] duration-700", tone)}
                    strokeWidth={9}
                    strokeLinecap="round"
                    strokeDasharray={arc}
                    strokeDashoffset={arc * (1 - value / 100)}
                />
            </svg>
            <figcaption className="-mt-6 text-center">
                <div className="tabular font-heading text-hero-800 leading-hero-800">{fmtScore(score)}</div>
                <div className="text-200 text-muted-foreground">Health score</div>
            </figcaption>
        </figure>
    );
}

export function StorePanel() {
    const { mall, kpiByUnit, range, trend, maxDateKey } = useMallData();
    const { unitKey, selectUnit } = useMallState();
    const found = findUnit(mall, unitKey);
    const kpi = unitKey != null ? kpiByUnit.get(unitKey) : undefined;

    const trendDef = useMemo(() => (trend && unitKey != null ? unitTrendQuery({ range: trend, unitKey }) : null), [trend, unitKey]);
    const ltm = useMemo(() => (maxDateKey ? resolvePeriod("ltm", maxDateKey) : undefined), [maxDateKey]);
    const rentDef = useMemo(() => (ltm && unitKey != null ? rentStackQuery({ range: ltm, unitKey }) : null), [ltm, unitKey]);
    const heatDef = useMemo(() => (range && found ? zoneHeatmapQuery({ range, zoneKey: found.unit.zoneKey }) : null), [range, found]);
    const leaseDef = useMemo(() => (unitKey != null ? leaseHistoryQuery({ unitKey }) : null), [unitKey]);

    if (!found || !kpi) return null;
    const { unit, floor, property } = found;
    const vacant = kpi.isVacant === 1;
    const insights = deriveInsights(kpi);

    return (
        <div className="flex flex-col gap-5">
            <header className="flex items-start justify-between gap-3">
                <div>
                    <p className="text-200 text-muted-foreground">
                        {property.propertyName} · Level {floor.levelLabel} · {unit.unitCode}
                    </p>
                    <h2 className="font-heading text-hero-800 leading-hero-800">{vacant ? "Vacant unit" : kpi.tenant}</h2>
                    <p className="text-300 text-muted-foreground">
                        {unit.category} · {fmtInt(unit.area)} m²
                    </p>
                </div>
                <button
                    type="button"
                    onClick={() => selectUnit(null)}
                    aria-label="Close store"
                    className="rounded-full border border-border p-2 text-muted-foreground hover:border-signal hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
                >
                    <X className="icon-size-200" aria-hidden />
                </button>
            </header>

            {!vacant && (
                <div className="flex items-center gap-4">
                    <HealthDial score={kpi.health} />
                    <ul className="flex flex-1 flex-col gap-1.5">
                        {insights.length === 0 && <li className="text-200 text-muted-foreground">No flags: this store is tracking its category.</li>}
                        {insights.map((i) => (
                            <li
                                key={i.id}
                                className={cn(
                                    "rounded-lg border px-2.5 py-1.5 text-200",
                                    i.tone === "warn" && "border-signal/60 bg-signal/10",
                                    i.tone === "good" && "border-success/60 bg-success/10",
                                    i.tone === "info" && "border-border bg-muted",
                                )}
                            >
                                {i.text}
                            </li>
                        ))}
                    </ul>
                </div>
            )}
            {vacant && (
                <ul className="flex flex-col gap-1.5">
                    {insights.map((i) => (
                        <li key={i.id} className="rounded-lg border border-border bg-muted px-2.5 py-1.5 text-200">
                            {i.text}
                        </li>
                    ))}
                </ul>
            )}

            <Section title="Actions">
                <StoreActions
                    target={{ unitKey: unit.unitKey, propertyKey: property.propertyKey, unitCode: unit.unitCode, storeName: vacant ? "Vacant" : (kpi.tenant ?? unit.unitCode) }}
                    insights={insights}
                />
            </Section>

            <div className="grid grid-cols-2 gap-3">
                <KpiTile label="Sales / m² / yr" value={vacant ? "–" : fmtCompact(kpi.salesPerM2, "€")} delta={kpi.salesYoY} />
                <KpiTile label="Occupancy cost" value={vacant ? "–" : fmtPct(kpi.ocr, 1)} />
                <KpiTile label="Base rent vs market" value={vacant ? "–" : fmtPct(kpi.rentVsErv, 1, true)} />
                <KpiTile label="Lease expiry" value={vacant ? "–" : fmtDate(kpi.leaseExpiry)} />
                <KpiTile label="Visitors in zone" value={fmtCompact(kpi.zoneVisitors)} />
                <KpiTile label="Vacancy potential" value={vacant ? fmtCompact(kpi.vacancyPotential, "€") : "–"} />
            </div>

            {!vacant && trendDef && (
                <Section title="Sales per m² vs category">
                    <VegaQuery definition={trendDef} />
                </Section>
            )}
            {!vacant && rentDef && (
                <Section title="Occupancy cost, last 12 months">
                    <VegaQuery definition={rentDef} />
                </Section>
            )}
            {heatDef && (
                <Section title="Zone footfall by weekday and hour">
                    <VegaQuery definition={heatDef} />
                </Section>
            )}
            {leaseDef && (
                <Section title="Lease history">
                    <GridQuery definition={leaseDef} />
                </Section>
            )}
        </div>
    );
}
