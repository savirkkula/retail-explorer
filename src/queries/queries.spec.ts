import { describe, it, expect } from "vitest";
import { dateExpr, fill, rangeTokens } from "@/queries/helpers";
import { unitKpisQuery } from "@/queries/floorplan/unit-kpis";
import { unitTrendQuery } from "@/queries/store/unit-trend";
import { zoneHeatmapQuery } from "@/queries/store/zone-heatmap";
import { monthlySalesQuery } from "@/queries/portfolio/monthly-sales";
import { categoryMixPropertyQuery } from "@/queries/center/category-mix-property";
import { leaseHistoryQuery } from "@/queries/store/lease-history";

const range = { start: "2025-10-01", end: "2026-09-30" };

describe("query helpers", () => {
    it("renders DAX date literals", () => {
        expect(dateExpr("2026-09-30")).toBe("DATE(2026, 9, 30)");
    });

    it("fills tokens and rejects missing ones", () => {
        expect(fill("a __X__ b", { X: 5 })).toBe("a 5 b");
        expect(() => fill("__MISSING__", {})).toThrow("Missing DAX token __MISSING__");
        expect(rangeTokens(range)).toEqual({ START: "DATE(2025, 10, 1)", END: "DATE(2026, 9, 30)" });
    });
});

describe("query factories", () => {
    it("filters the unit KPI query to the period", () => {
        const q = unitKpisQuery({ range });
        expect(q.query).toContain("'Date'[Date] >= DATE(2025, 10, 1) && 'Date'[Date] <= DATE(2026, 9, 30)");
        expect(q.query).not.toMatch(/__[A-Z]+__/);
        expect(Object.keys(q.columnMetadata)).toContain("[Health]");
    });

    it("scopes store queries to one unit or zone", () => {
        expect(unitTrendQuery({ range, unitKey: 50 }).query).toContain("TREATAS({ 50 }, Unit[Unit Key])");
        expect(zoneHeatmapQuery({ range, zoneKey: 3 }).query).toContain("TREATAS({ 3 }, Zone[Zone Key])");
        expect(leaseHistoryQuery({ unitKey: 7 }).query).toContain("Lease[Unit Key] = 7");
        expect(categoryMixPropertyQuery({ range, propertyKey: 2 }).query).toContain("TREATAS({ 2 }, 'Property'[Property Key])");
    });

    it("emphasises only the requested center in the monthly chart", () => {
        const plain = monthlySalesQuery({ range });
        const highlighted = monthlySalesQuery({ range, highlight: "Forum" });
        expect(JSON.stringify(plain.vegaLiteSpec)).not.toContain("opacity");
        expect(JSON.stringify(highlighted.vegaLiteSpec)).toContain("datum.Property === 'Forum'");
    });

    it("never reuses raw DAX names as Vega field aliases", () => {
        const q = unitTrendQuery({ range, unitKey: 1 });
        for (const def of Object.values(q.columnMetadata)) expect(def.name).toMatch(/^[A-Za-z][A-Za-z0-9]*$/);
    });
});
