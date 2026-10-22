import { useMemo } from "react";
import { ChevronRight } from "lucide-react";
import { useMallData } from "@/hooks/use-mall-data";
import { useMallState } from "@/hooks/mall-state";
import { Section } from "@/components/query-visuals";
import { KpiTile } from "@/components/panels/kpi-tile";
import { ActionQueue } from "@/components/panels/action-queue";
import { VegaQuery } from "@/components/query-visuals";
import { fmtCompact, fmtInt, fmtPct, fmtYears } from "@/lib/format";
import { monthlySalesQuery } from "@/queries/portfolio/monthly-sales";
import { categoryMixPropertyQuery } from "@/queries/center/category-mix-property";
import { floorKpisQuery } from "@/queries/center/floor-kpis";
import { filterRows } from "@microsoft/fabric-visuals-core";
import { cn } from "@/lib/utils";

export function CenterPanel() {
    const { mall, propertyKpis, range, trend } = useMallData();
    const { propertyKey, selectFloor } = useMallState();
    const property = mall.find((p) => p.propertyKey === propertyKey);
    const kpis = propertyKpis.find((k) => k.propertyKey === propertyKey);

    const monthly = useMemo(() => (trend ? monthlySalesQuery({ range: trend, highlight: property?.propertyName }) : null), [trend, property?.propertyName]);
    const mix = useMemo(() => (range && propertyKey != null ? categoryMixPropertyQuery({ range, propertyKey }) : null), [range, propertyKey]);
    const floorKpis = useMemo(() => (range ? floorKpisQuery({ range }) : null), [range]);

    if (!property) return null;
    const retailFloors = property.floors.filter((f) => f.floorType === "Retail");

    return (
        <div className="flex flex-col gap-5">
            <header>
                <h2 className="font-heading text-hero-800 leading-hero-800">{property.propertyName}</h2>
                <p className="text-300 text-muted-foreground">
                    {property.district}, {property.city} · built {property.yearBuilt} · {property.floorsTotal} floors · {fmtInt(property.gla)} m² retail
                </p>
            </header>

            <div className="grid grid-cols-2 gap-3">
                <KpiTile label="Sales" value={fmtCompact(kpis?.sales, "€")} delta={kpis?.salesYoY} />
                <KpiTile label="Visitors" value={fmtCompact(kpis?.visitors)} delta={kpis?.visitorsYoY} />
                <KpiTile label="Sales / m² / yr" value={fmtCompact(kpis?.salesPerM2, "€")} />
                <KpiTile label="Occupancy" value={fmtPct(kpis?.occupancy, 1)} />
                <KpiTile label="Occupancy cost" value={fmtPct(kpis?.ocr, 1)} />
                <KpiTile label="WAULT" value={fmtYears(kpis?.wault)} />
            </div>

            <Section title="Levels">
                <ul className="flex flex-col gap-1">
                    {retailFloors
                        .slice()
                        .reverse()
                        .map((floor) => {
                            const unitCount = floor.units.length;
                            return (
                                <li key={floor.floorKey}>
                                    <button
                                        type="button"
                                        onClick={() => selectFloor(floor.floorKey)}
                                        className={cn(
                                            "flex w-full items-center justify-between rounded-xl border border-border bg-card px-3 py-2 text-left transition",
                                            "hover:border-signal focus-visible:outline-2 focus-visible:outline-ring",
                                        )}
                                    >
                                        <span>
                                            <span className="font-heading text-500">Level {floor.levelLabel}</span>
                                            <span className="ml-2 text-200 text-muted-foreground">{unitCount} units · {fmtInt(floor.gla)} m²</span>
                                        </span>
                                        <ChevronRight className="icon-size-200 text-muted-foreground" aria-hidden />
                                    </button>
                                </li>
                            );
                        })}
                </ul>
            </Section>

            <ActionQueue propertyKey={property.propertyKey} />

            {floorKpis && (
                <Section title="Sales per m² by level">
                    <VegaQuery
                        definition={floorKpis}
                        filter={(table) =>
                            filterRows(table, (row, cols) => row[cols.findIndex((c) => c.name === "PropertyKey")] === propertyKey)
                        }
                    />
                </Section>
            )}
            {mix && (
                <Section title="Sales by category">
                    <VegaQuery definition={mix} />
                </Section>
            )}
            {monthly && (
                <Section title="Monthly sales vs other centers">
                    <VegaQuery definition={monthly} />
                </Section>
            )}
        </div>
    );
}
