import { useMemo, useState } from "react";
import { useActions } from "@/hooks/use-actions";
import { useMallData } from "@/hooks/use-mall-data";
import { useMallState } from "@/hooks/mall-state";
import { Section } from "@/components/query-visuals";
import { EmptyNote, ErrorBanner, Skeleton } from "@/components/states";
import { actionTypeLabel, isActive, isOverdue, sortQueue } from "@/lib/actions";
import { findUnit } from "@/lib/mall-model";
import { cn } from "@/lib/utils";

const VISIBLE = 8;

/** Open follow-ups, overdue first; clicking one jumps to the store on the map. */
export function ActionQueue({ propertyKey }: { propertyKey?: number }) {
    const { actions, isLoading, error, userEmail } = useActions();
    const { mall } = useMallData();
    const { focusUnit } = useMallState();
    const [mineOnly, setMineOnly] = useState(false);

    const queue = useMemo(
        () =>
            sortQueue(
                actions.filter(
                    (a) =>
                        isActive(a.status) &&
                        (propertyKey == null || a.propertyKey === propertyKey) &&
                        (!mineOnly || (userEmail != null && a.assignee?.toLowerCase() === userEmail.toLowerCase())),
                ),
            ),
        [actions, propertyKey, mineOnly, userEmail],
    );

    const aside = userEmail && (
        <label className="flex items-center gap-1.5 text-200 text-muted-foreground">
            <input type="checkbox" checked={mineOnly} onChange={(e) => setMineOnly(e.target.checked)} />
            Assigned to me
        </label>
    );

    return (
        <Section title="Action queue" aside={aside}>
            {isLoading ? (
                <Skeleton className="h-20" />
            ) : error ? (
                <ErrorBanner message={`Actions are unavailable: ${error.message}`} />
            ) : queue.length === 0 ? (
                <EmptyNote message={mineOnly ? "Nothing is assigned to you." : "No open actions. Raise one from a store's flags."} />
            ) : (
                <ul className="flex flex-col gap-1">
                    {queue.slice(0, VISIBLE).map((a) => {
                        const found = findUnit(mall, a.unitKey);
                        const overdue = isOverdue(a);
                        return (
                            <li key={a.id}>
                                <button
                                    type="button"
                                    disabled={!found}
                                    onClick={() => found && focusUnit(found.property.propertyKey, found.floor.floorKey, found.unit.unitKey)}
                                    className="flex w-full flex-col rounded-xl border border-border bg-card px-3 py-2 text-left transition hover:border-signal focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-60"
                                >
                                    <span className="text-300 font-semibold">{a.title}</span>
                                    <span className="text-200 text-muted-foreground">
                                        {found ? `${found.property.propertyName} · ${a.unitCode}` : a.unitCode} · {actionTypeLabel(a.actionType)}
                                        {a.dueDate && (
                                            <span className={cn(overdue && "font-semibold text-destructive")}>
                                                {" "}· {overdue ? "overdue" : "due"} {new Date(a.dueDate).toISOString().slice(0, 10)}
                                            </span>
                                        )}
                                    </span>
                                </button>
                            </li>
                        );
                    })}
                    {queue.length > VISIBLE && <li className="px-1 text-200 text-muted-foreground">and {queue.length - VISIBLE} more</li>}
                </ul>
            )}
        </Section>
    );
}
