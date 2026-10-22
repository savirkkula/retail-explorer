import { useMemo } from "react";
import { useMallData } from "@/hooks/use-mall-data";
import { useMallState } from "@/hooks/mall-state";
import { Section, VegaQuery } from "@/components/query-visuals";
import { KpiTile } from "@/components/panels/kpi-tile";
import { ActionQueue } from "@/components/panels/action-queue";
import { fmtCompact, fmtPct, fmtYears } from "@/lib/format";
import { rangeLabel } from "@/lib/periods";
import { categoryMixQuery } from "@/queries/portfolio/category-mix";
import { monthlySalesQuery } from "@/queries/portfolio/monthly-sales";

export function PortfolioPanel() {
    const { portfolioKpis: kpis, propertyKpis, mall, range, trend } = useMallData();
    const { selectProperty } = useMallState();
    const monthly = useMemo(() => (trend ? monthlySalesQuery({ range: trend }) : null), [trend]);
    const mix = useMemo(() => (range ? categoryMixQuery({ range }) : null), [range]);

    return (
        <div className="flex flex-col gap-5">
            <header>
                <p className="text-200 uppercase tracking-wide text-muted-foreground">Retail portfolio</p>
                <h2 className="font-heading text-hero-800 leading-hero-800">Three centers, one picture</h2>
                {range && <p className="text-300 text-muted-foreground">{rangeLabel(range)}</p>}
            </header>

            <div className="grid grid-cols-2 gap-3">
                <KpiTile label="Sales" value={fmtCompact(kpis?.sales, "€")} delta={kpis?.salesYoY} />
                <KpiTile label="Visitors" value={fmtCompact(kpis?.visitors)} delta={kpis?.visitorsYoY} />
                <KpiTile label="Sales / m² / yr" value={fmtCompact(kpis?.salesPerM2, "€")} />
                <KpiTile label="Occupancy" value={fmtPct(kpis?.occupancy, 1)} />
                <KpiTile label="Occupancy cost" value={fmtPct(kpis?.ocr, 1)} />
                <KpiTile label="WAULT" value={fmtYears(kpis?.wault)} />
            </div>

            <Section title="Centers">
                <ul className="flex flex-col gap-1">
                    {mall.map((p) => {
                        const k = propertyKpis.find((x) => x.propertyKey === p.propertyKey);
                        return (
                            <li key={p.propertyKey}>
                                <button
                                    type="button"
                                    onClick={() => selectProperty(p.propertyKey)}
                                    className="flex w-full items-center justify-between rounded-xl border border-border bg-card px-3 py-2 text-left transition hover:border-signal focus-visible:outline-2 focus-visible:outline-ring"
                                >
                                    <span>
                                        <span className="font-heading text-500">{p.propertyName}</span>
                                        <span className="ml-2 text-200 text-muted-foreground">{p.city}</span>
                                    </span>
                                    <span className="tabular text-200 text-muted-foreground">
                                        {fmtCompact(k?.sales, "€")} · {fmtPct(k?.salesYoY, 1, true)}
                                    </span>
                                </button>
                            </li>
                        );
                    })}
                </ul>
            </Section>

            <ActionQueue />

            {monthly && (
                <Section title="Monthly sales">
                    <VegaQuery definition={monthly} />
                </Section>
            )}
            {mix && (
                <Section title="Sales by category">
                    <VegaQuery definition={mix} />
                </Section>
            )}
        </div>
    );
}
