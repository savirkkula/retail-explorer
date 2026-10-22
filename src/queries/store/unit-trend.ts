import type { VisualizationSpec } from "@microsoft/fabric-visuals";
import raw from "./unit-trend.dax?raw";
import spec from "./unit-trend.json";
import { CONNECTION, fill, rangeTokens, type ColumnMetadataMap, type DateRange } from "../helpers";

export const columnMetadata: ColumnMetadataMap = {
    "Date[Month Start]": { name: "MonthStart", displayName: "Month", format: "mmm yy" },
    "[UnitSalesPerM2]": { name: "UnitSalesPerM2", displayName: "This store", format: "#,##0" },
    "[BenchmarkSalesPerM2]": { name: "BenchmarkSalesPerM2", displayName: "Category benchmark", format: "#,##0" },
};

export function unitTrendQuery({ range, unitKey }: { range: DateRange; unitKey: number }) {
    return {
        connection: CONNECTION,
        query: fill(raw, { ...rangeTokens(range), UNIT: unitKey }),
        columnMetadata,
        vegaLiteSpec: structuredClone(spec) as unknown as VisualizationSpec,
    };
}
