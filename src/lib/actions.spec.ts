import { describe, it, expect } from "vitest";
import { draftFromInsight, isOverdue, mapStatusByUnit, sortQueue, type StoreActionRecord } from "@/lib/actions";

const action = (o: Partial<StoreActionRecord>): StoreActionRecord => ({
    id: "a", unitKey: 1, propertyKey: 1, unitCode: "G-101", storeName: "Aalto Label", actionType: "renewal", status: "open", priority: "medium",
    title: "t", triggerText: "x", authorId: "u", authorEmail: "u@x.com", createdAt: new Date("2026-01-01"), updatedAt: new Date("2026-01-01"), ...o,
});

describe("draftFromInsight", () => {
    it("pre-fills title, priority and trigger from a flag", () => {
        const draft = draftFromInsight({ id: "lease-expiring", tone: "warn", text: "Lease expires in 5 months.", action: "renewal" }, "Aalto Label");
        expect(draft).toEqual({ actionType: "renewal", priority: "high", title: "Start lease renewal: Aalto Label", triggerText: "Lease expires in 5 months." });
    });

    it("uses medium priority for informational flags", () => {
        const draft = draftFromInsight({ id: "vacant", tone: "info", text: "Vacant", action: "market-vacant" }, "G-101");
        expect(draft?.priority).toBe("medium");
    });

    it("returns nothing for flags without a follow-up", () => {
        expect(draftFromInsight({ id: "sales-up", tone: "good", text: "Up" }, "Aalto")).toBeUndefined();
    });
});

describe("mapStatusByUnit", () => {
    it("keeps the most pressing status per unit and ignores declined work", () => {
        const map = mapStatusByUnit([
            action({ unitKey: 1, status: "done" }),
            action({ unitKey: 1, status: "in-progress" }),
            action({ unitKey: 2, status: "declined" }),
            action({ unitKey: 3, status: "done" }),
            action({ unitKey: 3, status: "open" }),
        ]);
        expect(map.get(1)).toBe("in-progress");
        expect(map.has(2)).toBe(false);
        expect(map.get(3)).toBe("open");
    });
});

describe("queue ordering", () => {
    it("puts the earliest due date first and undated actions last", () => {
        const sorted = sortQueue([
            action({ id: "none", dueDate: undefined }),
            action({ id: "late", dueDate: new Date("2026-09-01") }),
            action({ id: "soon", dueDate: new Date("2026-03-01") }),
        ]);
        expect(sorted.map((a) => a.id)).toEqual(["soon", "late", "none"]);
    });

    it("flags only active actions past their due date as overdue", () => {
        const now = new Date("2026-06-01");
        expect(isOverdue(action({ dueDate: new Date("2026-05-01") }), now)).toBe(true);
        expect(isOverdue(action({ dueDate: new Date("2026-05-01"), status: "done" }), now)).toBe(false);
        expect(isOverdue(action({ dueDate: new Date("2026-07-01") }), now)).toBe(false);
        expect(isOverdue(action({ dueDate: undefined }), now)).toBe(false);
    });
});
