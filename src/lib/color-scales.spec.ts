import { describe, it, expect } from "vitest";
import { createColorizer, type Palette } from "@/lib/color-scales";
import { LENS_BY_ID } from "@/lib/lenses";
import type { UnitKpis } from "@/queries/floorplan/unit-kpis";

const palette: Palette = {
    data: ["#111111", "#222222", "#333333", "#444444", "#555555", "#666666", "#777777", "#888888", "#999999", "#aaaaaa"],
    seq: ["#000000", "#404040", "#808080", "#c0c0c0", "#ffffff"],
    div: ["#ff0000", "#ff8080", "#ffffff", "#80ff80", "#00ff00"],
    vacant: "#cccccc",
    slab: "#dddddd",
    slabEdge: "#bbbbbb",
    background: "#ffffff",
    foreground: "#000000",
    signal: "#ff5500",
};

const kpi = (overrides: Partial<UnitKpis>): UnitKpis => ({
    unitKey: 1, sales: 1, salesPerM2: 5000, salesYoY: 0, salesIndex: 1, ocr: 0.13, health: 55, tenant: "T", leaseYears: 3,
    leaseExpiry: null, isVacant: 0, zoneVisitors: 100, salesPerVisitor: 1, rentVsErv: 0, baseRentPerM2: 1, totalRent: 1, vacancyPotential: 0,
    ...overrides,
});

describe("createColorizer", () => {
    it("colors categories from the data palette and lists them in the legend", () => {
        const c = createColorizer(LENS_BY_ID.category, [], ["Fashion", "Grocery"], palette);
        expect(c.colorOf("Fashion", undefined)).toBe("#111111");
        expect(c.colorOf("Grocery", undefined)).toBe("#444444");
        expect(c.legend.kind).toBe("categories");
        expect(c.legend.categories.map((x) => x.label)).toEqual(["Fashion", "Grocery"]);
    });

    it("maps the occupancy cost lens with the stretched end on the bad color", () => {
        const c = createColorizer(LENS_BY_ID.ocr, [], [], palette);
        const bad = c.colorOf("Fashion", kpi({ ocr: 0.2 }));
        const good = c.colorOf("Fashion", kpi({ ocr: 0.06 }));
        expect(bad).toBe("rgb(255, 0, 0)");
        expect(good).toBe("rgb(0, 255, 0)");
        expect(c.legend.loLabel).toBe("20.0%");
        expect(c.legend.hiLabel).toBe("6.0%");
    });

    it("derives sequential domains from the data and ignores vacant units", () => {
        const kpis = [1000, 2000, 3000, 4000, 5000].map((v, i) => kpi({ unitKey: i + 1, salesPerM2: v }));
        kpis.push(kpi({ unitKey: 99, salesPerM2: 999_999, isVacant: 1 }));
        const c = createColorizer(LENS_BY_ID.salesDensity, kpis, [], palette);
        expect(c.legend.kind).toBe("gradient");
        expect(c.legend.hiLabel).toBe("€4.8k");
    });

    it("colors vacant units by action status on the actions lens", () => {
        const c = createColorizer(LENS_BY_ID.actions, [], [], palette, new Map([[7, "open"], [8, "done"]]));
        expect(c.colorsVacant).toBe(true);
        expect(c.colorOf("Fashion", undefined, 7)).toBe("#222222");
        expect(c.colorOf("Fashion", undefined, 8)).toBe("#00ff00");
        expect(c.colorOf("Fashion", undefined, 9)).toBe("#cccccc");
        expect(c.legend.categories.map((x) => x.label)).toEqual(["Open", "In progress", "Done", "No action"]);
    });

    it("uses the vacant color when a unit has no value", () => {
        const c = createColorizer(LENS_BY_ID.health, [], [], palette);
        expect(c.colorOf("Fashion", undefined)).toBe("#cccccc");
        expect(c.colorOf("Fashion", kpi({ health: null }))).toBe("#cccccc");
    });
});
