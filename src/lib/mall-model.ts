import { boundsOf, parsePoints, type Point } from "@/lib/geometry";
import type { FloorRow, PropertyRow, ShapeRow, UnitRow } from "@/queries/floorplan/geometry";
import type { UnitKpis } from "@/queries/floorplan/unit-kpis";

export interface UnitModel extends UnitRow {
    points: Point[];
    kpi?: UnitKpis;
}

export interface FloorModel extends FloorRow {
    outline: Point[];
    atria: Point[][];
    concourse: Point[][];
    entrances: Point[][];
    units: UnitModel[];
}

export interface PropertyModel extends PropertyRow {
    /** Floors ordered bottom to top. */
    floors: FloorModel[];
}

export function buildMall(
    properties: PropertyRow[],
    floors: FloorRow[],
    shapes: ShapeRow[],
    units: UnitRow[],
    kpis: UnitKpis[],
): PropertyModel[] {
    const kpiByUnit = new Map(kpis.filter((k) => k.unitKey != null).map((k) => [k.unitKey, k]));
    const unitsByFloor = new Map<number, UnitModel[]>();
    for (const u of units) {
        const list = unitsByFloor.get(u.floorKey) ?? [];
        list.push({ ...u, points: parsePoints(u.polygon), kpi: kpiByUnit.get(u.unitKey) });
        unitsByFloor.set(u.floorKey, list);
    }
    const shapesByFloor = new Map<number, ShapeRow[]>();
    for (const s of shapes) {
        const list = shapesByFloor.get(s.floorKey) ?? [];
        list.push(s);
        shapesByFloor.set(s.floorKey, list);
    }

    return properties.map((p) => ({
        ...p,
        floors: floors
            .filter((f) => f.propertyKey === p.propertyKey)
            .sort((a, b) => a.sortOrder - b.sortOrder)
            .map((f) => {
                const fs = shapesByFloor.get(f.floorKey) ?? [];
                const pick = (type: ShapeRow["shapeType"]) => fs.filter((s) => s.shapeType === type).map((s) => parsePoints(s.points));
                return {
                    ...f,
                    outline: pick("outline")[0] ?? [],
                    atria: pick("atrium"),
                    concourse: pick("concourse"),
                    entrances: pick("entrance"),
                    units: unitsByFloor.get(f.floorKey) ?? [],
                };
            }),
    }));
}

export function findUnit(mall: PropertyModel[], unitKey: number | null): { unit: UnitModel; floor: FloorModel; property: PropertyModel } | undefined {
    if (unitKey == null) return undefined;
    for (const property of mall) {
        for (const floor of property.floors) {
            const unit = floor.units.find((u) => u.unitKey === unitKey);
            if (unit) return { unit, floor, property };
        }
    }
    return undefined;
}

export function floorBounds(floor: FloorModel) {
    return boundsOf(floor.outline);
}
