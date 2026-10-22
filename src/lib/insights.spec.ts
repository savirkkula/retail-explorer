import { describe, it, expect } from "vitest";
import { deriveInsights } from "@/lib/insights";
import type { UnitKpis } from "@/queries/floorplan/unit-kpis";

const base: UnitKpis = {
    unitKey: 1, sales: 1_000_000, salesPerM2: 6000, salesYoY: 0.02, salesIndex: 1, ocr: 0.11, health: 60, tenant: "Aalto Label",
    leaseYears: 4, leaseExpiry: "2030-01-01T00:00:00", isVacant: 0, zoneVisitors: 600_000, salesPerVisitor: 1.2, rentVsErv: 0,
    baseRentPerM2: 40, totalRent: 100_000, vacancyPotential: 0,
};

describe("deriveInsights", () => {
    it("returns nothing for a store tracking its category", () => {
        expect(deriveInsights(base)).toEqual([]);
    });

    it("flags stretched occupancy cost", () => {
        const out = deriveInsights({ ...base, ocr: 0.179 });
        expect(out).toEqual([{ id: "ocr", tone: "warn", text: "Occupancy cost is 17.9%, above the 15% stress line.", action: "rent-review" }]);
    });

    it("flags a lease ending within a year", () => {
        const out = deriveInsights({ ...base, leaseYears: 0.42 });
        expect(out[0]).toEqual({ id: "lease-expiring", tone: "warn", text: "Lease expires in 5 months.", action: "renewal" });
    });

    it("flags weak and strong sales density", () => {
        expect(deriveInsights({ ...base, salesIndex: 0.7 })[0].tone).toBe("warn");
        expect(deriveInsights({ ...base, salesIndex: 1.3 })[0].tone).toBe("good");
    });

    it("flags under-market rent as information", () => {
        expect(deriveInsights({ ...base, rentVsErv: -0.14 })).toEqual([{ id: "rent-below-market", tone: "info", text: "Base rent is 14% below market rent.", action: "rent-review" }]);
    });

    it("suggests no action for positive flags", () => {
        const out = deriveInsights({ ...base, salesIndex: 1.3, salesYoY: 0.1 });
        expect(out.map((i) => i.id)).toEqual(["sales-strong", "sales-up"]);
        expect(out.every((i) => i.action === undefined)).toBe(true);
    });

    it("suggests marketing a vacant unit", () => {
        expect(deriveInsights({ ...base, isVacant: 1 })[0]).toMatchObject({ id: "vacant", action: "market-vacant" });
    });

    it("only reports leasing potential for vacant units", () => {
        expect(deriveInsights({ ...base, isVacant: 1, ocr: 0.3 })).toHaveLength(1);
    });
});
