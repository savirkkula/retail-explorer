import { cn } from "@/lib/utils";

export function Skeleton({ className }: { className?: string }) {
    return <div aria-hidden className={cn("animate-pulse rounded-xl bg-muted", className)} />;
}

export function ErrorBanner({ message }: { message: string }) {
    return (
        <div role="alert" className="rounded-xl border border-destructive bg-destructive/10 px-3 py-2 text-200 text-destructive">
            {message}
        </div>
    );
}

export function EmptyNote({ message }: { message: string }) {
    return <p className="rounded-xl bg-muted px-3 py-6 text-center text-200 text-muted-foreground">{message}</p>;
}
