import raw from "./lease-history.dax?raw";
import { CONNECTION, fill, type ColumnMetadataMap } from "../helpers";

export const columnMetadata: ColumnMetadataMap = {
    "[Tenant]": { name: "Tenant", displayName: "Tenant" },
    "[StartDate]": { name: "StartDate", displayName: "Start", format: "yyyy-mm-dd" },
    "[EndDate]": { name: "EndDate", displayName: "End", format: "yyyy-mm-dd" },
    "[RentPerM2]": { name: "RentPerM2", displayName: "Rent / m² / mo", format: "#,##0.0" },
    "[TurnoverPct]": { name: "TurnoverPct", displayName: "Turnover rent", format: "0.0%" },
    "[AnnualRent]": { name: "AnnualRent", displayName: "Annual base rent", format: "#,##0" },
};

export function leaseHistoryQuery({ unitKey }: { unitKey: number }) {
    return { connection: CONNECTION, query: fill(raw, { UNIT: unitKey }), columnMetadata };
}
