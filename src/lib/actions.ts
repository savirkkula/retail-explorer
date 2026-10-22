import type { DataAppSchema } from "../../rayfin/data/schema";
import type { Insight } from "@/lib/insights";

export type StoreActionRecord = DataAppSchema["StoreAction"];
export type ActionCommentRecord = DataAppSchema["ActionComment"];
export type ActionType = StoreActionRecord["actionType"];
export type ActionStatus = StoreActionRecord["status"];
export type ActionPriority = StoreActionRecord["priority"];

export const ACTION_TYPES: { id: ActionType; label: string; verb: string }[] = [
    { id: "renewal", label: "Lease renewal", verb: "Start renewal" },
    { id: "rent-review", label: "Rent review", verb: "Request rent review" },
    { id: "market-vacant", label: "Market vacant unit", verb: "Market this unit" },
    { id: "performance-review", label: "Performance review", verb: "Review performance" },
];

export const ACTION_STATUSES: { id: ActionStatus; label: string }[] = [
    { id: "open", label: "Open" },
    { id: "in-progress", label: "In progress" },
    { id: "done", label: "Done" },
    { id: "declined", label: "Declined" },
];

export const ACTION_PRIORITIES: { id: ActionPriority; label: string }[] = [
    { id: "high", label: "High" },
    { id: "medium", label: "Medium" },
    { id: "low", label: "Low" },
];

export const actionTypeLabel = (id: ActionType) => ACTION_TYPES.find((t) => t.id === id)?.label ?? id;
export const actionStatusLabel = (id: ActionStatus) => ACTION_STATUSES.find((s) => s.id === id)?.label ?? id;

/** Open and in-progress actions still need someone's attention. */
export const isActive = (status: ActionStatus) => status === "open" || status === "in-progress";

export interface ActionDraft {
    actionType: ActionType;
    priority: ActionPriority;
    title: string;
    triggerText: string;
}

const TITLE_PREFIX: Record<ActionType, string> = {
    renewal: "Start lease renewal",
    "rent-review": "Review rent",
    "market-vacant": "Market vacant unit",
    "performance-review": "Review performance",
};

/** Pre-fills an action from the flag that raised it. Returns undefined for flags that need no follow-up. */
export function draftFromInsight(insight: Insight, subject: string): ActionDraft | undefined {
    if (!insight.action) return undefined;
    return {
        actionType: insight.action,
        priority: insight.tone === "warn" ? "high" : "medium",
        title: `${TITLE_PREFIX[insight.action]}: ${subject}`,
        triggerText: insight.text,
    };
}

/** Status shown on the map for a unit; done work stays visible, declined work does not. */
export type MapActionStatus = "open" | "in-progress" | "done";

const MAP_RANK: Record<MapActionStatus, number> = { open: 3, "in-progress": 2, done: 1 };

export function mapStatusByUnit(actions: readonly Pick<StoreActionRecord, "unitKey" | "status">[]): Map<number, MapActionStatus> {
    const out = new Map<number, MapActionStatus>();
    for (const a of actions) {
        if (a.status === "declined") continue;
        const current = out.get(a.unitKey);
        if (!current || MAP_RANK[a.status] > MAP_RANK[current]) out.set(a.unitKey, a.status);
    }
    return out;
}

/** Overdue first, then nearest due date, then newest. Actions without a due date sort after dated ones. */
export function sortQueue(actions: readonly StoreActionRecord[]): StoreActionRecord[] {
    return actions.slice().sort((a, b) => {
        const ad = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
        const bd = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
        if (ad !== bd) return ad - bd;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
}

export function isOverdue(action: Pick<StoreActionRecord, "status" | "dueDate">, now = new Date()): boolean {
    return isActive(action.status) && action.dueDate != null && new Date(action.dueDate).getTime() < now.getTime();
}
