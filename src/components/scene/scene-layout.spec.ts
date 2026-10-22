import { describe, it, expect } from "vitest";
import { cameraPose, floorGap, floorTarget, propertyX, sceneMode } from "./scene-layout";

describe("scene layout", () => {
    it("derives the mode from the selection", () => {
        expect(sceneMode(null, null)).toBe("portfolio");
        expect(sceneMode(1, null)).toBe("center");
        expect(sceneMode(1, 4)).toBe("floor");
    });

    it("centres properties around the origin", () => {
        expect(propertyX(1, 3)).toBe(0);
        expect(propertyX(0, 3)).toBe(-propertyX(2, 3));
    });

    it("spreads floors further apart as the user zooms in", () => {
        expect(floorGap("portfolio")).toBeLessThan(floorGap("center"));
        expect(floorGap("center")).toBeLessThan(floorGap("floor"));
    });

    it("hides floors above the selected one and dims those below", () => {
        const args = { mode: "floor" as const, selectedIndex: 2, isGhost: false, propertyActive: true };
        expect(floorTarget({ ...args, index: 3 })).toMatchObject({ opacity: 0, interactive: false });
        expect(floorTarget({ ...args, index: 1 })).toMatchObject({ opacity: 0.3, interactive: false });
        expect(floorTarget({ ...args, index: 2 })).toEqual({ y: 2 * floorGap("floor"), opacity: 1, interactive: true });
    });

    it("fades out other properties and keeps ghost floors non-interactive", () => {
        expect(floorTarget({ mode: "center", index: 0, selectedIndex: -1, isGhost: false, propertyActive: false })).toMatchObject({ opacity: 0, interactive: false });
        expect(floorTarget({ mode: "portfolio", index: 0, selectedIndex: -1, isGhost: true, propertyActive: true })).toMatchObject({ opacity: 0.22, interactive: false });
    });

    it("pulls the portfolio camera back on narrow viewports", () => {
        const wide = cameraPose({ mode: "portfolio", propertyX: 0, floorCount: 5, selectedY: 0, propertyCount: 3, aspect: 2 });
        const narrow = cameraPose({ mode: "portfolio", propertyX: 0, floorCount: 5, selectedY: 0, propertyCount: 3, aspect: 0.8 });
        expect(narrow.position[2]).toBeGreaterThan(wide.position[2]);
    });

    it("looks down at the selected floor in floor mode", () => {
        const pose = cameraPose({ mode: "floor", propertyX: 11.5, floorCount: 5, selectedY: 3, propertyCount: 3, aspect: 1.3 });
        expect(pose.target[0]).toBe(11.5);
        expect(pose.target[1]).toBe(3);
        expect(pose.position[1]).toBeGreaterThan(pose.target[1]);
    });
});
