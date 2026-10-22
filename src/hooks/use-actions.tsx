import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { getRayfinClient } from "@/lib/rayfin-client";
import { mapStatusByUnit, type ActionCommentRecord, type ActionDraft, type ActionPriority, type ActionStatus, type MapActionStatus, type StoreActionRecord } from "@/lib/actions";

const ACTION_FIELDS: (keyof StoreActionRecord)[] = [
    "id", "unitKey", "propertyKey", "unitCode", "storeName", "actionType", "status", "priority", "title", "triggerText",
    "dueDate", "assignee", "authorId", "authorEmail", "createdAt", "updatedAt",
];
const COMMENT_FIELDS: (keyof ActionCommentRecord)[] = ["id", "action_id", "body", "authorId", "authorEmail", "createdAt"];

export interface NewAction extends ActionDraft {
    unitKey: number;
    propertyKey: number;
    unitCode: string;
    storeName: string;
    dueDate?: Date;
    assignee?: string;
}

export interface ActionPatch {
    status?: ActionStatus;
    priority?: ActionPriority;
    assignee?: string;
    dueDate?: Date;
}

export interface ActionsValue {
    actions: StoreActionRecord[];
    byUnit: Map<number, StoreActionRecord[]>;
    statusByUnit: Map<number, MapActionStatus>;
    isLoading: boolean;
    error: Error | undefined;
    /** Email of the signed-in user, when known. */
    userEmail: string | undefined;
    create: (input: NewAction) => Promise<void>;
    update: (id: string, patch: ActionPatch) => Promise<void>;
}

const toError = (e: unknown) => (e instanceof Error ? e : new Error(String(e)));

function signedInUser() {
    const session = getRayfinClient().auth.getSession();
    if (!session.isAuthenticated || !session.user) throw new Error("Sign in to save changes.");
    return session.user;
}

async function fetchAllActions(): Promise<StoreActionRecord[]> {
    const base = getRayfinClient().data.StoreAction.select(ACTION_FIELDS).orderBy({ createdAt: "desc" }).first(100);
    const out: StoreActionRecord[] = [];
    let after: string | undefined;
    for (;;) {
        const page = await (after ? base.after(after) : base).executePaginated();
        out.push(...(page.items as StoreActionRecord[]));
        if (!page.hasNextPage || !page.endCursor) return out;
        after = page.endCursor;
    }
}

const ActionsContext = createContext<ActionsValue | undefined>(undefined);
const NO_ACTIONS: StoreActionRecord[] = [];
const NO_COMMENTS: ActionCommentRecord[] = [];

interface Loaded {
    actions: StoreActionRecord[];
    userEmail: string | undefined;
    error: Error | undefined;
}

async function loadActions(): Promise<Loaded> {
    try {
        const actions = await fetchAllActions();
        return { actions, userEmail: getRayfinClient().auth.getSession().user?.email, error: undefined };
    } catch (e) {
        return { actions: [], userEmail: undefined, error: toError(e) };
    }
}

export function ActionsProvider({ children }: { children: ReactNode }) {
    const [loaded, setLoaded] = useState<Loaded | undefined>();
    const { actions = NO_ACTIONS, userEmail, error } = loaded ?? {};
    const isLoading = loaded === undefined;

    const refresh = useCallback(async () => setLoaded(await loadActions()), []);

    useEffect(() => {
        let active = true;
        void loadActions().then((result) => {
            if (active) setLoaded(result);
        });
        return () => {
            active = false;
        };
    }, []);

    const create = useCallback(
        async (input: NewAction) => {
            const user = signedInUser();
            const now = new Date();
            await getRayfinClient().data.StoreAction.create({
                ...input,
                status: "open",
                authorId: user.id,
                authorEmail: user.email,
                createdAt: now,
                updatedAt: now,
            });
            await refresh();
        },
        [refresh],
    );

    const update = useCallback(
        async (id: string, patch: ActionPatch) => {
            signedInUser();
            await getRayfinClient().data.StoreAction.update({ id }, { ...patch, updatedAt: new Date() });
            await refresh();
        },
        [refresh],
    );

    const byUnit = useMemo(() => {
        const map = new Map<number, StoreActionRecord[]>();
        for (const a of actions) map.set(a.unitKey, [...(map.get(a.unitKey) ?? []), a]);
        return map;
    }, [actions]);
    const statusByUnit = useMemo(() => mapStatusByUnit(actions), [actions]);

    const value = useMemo<ActionsValue>(
        () => ({ actions, byUnit, statusByUnit, isLoading, error, userEmail, create, update }),
        [actions, byUnit, statusByUnit, isLoading, error, userEmail, create, update],
    );
    return <ActionsContext.Provider value={value}>{children}</ActionsContext.Provider>;
}

export function useActions(): ActionsValue {
    const ctx = useContext(ActionsContext);
    if (!ctx) throw new Error("useActions must be used within ActionsProvider");
    return ctx;
}

export interface ActionComments {
    comments: ActionCommentRecord[];
    isLoading: boolean;
    error: Error | undefined;
    add: (body: string) => Promise<void>;
}

interface LoadedComments {
    comments: ActionCommentRecord[];
    error: Error | undefined;
}

async function loadComments(actionId: string): Promise<LoadedComments> {
    try {
        const page = await getRayfinClient()
            .data.ActionComment.select(COMMENT_FIELDS)
            .where({ action_id: { eq: actionId } })
            .orderBy({ createdAt: "asc" })
            .first(100)
            .executePaginated();
        return { comments: page.items as ActionCommentRecord[], error: undefined };
    } catch (e) {
        return { comments: [], error: toError(e) };
    }
}

/** Loads the comment thread of one action; mount it only while the thread is open. */
export function useActionComments(actionId: string): ActionComments {
    const [loaded, setLoaded] = useState<LoadedComments | undefined>();

    useEffect(() => {
        let active = true;
        void loadComments(actionId).then((result) => {
            if (active) setLoaded(result);
        });
        return () => {
            active = false;
        };
    }, [actionId]);

    const add = useCallback(
        async (body: string) => {
            const user = signedInUser();
            await getRayfinClient().data.ActionComment.create({
                action_id: actionId,
                body: body.trim(),
                authorId: user.id,
                authorEmail: user.email,
                createdAt: new Date(),
            });
            setLoaded(await loadComments(actionId));
        },
        [actionId],
    );

    return { comments: loaded?.comments ?? NO_COMMENTS, isLoading: loaded === undefined, error: loaded?.error, add };
}
