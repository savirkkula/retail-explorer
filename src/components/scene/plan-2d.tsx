import type { Colorizer, Palette } from "@/lib/color-scales";
import type { PropertyModel } from "@/lib/mall-model";
import { useMallState } from "@/hooks/mall-state";
import type { UnitKpis } from "@/queries/floorplan/unit-kpis";
import { PLAN_HEIGHT, PLAN_WIDTH } from "@/lib/geometry";

interface Plan2DProps {
    mall: PropertyModel[];
    kpiByUnit: Map<number, UnitKpis>;
    colorizer: Colorizer;
    palette: Palette;
}

const toPath = (points: [number, number][]) => points.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x} ${y}`).join(" ") + " Z";

/** Flat SVG plan of one level; used when WebGL is unavailable. */
export function Plan2D({ mall, kpiByUnit, colorizer, palette }: Plan2DProps) {
    const { propertyKey, floorKey, unitKey, selectUnit, selectFloor } = useMallState();
    const property = mall.find((p) => p.propertyKey === propertyKey) ?? mall[0];
    const retail = property?.floors.filter((f) => f.floorType === "Retail") ?? [];
    const floor = retail.find((f) => f.floorKey === floorKey) ?? retail[0];
    if (!property || !floor) return null;

    return (
        <div className="flex size-full flex-col items-center justify-center gap-3 p-6 pt-24">
            <p className="text-200 text-muted-foreground">
                3D view needs WebGL. Showing the {property.propertyName} level {floor.levelLabel} plan.
            </p>
            <div className="flex gap-1.5">
                {retail.map((f) => (
                    <button
                        key={f.floorKey}
                        type="button"
                        onClick={() => selectFloor(f.floorKey)}
                        aria-pressed={f.floorKey === floor.floorKey}
                        className="rounded-full border border-border bg-card px-3 py-1 text-200 aria-pressed:border-primary aria-pressed:bg-primary aria-pressed:text-primary-foreground"
                    >
                        {f.levelLabel}
                    </button>
                ))}
            </div>
            <svg viewBox={`0 0 ${PLAN_WIDTH} ${PLAN_HEIGHT}`} className="max-h-full w-full max-w-4xl" role="group" aria-label="Floor plan">
                <path d={toPath(floor.outline)} fill={palette.slab} stroke={palette.slabEdge} />
                {floor.atria.map((a, i) => (
                    <path key={i} d={toPath(a)} fill={palette.background} stroke={palette.slabEdge} />
                ))}
                {floor.units.map((u) => {
                    const kpi = kpiByUnit.get(u.unitKey);
                    const vacant = !kpi || kpi.isVacant === 1;
                    return (
                        <path
                            key={u.unitKey}
                            d={toPath(u.points)}
                            fill={vacant && !colorizer.colorsVacant ? palette.vacant : colorizer.colorOf(u.category, kpi, u.unitKey)}
                            stroke={u.unitKey === unitKey ? palette.signal : palette.slabEdge}
                            strokeWidth={u.unitKey === unitKey ? 4 : 1}
                            className="cursor-pointer"
                            tabIndex={0}
                            role="button"
                            aria-label={`${vacant ? "Vacant" : kpi.tenant} ${u.unitCode}`}
                            onClick={() => selectUnit(u.unitKey)}
                            onKeyDown={(e) => {
                                if (e.key === "Enter" || e.key === " ") selectUnit(u.unitKey);
                            }}
                        />
                    );
                })}
            </svg>
        </div>
    );
}
