import { useMallState } from "@/hooks/mall-state";
import { LENSES } from "@/lib/lenses";
import type { Legend } from "@/lib/color-scales";
import { cn } from "@/lib/utils";

export function LensPanel({ legend }: { legend: Legend }) {
    const { lensId, setLens } = useMallState();
    const lens = LENSES.find((l) => l.id === lensId) ?? LENSES[0];

    return (
        <section
            aria-label="Lens"
            className="pointer-events-auto absolute bottom-4 left-4 z-30 flex max-w-xl flex-col gap-2 rounded-2xl border border-border bg-card/85 p-3 shadow-8 backdrop-blur"
        >
            <div role="radiogroup" aria-label="Color stores by" className="flex flex-wrap gap-1.5">
                {LENSES.map((l) => (
                    <button
                        key={l.id}
                        type="button"
                        role="radio"
                        aria-checked={l.id === lensId}
                        onClick={() => setLens(l.id)}
                        className={cn(
                            "rounded-full border px-3 py-1 text-200 transition focus-visible:outline-2 focus-visible:outline-ring",
                            l.id === lensId ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background hover:border-signal",
                        )}
                    >
                        {l.label}
                    </button>
                ))}
            </div>
            <p className="text-200 text-muted-foreground">{lens.description}</p>

            {legend.kind === "categories" ? (
                <ul className="grid grid-cols-2 gap-x-4 gap-y-1 sm:grid-cols-3">
                    {legend.categories.map((c) => (
                        <li key={c.label} className="flex items-center gap-1.5 text-200">
                            <span aria-hidden className="icon-size-100 rounded-sm" style={{ backgroundColor: c.color }} />
                            {c.label}
                        </li>
                    ))}
                </ul>
            ) : (
                <div>
                    <div
                        aria-hidden
                        className="h-2.5 rounded-full"
                        style={{ background: `linear-gradient(to right, ${legend.stops.join(", ")})` }}
                    />
                    <div className="tabular mt-1 flex justify-between text-200 text-muted-foreground">
                        <span>
                            {legend.loLabel}
                            {legend.loCaption ? ` · ${legend.loCaption}` : ""}
                        </span>
                        <span>
                            {legend.hiCaption ? `${legend.hiCaption} · ` : ""}
                            {legend.hiLabel}
                        </span>
                    </div>
                </div>
            )}
            <p className="flex items-center gap-1.5 text-200 text-muted-foreground">
                <span aria-hidden className="icon-size-100 rounded-sm bg-muted ring-1 ring-border" /> Vacant units sit low and unfilled
            </p>
        </section>
    );
}
