import { describe, it, expect } from "vitest";
import { mallReducer, type MallState } from "@/hooks/mall-state";

const start: MallState = { propertyKey: null, floorKey: null, unitKey: null, lensId: "category", periodId: "ltm" };

describe("mallReducer", () => {
    it("clears deeper selections when a shallower one changes", () => {
        const deep: MallState = { ...start, propertyKey: 1, floorKey: 3, unitKey: 9 };
        expect(mallReducer(deep, { type: "property", key: 2 })).toMatchObject({ propertyKey: 2, floorKey: null, unitKey: null });
        expect(mallReducer(deep, { type: "floor", key: 4 })).toMatchObject({ propertyKey: 1, floorKey: 4, unitKey: null });
    });

    it("goes back one level at a time", () => {
        let s: MallState = { ...start, propertyKey: 1, floorKey: 3, unitKey: 9 };
        s = mallReducer(s, { type: "back" });
        expect(s).toMatchObject({ propertyKey: 1, floorKey: 3, unitKey: null });
        s = mallReducer(s, { type: "back" });
        expect(s).toMatchObject({ propertyKey: 1, floorKey: null });
        s = mallReducer(s, { type: "back" });
        expect(s.propertyKey).toBeNull();
    });

    it("focuses a store with its center and level", () => {
        expect(mallReducer(start, { type: "focus", propertyKey: 2, floorKey: 5, unitKey: 11 })).toMatchObject({ propertyKey: 2, floorKey: 5, unitKey: 11 });
    });

    it("keeps the selection when the lens or period changes", () => {
        const s: MallState = { ...start, propertyKey: 1, floorKey: 3, unitKey: 9 };
        expect(mallReducer(s, { type: "lens", id: "ocr" })).toMatchObject({ lensId: "ocr", propertyKey: 1, floorKey: 3, unitKey: 9 });
        expect(mallReducer(s, { type: "period", id: "ytd" })).toMatchObject({ periodId: "ytd", unitKey: 9 });
    });
});
