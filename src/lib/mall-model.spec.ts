import { describe, it, expect } from "vitest";
import { buildMall, findUnit } from "@/lib/mall-model";
import type { FloorRow, PropertyRow, ShapeRow, UnitRow } from "@/queries/floorplan/geometry";

const property: PropertyRow = { propertyKey: 1, propertyName: "Forum", city: "Helsinki", district: "Kamppi", retailFloors: 2, floorsTotal: 3, yearBuilt: 1983, gla: 4000 };
const floors: FloorRow[] = [
    { floorKey: 2, propertyKey: 1, levelNumber: 2, levelLabel: "2", floorType: "Retail", sortOrder: 1, gla: 2000 },
    { floorKey: 1, propertyKey: 1, levelNumber: 1, levelLabel: "1", floorType: "Retail", sortOrder: 0, gla: 2000 },
    { floorKey: 3, propertyKey: 2, levelNumber: 1, levelLabel: "1", floorType: "Retail", sortOrder: 0, gla: 1 },
];
const shapes: ShapeRow[] = [
    { shapeKey: 1, floorKey: 1, shapeType: "outline", shapeName: "Outline", points: "0,0 10,0 10,10 0,10" },
    { shapeKey: 2, floorKey: 1, shapeType: "atrium", shapeName: "Atrium 1", points: "2,2 4,2 4,4 2,4" },
];
const unit = (unitKey: number, floorKey: number): UnitRow => ({
    unitKey, propertyKey: 1, floorKey, zoneKey: 1, unitCode: `U${unitKey}`, area: 100, category: "Fashion", unitType: "Store", isAnchor: false,
    erv: 40, cx: 5, cy: 5, polygon: "1,1 2,1 2,2 1,2",
});

describe("buildMall", () => {
    const mall = buildMall([property], floors, shapes, [unit(1, 1), unit(2, 2)], []);

    it("orders a property's floors bottom to top and ignores other properties' floors", () => {
        expect(mall[0].floors.map((f) => f.levelLabel)).toEqual(["1", "2"]);
    });

    it("attaches shapes and parsed unit polygons to their floors", () => {
        const level1 = mall[0].floors[0];
        expect(level1.outline).toHaveLength(4);
        expect(level1.atria).toHaveLength(1);
        expect(level1.units[0].points[2]).toEqual([2, 2]);
        expect(mall[0].floors[1].outline).toEqual([]);
    });

    it("finds a unit with its floor and property", () => {
        const found = findUnit(mall, 2);
        expect(found?.floor.levelLabel).toBe("2");
        expect(found?.property.propertyName).toBe("Forum");
        expect(findUnit(mall, 99)).toBeUndefined();
        expect(findUnit(mall, null)).toBeUndefined();
    });
});
