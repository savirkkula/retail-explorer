import { describe, it, expect } from "vitest";
import type { QueryTable } from "@microsoft/fabric-app-data";
import { toObjects } from "@/lib/table-rows";
import { columnMetadata, type UnitKpis } from "@/queries/floorplan/unit-kpis";

describe("toObjects", () => {
    const table: QueryTable = {
        columns: [
            { name: "Unit[Unit Key]", dataType: "number" },
            { name: "[SalesPerM2]", dataType: "number" },
            { name: "[Tenant]", dataType: "string" },
            { name: "[Unexpected]", dataType: "string" },
        ],
        rows: [
            [1, 4868.9, "Solmu Travel", "x"],
            [2, null, undefined, "y"],
        ],
    };

    it("keys values by the column alias and keeps unknown columns", () => {
        const rows = toObjects<UnitKpis & { "[Unexpected]": string }>(table, columnMetadata);
        expect(rows[0]).toMatchObject({ unitKey: 1, salesPerM2: 4868.9, tenant: "Solmu Travel", "[Unexpected]": "x" });
    });

    it("turns missing cells into null", () => {
        const rows = toObjects<UnitKpis>(table, columnMetadata);
        expect(rows[1].salesPerM2).toBeNull();
        expect(rows[1].tenant).toBeNull();
    });
});
