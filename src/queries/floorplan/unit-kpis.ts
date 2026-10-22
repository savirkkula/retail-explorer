import raw from "./unit-kpis.dax?raw";
import { CONNECTION, fill, rangeTokens, type ColumnMetadataMap, type DateRange } from "../helpers";

export const columnMetadata: ColumnMetadataMap = {
    "Unit[Unit Key]": { name: "unitKey", displayName: "Unit key" },
    "[Sales]": { name: "sales", displayName: "Sales", format: "#,##0" },
    "[SalesPerM2]": { name: "salesPerM2", displayName: "Sales per m² / yr", format: "#,##0" },
    "[SalesYoY]": { name: "salesYoY", displayName: "Sales YoY", format: "+0.0%;-0.0%;0.0%" },
    "[SalesIndex]": { name: "salesIndex", displayName: "Sales index vs category", format: "0.00" },
    "[OCR]": { name: "ocr", displayName: "OCR", format: "0.0%" },
    "[Health]": { name: "health", displayName: "Health score", format: "0" },
    "[Tenant]": { name: "tenant", displayName: "Tenant" },
    "[LeaseYears]": { name: "leaseYears", displayName: "Lease runway (yrs)", format: "0.0" },
    "[LeaseExpiry]": { name: "leaseExpiry", displayName: "Lease expiry", format: "yyyy-mm-dd" },
    "[IsVacant]": { name: "isVacant", displayName: "Vacant" },
    "[ZoneVisitors]": { name: "zoneVisitors", displayName: "Visitors in zone", format: "#,##0" },
    "[SalesPerVisitor]": { name: "salesPerVisitor", displayName: "Sales per passing visitor", format: "0.00" },
    "[RentVsERV]": { name: "rentVsErv", displayName: "Rent vs ERV", format: "+0.0%;-0.0%;0.0%" },
    "[BaseRentPerM2]": { name: "baseRentPerM2", displayName: "Base rent / m² / mo", format: "#,##0.0" },
    "[TotalRent]": { name: "totalRent", displayName: "Total rent", format: "#,##0" },
    "[VacancyPotential]": { name: "vacancyPotential", displayName: "Vacancy rent potential", format: "#,##0" },
};

export interface UnitKpis {
    unitKey: number;
    sales: number | null;
    salesPerM2: number | null;
    salesYoY: number | null;
    salesIndex: number | null;
    ocr: number | null;
    health: number | null;
    tenant: string | null;
    leaseYears: number | null;
    leaseExpiry: string | null;
    isVacant: number;
    zoneVisitors: number | null;
    salesPerVisitor: number | null;
    rentVsErv: number | null;
    baseRentPerM2: number | null;
    totalRent: number | null;
    vacancyPotential: number | null;
}

export function unitKpisQuery({ range }: { range: DateRange }) {
    return { connection: CONNECTION, query: fill(raw, rangeTokens(range)), columnMetadata };
}
