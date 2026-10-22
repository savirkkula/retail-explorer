import { useMemo } from "react";
import { DataGrid } from "@microsoft/fabric-datagrid";
import type { GridColumnDef } from "@microsoft/fabric-datagrid";
import type { DataTable, InteractionEvent } from "@microsoft/fabric-visuals-core";
import { useThemeContext } from "@/hooks/theme.context";
import { useMallData } from "@/hooks/use-mall-data";
import { useMallState } from "@/hooks/mall-state";
import { useQueryRows } from "@/hooks/use-query-rows";
import { Section } from "@/components/query-visuals";
import { KpiTile } from "@/components/panels/kpi-tile";
import { Skeleton } from "@/components/states";
import { LENS_BY_ID } from "@/lib/lenses";
import { fmtCompact, fmtInt, fmtPct } from "@/lib/format";
import { floorKpisQuery } from "@/queries/center/floor-kpis";

interface FloorKpiRow {
    FloorKey: number;
    Sales: number | null;
    SalesPerM2: number | null;
    OCR: number | null;
    Occupancy: number | null;
    EnergyIntensity: number | null;
}

const GRID_COLUMNS: GridColumnDef[] = [
    { id: "unitKey", header: "Unit key", hidden: true },
    { id: "tenant", header: "Tenant", minWidth: 140 },
    { id: "category", header: "Category", minWidth: 120 },
    { id: "area", header: "m²", numericStyling: true },
    { id: "lens", header: "Lens", numericStyling: true },
];

export function FloorPanel() {
    const { theme } = useThemeContext();
    const { mall, range, kpiByUnit } = useMallData();
    const { propertyKey, floorKey, lensId, selectUnit, selectFloor } = useMallState();
    const lens = LENS_BY_ID[lensId];

    const property = mall.find((p) => p.propertyKey === propertyKey);
    const floor = property?.floors.find((f) => f.floorKey === floorKey);

    const floorKpisDef = useMemo(() => (range ? floorKpisQuery({ range }) : null), [range]);
    const floorKpis = useQueryRows<FloorKpiRow>(floorKpisDef);
    const kpi = floorKpis.rows?.find((r) => r.FloorKey === floorKey);

    const table = useMemo<DataTable | null>(() => {
        if (!floor) return null;
        const rows = floor.units.map((u) => {
            const k = kpiByUnit.get(u.unitKey);
            const vacant = !k || k.isVacant === 1;
            const lensValue = lens.field && k && !vacant ? k[lens.field] : null;
            return [u.unitKey, vacant ? "Vacant" : (k.tenant ?? u.unitCode), u.category, u.area, lensValue];
        });
        return {
            columns: [
                { name: "unitKey", displayName: "Unit key" },
                { name: "tenant", displayName: "Tenant" },
                { name: "category", displayName: "Category" },
                { name: "area", displayName: "m²", format: "#,##0" },
                { name: "lens", displayName: lens.field ? lens.label : "–", format: lens.excelFormat || undefined },
            ],
            rows,
        };
    }, [floor, kpiByUnit, lens]);

    if (!property || !floor) return null;

    const onInteraction = (events: InteractionEvent[]) => {
        for (const event of events) {
            if (event.action !== "select") continue;
            const predicate = event.selections[0]?.predicates.find((p) => p.name === "unitKey");
            if (predicate && predicate.type === "set") selectUnit(Number(predicate.values[0]));
        }
    };

    return (
        <div className="flex flex-col gap-5">
            <header>
                <button type="button" onClick={() => selectFloor(null)} className="text-200 text-muted-foreground underline-offset-2 hover:underline">
                    ← {property.propertyName}
                </button>
                <h2 className="font-heading text-hero-800 leading-hero-800">Level {floor.levelLabel}</h2>
                <p className="text-300 text-muted-foreground">
                    {floor.units.length} units · {fmtInt(floor.gla)} m²
                </p>
            </header>

            <div className="grid grid-cols-2 gap-3">
                <KpiTile label="Sales" value={fmtCompact(kpi?.Sales, "€")} />
                <KpiTile label="Sales / m² / yr" value={fmtCompact(kpi?.SalesPerM2, "€")} />
                <KpiTile label="Occupancy" value={fmtPct(kpi?.Occupancy, 1)} />
                <KpiTile label="Occupancy cost" value={fmtPct(kpi?.OCR, 1)} />
            </div>

            <Section title="Stores">
                {table ? (
                    <div className="h-96">
                        <DataGrid
                            data={table}
                            columns={GRID_COLUMNS.map((c) => (c.id === "lens" ? { ...c, header: lens.field ? lens.label : "–", hidden: !lens.field } : c))}
                            theme={theme}
                            onInteraction={onInteraction}
                            defaultSort={[{ columnId: "area", direction: "desc" }]}
                        />
                    </div>
                ) : (
                    <Skeleton className="h-48" />
                )}
            </Section>
        </div>
    );
}
