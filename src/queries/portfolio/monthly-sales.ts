import type { VisualizationSpec } from "@microsoft/fabric-visuals";
import raw from "./monthly-sales.dax?raw";
import spec from "./monthly-sales.json";
import { CONNECTION, fill, rangeTokens, type ColumnMetadataMap, type DateRange } from "../helpers";

export const columnMetadata: ColumnMetadataMap = {
    "Date[Month Start]": { name: "MonthStart", displayName: "Month", format: "mmm yy" },
    "Property[Property Name]": { name: "Property", displayName: "Center" },
    "[Sales]": { name: "Sales", displayName: "Sales", format: "#,0.0,,\"M\"" },
};

interface Params {
    range: DateRange;
    /** Center name to emphasise; others are dimmed. */
    highlight?: string;
}

export function monthlySalesQuery({ range, highlight }: Params) {
    const vegaLiteSpec = structuredClone(spec) as unknown as { encoding: { opacity?: unknown } };
    if (highlight) {
        vegaLiteSpec.encoding.opacity = {
            condition: { test: `datum.Property === '${highlight.replace(/'/g, "\\'")}'`, value: 1 },
            value: 0.3,
        };
    }
    return {
        connection: CONNECTION,
        query: fill(raw, rangeTokens(range)),
        columnMetadata,
        vegaLiteSpec: vegaLiteSpec as unknown as VisualizationSpec,
    };
}
