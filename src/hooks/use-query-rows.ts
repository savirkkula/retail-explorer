import { useMemo } from "react";
import { useSemanticModelQuery } from "@/hooks/use-semantic-model-query";
import { toObjects } from "@/lib/table-rows";
import type { ColumnMetadataMap } from "@/queries/helpers";

interface QueryDefinition {
    connection: string;
    query: string;
    columnMetadata: ColumnMetadataMap;
}

export interface QueryRows<T> {
    rows: T[] | undefined;
    isLoading: boolean;
    error: Error | undefined;
    refetch: () => Promise<void>;
}

/** Runs a query factory result and returns typed rows. Pass `null` to skip the query. */
export function useQueryRows<T>(definition: QueryDefinition | null): QueryRows<T> {
    const { data, isLoading, error, refetch } = useSemanticModelQuery({
        connection: definition?.connection ?? "",
        query: definition?.query ?? "",
    });
    const metadata = definition?.columnMetadata;
    const rows = useMemo(
        () => (data?.status === "success" && metadata ? toObjects<T>(data.table, metadata) : undefined),
        [data, metadata],
    );
    return { rows, isLoading, error, refetch };
}
