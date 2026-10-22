import { createContext, useContext, useMemo, type ReactNode } from "react";
import { useMallState } from "@/hooks/mall-state";
import { useQueryRows } from "@/hooks/use-query-rows";
import { buildMall, type PropertyModel } from "@/lib/mall-model";
import { resolvePeriod, trendRange } from "@/lib/periods";
import { dataBoundsQuery, type DataBounds } from "@/queries/shell/data-bounds";
import { floorsQuery, propertiesQuery, shapesQuery, unitsQuery, type FloorRow, type PropertyRow, type ShapeRow, type UnitRow } from "@/queries/floorplan/geometry";
import { unitKpisQuery, type UnitKpis } from "@/queries/floorplan/unit-kpis";
import { portfolioKpisQuery, propertyKpisQuery, type KpiSet, type PropertyKpis } from "@/queries/portfolio/property-kpis";
import type { DateRange } from "@/queries/helpers";

export interface MallData {
    ready: boolean;
    error: Error | undefined;
    maxDateKey: number | undefined;
    range: DateRange | undefined;
    trend: DateRange | undefined;
    /** Geometry only; stable across period changes. */
    mall: PropertyModel[];
    kpiList: UnitKpis[];
    kpiByUnit: Map<number, UnitKpis>;
    kpisLoading: boolean;
    propertyKpis: PropertyKpis[];
    portfolioKpis: KpiSet | undefined;
}

const MallDataContext = createContext<MallData | undefined>(undefined);

const geometryDefinitions = {
    properties: propertiesQuery(),
    floors: floorsQuery(),
    shapes: shapesQuery(),
    units: unitsQuery(),
    bounds: dataBoundsQuery(),
};

export function MallDataProvider({ children }: { children: ReactNode }) {
    const { periodId } = useMallState();

    const properties = useQueryRows<PropertyRow>(geometryDefinitions.properties);
    const floors = useQueryRows<FloorRow>(geometryDefinitions.floors);
    const shapes = useQueryRows<ShapeRow>(geometryDefinitions.shapes);
    const units = useQueryRows<UnitRow>(geometryDefinitions.units);
    const bounds = useQueryRows<DataBounds>(geometryDefinitions.bounds);

    const maxDateKey = bounds.rows?.[0]?.maxDateKey ?? undefined;
    const range = useMemo(() => (maxDateKey ? resolvePeriod(periodId, maxDateKey) : undefined), [maxDateKey, periodId]);
    const trend = useMemo(() => (maxDateKey ? trendRange(maxDateKey) : undefined), [maxDateKey]);

    const unitKpisDef = useMemo(() => (range ? unitKpisQuery({ range }) : null), [range]);
    const propertyKpisDef = useMemo(() => (range ? propertyKpisQuery({ range }) : null), [range]);
    const portfolioKpisDef = useMemo(() => (range ? portfolioKpisQuery({ range }) : null), [range]);
    const unitKpis = useQueryRows<UnitKpis>(unitKpisDef);
    const propertyKpis = useQueryRows<PropertyKpis>(propertyKpisDef);
    const portfolioKpis = useQueryRows<KpiSet>(portfolioKpisDef);

    const mall = useMemo(
        () => (properties.rows && floors.rows && shapes.rows && units.rows ? buildMall(properties.rows, floors.rows, shapes.rows, units.rows, []) : []),
        [properties.rows, floors.rows, shapes.rows, units.rows],
    );
    const kpiList = useMemo(() => (unitKpis.rows ?? []).filter((k) => k.unitKey != null), [unitKpis.rows]);
    const kpiByUnit = useMemo(() => new Map(kpiList.map((k) => [k.unitKey, k])), [kpiList]);

    const error = properties.error ?? floors.error ?? shapes.error ?? units.error ?? bounds.error ?? unitKpis.error ?? propertyKpis.error ?? portfolioKpis.error;

    const value = useMemo<MallData>(
        () => ({
            ready: mall.length > 0 && kpiList.length > 0,
            error,
            maxDateKey,
            range,
            trend,
            mall,
            kpiList,
            kpiByUnit,
            kpisLoading: unitKpis.isLoading,
            propertyKpis: propertyKpis.rows ?? [],
            portfolioKpis: portfolioKpis.rows?.[0],
        }),
        [mall, kpiList, kpiByUnit, error, maxDateKey, range, trend, unitKpis.isLoading, propertyKpis.rows, portfolioKpis.rows],
    );
    return <MallDataContext.Provider value={value}>{children}</MallDataContext.Provider>;
}

export function useMallData(): MallData {
    const ctx = useContext(MallDataContext);
    if (!ctx) throw new Error("useMallData must be used within MallDataProvider");
    return ctx;
}
