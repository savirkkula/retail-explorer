import type { QueryTable } from "@microsoft/fabric-app-data";
import type { ColumnMetadataMap } from "@/queries/helpers";

/** Row-major query result to objects keyed by each column's `columnMetadata.name` alias. */
export function toObjects<T>(table: QueryTable, metadata: ColumnMetadataMap): T[] {
    const names = table.columns.map((column) => metadata[column.name]?.name ?? column.name);
    return table.rows.map((row) => {
        const out: Record<string, unknown> = {};
        names.forEach((name, i) => {
            out[name] = row[i] ?? null;
        });
        return out as T;
    });
}
