import type { VisualizationSpec } from "@microsoft/fabric-visuals";
import raw from "./zone-heatmap.dax?raw";
import spec from "./zone-heatmap.json";
import { CONNECTION, fill, rangeTokens, type ColumnMetadataMap, type DateRange } from "../helpers";

export const columnMetadata: ColumnMetadataMap = {
    "Date[Day Of Week Number]": { name: "DayNumber", displayName: "Day number" },
    "Date[Day Name]": { name: "DayName", displayName: "Day" },
    "Footfall[Hour]": { name: "Hour", displayName: "Hour", format: "0" },
    "[AvgVisitors]": { name: "AvgVisitors", displayName: "Avg visitors", format: "#,##0" },
};

export function zoneHeatmapQuery({ range, zoneKey }: { range: DateRange; zoneKey: number }) {
    return {
        connection: CONNECTION,
        query: fill(raw, { ...rangeTokens(range), ZONE: zoneKey }),
        columnMetadata,
        vegaLiteSpec: structuredClone(spec) as unknown as VisualizationSpec,
    };
}
