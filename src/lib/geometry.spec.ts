import { describe, it, expect } from "vitest";
import { boundsOf, parsePoints } from "@/lib/geometry";

describe("geometry", () => {
    it("parses the polygon text stored in the model", () => {
        expect(parsePoints("21.4,21.4 138.5,21.4 138.5,108.6 21.4,108.6")).toEqual([
            [21.4, 21.4],
            [138.5, 21.4],
            [138.5, 108.6],
            [21.4, 108.6],
        ]);
    });

    it("computes bounds", () => {
        const b = boundsOf(parsePoints("10,20 30,5 25,40"));
        expect(b).toEqual({ minX: 10, maxX: 30, minY: 5, maxY: 40 });
    });
});
