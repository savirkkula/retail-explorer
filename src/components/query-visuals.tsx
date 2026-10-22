import type { ReactNode } from "react";
import { useThemeContext } from "@/hooks/theme.context";
import { VegaVisual, type VisualizationSpec } from "@microsoft/fabric-visuals";
import { DataGrid } from "@microsoft/fabric-datagrid";
import type { GridColumnDef } from "@microsoft/fabric-datagrid";
import type { DataTable, HeaderProps, InteractionEvent } from "@microsoft/fabric-visuals-core";
import { useSemanticModelQuery } from "@/hooks/use-semantic-model-query";
import { toDataTable } from "@/lib/to-data-table";
import type { ColumnMetadataMap } from "@/queries/helpers";
import { EmptyNote, ErrorBanner, Skeleton } from "@/components/states";

interface ChartDefinition {
    connection: string;
    query: string;
    columnMetadata: ColumnMetadataMap;
    vegaLiteSpec: VisualizationSpec;
}

interface VegaQueryProps {
    definition: ChartDefinition;
    header?: HeaderProps;
    /** Keeps only the rows for which the predicate holds; used when a query is shared across scopes. */
    filter?: (table: DataTable) => DataTable;
    onInteraction?: (events: InteractionEvent[]) => void;
    emptyMessage?: string;
}

export function VegaQuery({ definition, header, filter, onInteraction, emptyMessage = "No data for this selection." }: VegaQueryProps) {
    const { theme } = useThemeContext();
    const { data, error } = useSemanticModelQuery({ connection: definition.connection, query: definition.query });

    if (error) return <ErrorBanner message={error.message} />;
    if (!data || data.status !== "success") return <Skeleton className="h-48" />;
    const table = filter ? filter(toDataTable(data.table, definition.columnMetadata)) : toDataTable(data.table, definition.columnMetadata);
    if (table.rows.length === 0) return <EmptyNote message={emptyMessage} />;
    return (
        <div className="h-56">
            <VegaVisual spec={definition.vegaLiteSpec} data={table} theme={theme} header={header} onInteraction={onInteraction} style={{ height: "100%" }} />
        </div>
    );
}

interface GridQueryProps {
    definition: { connection: string; query: string; columnMetadata: ColumnMetadataMap };
    header?: HeaderProps;
    columns?: GridColumnDef[];
    emptyMessage?: string;
}

export function GridQuery({ definition, header, columns, emptyMessage = "No rows." }: GridQueryProps) {
    const { theme } = useThemeContext();
    const { data, error } = useSemanticModelQuery({ connection: definition.connection, query: definition.query });

    if (error) return <ErrorBanner message={error.message} />;
    if (!data || data.status !== "success") return <Skeleton className="h-32" />;
    const table = toDataTable(data.table, definition.columnMetadata);
    if (table.rows.length === 0) return <EmptyNote message={emptyMessage} />;
    return <DataGrid data={table} columns={columns} theme={theme} header={header} />;
}

export function Section({ title, children, aside }: { title: string; children: ReactNode; aside?: ReactNode }) {
    return (
        <section className="flex flex-col gap-2">
            <div className="flex items-baseline justify-between gap-2">
                <h3 className="text-200 font-semibold uppercase tracking-wide text-muted-foreground">{title}</h3>
                {aside}
            </div>
            {children}
        </section>
    );
}
