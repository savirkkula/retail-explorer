import { ChevronLeft, Moon, Sun } from "lucide-react";
import { useThemeContext } from "@/hooks/theme.context";
import { useMallData } from "@/hooks/use-mall-data";
import { useMallState } from "@/hooks/mall-state";
import { findUnit } from "@/lib/mall-model";
import { PERIOD_OPTIONS, type PeriodId } from "@/lib/periods";
import { cn } from "@/lib/utils";

function Crumb({ label, onClick, current }: { label: string; onClick: () => void; current: boolean }) {
    return (
        <button
            type="button"
            onClick={onClick}
            aria-current={current ? "page" : undefined}
            className={cn(
                "rounded-md px-1.5 py-0.5 text-300 transition hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring",
                current ? "font-semibold text-foreground" : "text-muted-foreground",
            )}
        >
            {label}
        </button>
    );
}

export function Header() {
    const { isDark, toggleTheme } = useThemeContext();
    const { mall, kpisLoading } = useMallData();
    const { propertyKey, floorKey, unitKey, periodId, selectProperty, selectFloor, selectUnit, setPeriod, back } = useMallState();
    const property = mall.find((p) => p.propertyKey === propertyKey);
    const floor = property?.floors.find((f) => f.floorKey === floorKey);
    const unit = findUnit(mall, unitKey);

    return (
        <header className="pointer-events-none absolute inset-x-0 top-0 z-30 flex flex-wrap items-start justify-between gap-3 p-4">
            <div className="pointer-events-auto flex items-center gap-3 rounded-2xl border border-border bg-card/85 px-4 py-2 shadow-8 backdrop-blur">
                {propertyKey != null && (
                    <button
                        type="button"
                        onClick={back}
                        aria-label="Back"
                        className="rounded-full border border-border p-1.5 text-muted-foreground hover:border-signal hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
                    >
                        <ChevronLeft className="icon-size-200" aria-hidden />
                    </button>
                )}
                <div>
                    <h1 className="font-page-title text-page-title leading-500">
                        Retail <span className="text-muted-foreground">Explorer</span>
                    </h1>
                    <nav aria-label="Breadcrumb" className="-ml-1.5 flex items-center">
                        <Crumb label="Portfolio" current={propertyKey == null} onClick={() => selectProperty(null)} />
                        {property && (
                            <>
                                <span aria-hidden className="text-muted-foreground">/</span>
                                <Crumb label={property.propertyName} current={floorKey == null} onClick={() => selectFloor(null)} />
                            </>
                        )}
                        {floor && (
                            <>
                                <span aria-hidden className="text-muted-foreground">/</span>
                                <Crumb label={`Level ${floor.levelLabel}`} current={unitKey == null} onClick={() => selectUnit(null)} />
                            </>
                        )}
                        {unit && (
                            <>
                                <span aria-hidden className="text-muted-foreground">/</span>
                                <Crumb label={unit.unit.unitCode} current onClick={() => undefined} />
                            </>
                        )}
                    </nav>
                </div>
            </div>

            <div className="pointer-events-auto flex items-center gap-2">
                {kpisLoading && (
                    <span role="status" className="animate-pulse rounded-full bg-card/85 px-3 py-1 text-200 text-muted-foreground">
                        Updating…
                    </span>
                )}
                <span className="rounded-full border border-signal/60 bg-signal/10 px-3 py-1 text-200 text-foreground" title="All figures are synthetic demo data">
                    Demo data
                </span>
                <label className="sr-only" htmlFor="period">
                    Period
                </label>
                <select
                    id="period"
                    value={periodId}
                    onChange={(e) => setPeriod(e.target.value as PeriodId)}
                    className="rounded-xl border border-border bg-card/85 px-3 py-2 text-300 shadow-4 backdrop-blur focus-visible:outline-2 focus-visible:outline-ring"
                >
                    {PERIOD_OPTIONS.map((o) => (
                        <option key={o.id} value={o.id}>
                            {o.label}
                        </option>
                    ))}
                </select>
                <button
                    type="button"
                    onClick={toggleTheme}
                    aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
                    className="rounded-xl border border-border bg-card/85 p-2.5 shadow-4 backdrop-blur hover:border-signal focus-visible:outline-2 focus-visible:outline-ring"
                >
                    {isDark ? <Sun className="icon-size-200" aria-hidden /> : <Moon className="icon-size-200" aria-hidden />}
                </button>
            </div>
        </header>
    );
}
