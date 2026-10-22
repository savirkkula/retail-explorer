import type { ColumnDef } from "@microsoft/fabric-visuals-core";

export const CONNECTION = "retailExplorer";

export type ColumnMetadataMap = Record<string, ColumnDef>;

/** ISO calendar date (YYYY-MM-DD) used for the period filter. */
export type Ymd = string;

export interface DateRange {
    start: Ymd;
    end: Ymd;
}

export function dateExpr(ymd: Ymd): string {
    const [y, m, d] = ymd.split("-").map(Number);
    return `DATE(${y}, ${m}, ${d})`;
}

/** Replaces __TOKEN__ placeholders in a raw DAX template. */
export function fill(template: string, values: Record<string, string | number>): string {
    return template.replace(/__([A-Z_]+)__/g, (match, key: string) => {
        if (!(key in values)) throw new Error(`Missing DAX token ${match}`);
        return String(values[key]);
    });
}

export function rangeTokens(range: DateRange): Record<string, string> {
    return { START: dateExpr(range.start), END: dateExpr(range.end) };
}
