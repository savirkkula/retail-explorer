import type { VisualizationSpec } from "@microsoft/fabric-visuals";
import raw from "./category-mix-property.dax?raw";
import spec from "./category-mix-property.json";
import { CONNECTION, fill, rangeTokens, type ColumnMetadataMap, type DateRange } from "../helpers";
import { CATEGORY_ORDER } from "@/lib/categories";

export const columnMetadata: ColumnMetadataMap = {
    "Unit[Category]": { name: "Category", displayName: "Category" },
    "[Sales]": { name: "Sales", displayName: "Sales", format: "#,0.0,,\"M\"" },
    "[SalesPerM2]": { name: "SalesPerM2", displayName: "Sales per m² / yr", format: "#,##0" },
};

export function categoryMixPropertyQuery({ range, propertyKey }: { range: DateRange; propertyKey: number }) {
    const vegaLiteSpec = structuredClone(spec) as unknown as { encoding: { color: { scale?: unknown } } };
    vegaLiteSpec.encoding.color.scale = { domain: [...CATEGORY_ORDER] };
    return {
        connection: CONNECTION,
        query: fill(raw, { ...rangeTokens(range), PROPERTY: propertyKey }),
        columnMetadata,
        vegaLiteSpec: vegaLiteSpec as unknown as VisualizationSpec,
    };
}
