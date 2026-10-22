import raw from "./property-kpis.dax?raw";
import totalRaw from "./portfolio-kpis.dax?raw";
import { CONNECTION, fill, rangeTokens, type ColumnMetadataMap, type DateRange } from "../helpers";

export const columnMetadata: ColumnMetadataMap = {
    "Property[Property Key]": { name: "propertyKey", displayName: "Center key" },
    "Property[Property Name]": { name: "propertyName", displayName: "Center" },
    "[Sales]": { name: "sales", displayName: "Sales", format: "#,0.0,,\"M\"" },
    "[SalesYoY]": { name: "salesYoY", displayName: "Sales YoY", format: "+0.0%;-0.0%;0.0%" },
    "[SalesPerM2]": { name: "salesPerM2", displayName: "Sales per m² / yr", format: "#,##0" },
    "[OCR]": { name: "ocr", displayName: "OCR", format: "0.0%" },
    "[Occupancy]": { name: "occupancy", displayName: "Occupancy", format: "0.0%" },
    "[WAULT]": { name: "wault", displayName: "WAULT (yrs)", format: "0.0" },
    "[Visitors]": { name: "visitors", displayName: "Visitors", format: "#,0.0,,\"M\"" },
    "[VisitorsYoY]": { name: "visitorsYoY", displayName: "Visitors YoY", format: "+0.0%;-0.0%;0.0%" },
    "[GLA]": { name: "gla", displayName: "GLA m²", format: "#,##0" },
    "[VacancyPotential]": { name: "vacancyPotential", displayName: "Vacancy rent potential", format: "#,##0" },
};

export interface KpiSet {
    sales: number | null;
    salesYoY: number | null;
    salesPerM2: number | null;
    ocr: number | null;
    occupancy: number | null;
    wault: number | null;
    visitors: number | null;
    visitorsYoY: number | null;
    gla: number | null;
    vacancyPotential: number | null;
}

export interface PropertyKpis extends KpiSet {
    propertyKey: number;
    propertyName: string;
}

export function propertyKpisQuery({ range }: { range: DateRange }) {
    return { connection: CONNECTION, query: fill(raw, rangeTokens(range)), columnMetadata };
}

export function portfolioKpisQuery({ range }: { range: DateRange }) {
    return { connection: CONNECTION, query: fill(totalRaw, rangeTokens(range)), columnMetadata };
}
