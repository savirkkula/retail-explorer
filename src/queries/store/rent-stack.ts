import type { VisualizationSpec } from "@microsoft/fabric-visuals";
import raw from "./rent-stack.dax?raw";
import spec from "./rent-stack.json";
import { CONNECTION, fill, rangeTokens, type ColumnMetadataMap, type DateRange } from "../helpers";

export const columnMetadata: ColumnMetadataMap = {
    "Date[Month Start]": { name: "MonthStart", displayName: "Month", format: "mmm yy" },
    "[BaseRent]": { name: "BaseRent", displayName: "Base rent", format: "#,##0" },
    "[TurnoverRent]": { name: "TurnoverRent", displayName: "Turnover rent", format: "#,##0" },
    "[ServiceCharge]": { name: "ServiceCharge", displayName: "Service charge", format: "#,##0" },
};

export function rentStackQuery({ range, unitKey }: { range: DateRange; unitKey: number }) {
    return {
        connection: CONNECTION,
        query: fill(raw, { ...rangeTokens(range), UNIT: unitKey }),
        columnMetadata,
        vegaLiteSpec: structuredClone(spec) as unknown as VisualizationSpec,
    };
}
