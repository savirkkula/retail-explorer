import { useState, type FormEvent } from "react";
import { MessageSquare, Plus } from "lucide-react";
import { useActionComments, useActions } from "@/hooks/use-actions";
import { EmptyNote, ErrorBanner, Skeleton } from "@/components/states";
import {
    ACTION_PRIORITIES,
    ACTION_STATUSES,
    ACTION_TYPES,
    actionTypeLabel,
    draftFromInsight,
    isActive,
    isOverdue,
    type ActionDraft,
    type ActionPriority,
    type ActionStatus,
    type StoreActionRecord,
} from "@/lib/actions";
import type { Insight } from "@/lib/insights";
import { cn } from "@/lib/utils";

const day = (d: Date | string) => new Date(d).toISOString().slice(0, 10);
const message = (e: unknown) => (e instanceof Error ? e.message : String(e));

const fieldClass = "w-full rounded-lg border border-border bg-background px-2.5 py-1.5 text-200 focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-60";
const buttonClass =
    "rounded-full border px-3 py-1 text-200 transition focus-visible:outline-2 focus-visible:outline-ring disabled:cursor-not-allowed disabled:opacity-60";
const primaryButton = cn(buttonClass, "border-primary bg-primary text-primary-foreground hover:opacity-90");
const quietButton = cn(buttonClass, "border-border bg-background hover:border-signal");

const STATUS_TONE: Record<ActionStatus, string> = {
    open: "border-signal/60 bg-signal/10",
    "in-progress": "border-primary/60 bg-primary/10",
    done: "border-success/60 bg-success/10",
    declined: "border-border bg-muted text-muted-foreground",
};

function ActionThread({ actionId }: { actionId: string }) {
    const { comments, isLoading, error, add } = useActionComments(actionId);
    const [body, setBody] = useState("");
    const [pending, setPending] = useState(false);
    const [failure, setFailure] = useState<string | undefined>();

    const submit = async (e: FormEvent) => {
        e.preventDefault();
        if (!body.trim()) return;
        setPending(true);
        setFailure(undefined);
        try {
            await add(body);
            setBody("");
        } catch (err) {
            setFailure(message(err));
        } finally {
            setPending(false);
        }
    };

    return (
        <div className="flex flex-col gap-2 border-t border-border pt-2">
            {isLoading && <Skeleton className="h-10" />}
            {error && <ErrorBanner message={error.message} />}
            {!isLoading && !error && comments.length === 0 && <p className="text-200 text-muted-foreground">No comments yet.</p>}
            <ul className="flex flex-col gap-1.5">
                {comments.map((c) => (
                    <li key={c.id} className="rounded-lg bg-muted px-2.5 py-1.5 text-200">
                        <p>{c.body}</p>
                        <p className="text-muted-foreground">
                            {c.authorEmail} · {day(c.createdAt)}
                        </p>
                    </li>
                ))}
            </ul>
            <form onSubmit={submit} className="flex gap-2">
                <input
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    maxLength={1000}
                    aria-label="Add a comment"
                    placeholder="Add a comment"
                    disabled={pending}
                    className={fieldClass}
                />
                <button type="submit" disabled={pending || !body.trim()} className={primaryButton}>
                    Post
                </button>
            </form>
            {failure && <ErrorBanner message={failure} />}
        </div>
    );
}

function ActionCard({ action }: { action: StoreActionRecord }) {
    const { update, userEmail } = useActions();
    const [open, setOpen] = useState(false);
    const [pending, setPending] = useState(false);
    const [failure, setFailure] = useState<string | undefined>();

    const run = async (patch: Parameters<typeof update>[1]) => {
        setPending(true);
        setFailure(undefined);
        try {
            await update(action.id, patch);
        } catch (err) {
            setFailure(message(err));
        } finally {
            setPending(false);
        }
    };

    const overdue = isOverdue(action);
    const mine = userEmail != null && action.assignee?.toLowerCase() === userEmail.toLowerCase();

    return (
        <li className={cn("flex flex-col gap-2 rounded-xl border px-3 py-2.5", STATUS_TONE[action.status])}>
            <div className="flex items-start justify-between gap-2">
                <div>
                    <p className="text-300 font-semibold">{action.title}</p>
                    <p className="text-200 text-muted-foreground">{action.triggerText}</p>
                </div>
                <select
                    aria-label={`Status of ${action.title}`}
                    value={action.status}
                    disabled={pending}
                    onChange={(e) => void run({ status: e.target.value as ActionStatus })}
                    className={cn(fieldClass, "w-auto shrink-0")}
                >
                    {ACTION_STATUSES.map((s) => (
                        <option key={s.id} value={s.id}>
                            {s.label}
                        </option>
                    ))}
                </select>
            </div>
            <p className="flex flex-wrap gap-x-3 text-200 text-muted-foreground">
                <span>{actionTypeLabel(action.actionType)}</span>
                <span>{action.priority} priority</span>
                {action.dueDate && <span className={cn(overdue && "font-semibold text-destructive")}>{overdue ? "Overdue" : "Due"} {day(action.dueDate)}</span>}
                <span>{action.assignee ? `Assigned to ${action.assignee}` : "Unassigned"}</span>
                <span>
                    Raised by {action.authorEmail} · {day(action.createdAt)}
                </span>
            </p>
            <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open} className={cn(quietButton, "flex items-center gap-1.5")}>
                    <MessageSquare className="icon-size-100" aria-hidden /> Comments
                </button>
                {isActive(action.status) && userEmail && !mine && (
                    <button type="button" disabled={pending} onClick={() => void run({ assignee: userEmail })} className={quietButton}>
                        Assign to me
                    </button>
                )}
            </div>
            {failure && <ErrorBanner message={failure} />}
            {open && <ActionThread actionId={action.id} />}
        </li>
    );
}

function NewActionForm({ draft, target, onDone }: { draft: ActionDraft; target: StoreTarget; onDone: () => void }) {
    const { create, userEmail } = useActions();
    const [title, setTitle] = useState(draft.title);
    const [priority, setPriority] = useState<ActionPriority>(draft.priority);
    const [dueDate, setDueDate] = useState("");
    const [assignee, setAssignee] = useState(userEmail ?? "");
    const [pending, setPending] = useState(false);
    const [failure, setFailure] = useState<string | undefined>();

    const submit = async (e: FormEvent) => {
        e.preventDefault();
        setPending(true);
        setFailure(undefined);
        try {
            await create({
                ...draft,
                ...target,
                title: title.trim(),
                priority,
                dueDate: dueDate ? new Date(dueDate) : undefined,
                assignee: assignee.trim() || undefined,
            });
            onDone();
        } catch (err) {
            setFailure(message(err));
            setPending(false);
        }
    };

    return (
        <form onSubmit={submit} className="flex flex-col gap-2 rounded-xl border border-border bg-card px-3 py-2.5">
            <p className="text-200 text-muted-foreground">{actionTypeLabel(draft.actionType)} · {draft.triggerText}</p>
            <label className="flex flex-col gap-1 text-200">
                Title
                <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} required disabled={pending} className={fieldClass} />
            </label>
            <div className="grid grid-cols-3 gap-2">
                <label className="flex flex-col gap-1 text-200">
                    Priority
                    <select value={priority} onChange={(e) => setPriority(e.target.value as ActionPriority)} disabled={pending} className={fieldClass}>
                        {ACTION_PRIORITIES.map((p) => (
                            <option key={p.id} value={p.id}>
                                {p.label}
                            </option>
                        ))}
                    </select>
                </label>
                <label className="flex flex-col gap-1 text-200">
                    Due
                    <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} disabled={pending} className={fieldClass} />
                </label>
                <label className="flex flex-col gap-1 text-200">
                    Assignee
                    <input type="email" value={assignee} onChange={(e) => setAssignee(e.target.value)} maxLength={254} placeholder="name@company.com" disabled={pending} className={fieldClass} />
                </label>
            </div>
            {failure && <ErrorBanner message={failure} />}
            <div className="flex gap-2">
                <button type="submit" disabled={pending || !title.trim()} className={primaryButton}>
                    {pending ? "Saving…" : "Create action"}
                </button>
                <button type="button" onClick={onDone} disabled={pending} className={quietButton}>
                    Cancel
                </button>
            </div>
        </form>
    );
}

export interface StoreTarget {
    unitKey: number;
    propertyKey: number;
    unitCode: string;
    storeName: string;
}

interface StoreActionsProps {
    target: StoreTarget;
    insights: Insight[];
}

/** Lists a store's follow-ups and offers one-click actions for the flags that call for one. */
export function StoreActions({ target, insights }: StoreActionsProps) {
    const { byUnit, isLoading, error } = useActions();
    const [draft, setDraft] = useState<ActionDraft | null>(null);

    if (isLoading) return <Skeleton className="h-24" />;
    if (error) return <ErrorBanner message={`Actions are unavailable: ${error.message}`} />;

    const existing = byUnit.get(target.unitKey) ?? [];
    const suggestions = insights.flatMap((i) => {
        const d = draftFromInsight(i, target.storeName === "Vacant" ? target.unitCode : target.storeName);
        const covered = existing.some((a) => a.actionType === d?.actionType && isActive(a.status));
        return d && !covered ? [d] : [];
    });
    // One suggestion per action type; several flags can point at the same follow-up.
    const unique = suggestions.filter((d, i) => suggestions.findIndex((x) => x.actionType === d.actionType) === i);

    return (
        <div className="flex flex-col gap-2">
            {draft ? (
                <NewActionForm draft={draft} target={target} onDone={() => setDraft(null)} />
            ) : (
                unique.length > 0 && (
                    <ul className="flex flex-wrap gap-2" aria-label="Suggested actions">
                        {unique.map((d) => (
                            <li key={d.actionType}>
                                <button type="button" onClick={() => setDraft(d)} className={cn(quietButton, "flex items-center gap-1.5")}>
                                    <Plus className="icon-size-100" aria-hidden />
                                    {ACTION_TYPES.find((t) => t.id === d.actionType)?.verb}
                                </button>
                            </li>
                        ))}
                    </ul>
                )
            )}
            {existing.length === 0 ? (
                !draft && <EmptyNote message={unique.length > 0 ? "No actions yet. Use a suggestion above to start one." : "No actions for this store."} />
            ) : (
                <ul className="flex flex-col gap-2">
                    {existing.map((a) => (
                        <ActionCard key={a.id} action={a} />
                    ))}
                </ul>
            )}
        </div>
    );
}
