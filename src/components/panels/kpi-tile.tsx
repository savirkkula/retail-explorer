import { cn } from "@/lib/utils";
import { fmtPct } from "@/lib/format";

interface KpiTileProps {
    label: string;
    value: string;
    /** Fractional change, e.g. 0.043 for +4.3%. */
    delta?: number | null;
    deltaLabel?: string;
    className?: string;
}

export function KpiTile({ label, value, delta, deltaLabel = "YoY", className }: KpiTileProps) {
    return (
        <div className={cn("rounded-xl border border-border bg-card px-3 py-2", className)}>
            <div className="text-200 text-muted-foreground">{label}</div>
            <div className="tabular font-heading text-hero-700 leading-hero-700">{value}</div>
            {delta != null && (
                <div className={cn("tabular text-200", delta >= 0 ? "text-success" : "text-destructive")}>
                    {fmtPct(delta, 1, true)} {deltaLabel}
                </div>
            )}
        </div>
    );
}
