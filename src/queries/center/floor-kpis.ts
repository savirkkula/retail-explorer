import type { VisualizationSpec } from "@microsoft/fabric-visuals";
import raw from "./floor-kpis.dax?raw";
import spec from "./floor-kpis.json";
import { CONNECTION, fill, rangeTokens, type ColumnMetadataMap, type DateRange } from "../helpers";

export const columnMetadata: ColumnMetadataMap = {
    "Floor[Floor Key]": { name: "FloorKey", displayName: "Floor key" },
    "Floor[Property Key]": { name: "PropertyKey", displayName: "Center key" },
    "Floor[Level Label]": { name: "Level", displayName: "Level" },
    "Floor[Sort Order]": { name: "SortOrder", displayName: "Order" },
    "[Sales]": { name: "Sales", displayName: "Sales", format: "#,0.0,,\"M\"" },
    "[SalesPerM2]": { name: "SalesPerM2", displayName: "Sales per m² / yr", format: "#,##0" },
    "[OCR]": { name: "OCR", displayName: "OCR", format: "0.0%" },
    "[Occupancy]": { name: "Occupancy", displayName: "Occupancy", format: "0.0%" },
    "[EnergyIntensity]": { name: "EnergyIntensity", displayName: "Energy kWh / m² / month", format: "0.0" },
};

export function floorKpisQuery({ range }: { range: DateRange }) {
    return {
        connection: CONNECTION,
        query: fill(raw, rangeTokens(range)),
        columnMetadata,
        vegaLiteSpec: structuredClone(spec) as unknown as VisualizationSpec,
    };
}
