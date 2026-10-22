import raw from "./data-bounds.dax?raw";
import { CONNECTION, type ColumnMetadataMap } from "../helpers";

export const columnMetadata: ColumnMetadataMap = {
    "[MinDateKey]": { name: "minDateKey", displayName: "First sales date" },
    "[MaxDateKey]": { name: "maxDateKey", displayName: "Last sales date" },
};

export interface DataBounds {
    minDateKey: number;
    maxDateKey: number;
}

export function dataBoundsQuery() {
    return { connection: CONNECTION, query: raw, columnMetadata };
}
