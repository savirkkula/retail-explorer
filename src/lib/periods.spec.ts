import { describe, it, expect } from "vitest";
import { lastFullMonth, monthList, monthsInRange, monthsRange, rangeLabel, resolvePeriod, trendRange } from "@/lib/periods";

describe("periods", () => {
    it("treats a date key at month end as a full month", () => {
        expect(lastFullMonth(20260930)).toEqual([2026, 9]);
    });

    it("falls back to the previous month when the last month is partial", () => {
        expect(lastFullMonth(20260915)).toEqual([2026, 8]);
        expect(lastFullMonth(20260115)).toEqual([2025, 12]);
    });

    it("builds a trailing 12 month range aligned to month boundaries", () => {
        expect(resolvePeriod("ltm", 20260930)).toEqual({ start: "2025-10-01", end: "2026-09-30" });
    });

    it("builds year to date, quarter and month ranges", () => {
        expect(resolvePeriod("ytd", 20260930)).toEqual({ start: "2026-01-01", end: "2026-09-30" });
        expect(resolvePeriod("quarter", 20260930)).toEqual({ start: "2026-07-01", end: "2026-09-30" });
        expect(resolvePeriod("month", 20260930)).toEqual({ start: "2026-09-01", end: "2026-09-30" });
    });

    it("handles leap-year February", () => {
        expect(monthsRange([2024, 2], 1)).toEqual({ start: "2024-02-01", end: "2024-02-29" });
    });

    it("spans 24 months for trends", () => {
        const range = trendRange(20260930);
        expect(range).toEqual({ start: "2024-10-01", end: "2026-09-30" });
        expect(monthsInRange(range)).toBe(24);
    });

    it("lists month starts oldest first", () => {
        expect(monthList({ start: "2025-11-01", end: "2026-02-28" })).toEqual(["2025-11-01", "2025-12-01", "2026-01-01", "2026-02-01"]);
    });

    it("labels a range", () => {
        expect(rangeLabel({ start: "2025-10-01", end: "2026-09-30" })).toContain("2025");
    });
});
