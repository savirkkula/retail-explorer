//-----------------------------------------------------------------------
// <copyright company="Microsoft Corporation">
//        Copyright (c) Microsoft Corporation.  All rights reserved.
//        Licensed under the MIT license. See LICENSE file in the project root for full license information.
// </copyright>
//-----------------------------------------------------------------------

import { lazy, Suspense, useMemo, useState } from "react";
import { MallStateProvider, useMallState } from "@/hooks/mall-state";
import { ActionsProvider, useActions } from "@/hooks/use-actions";
import { MallDataProvider, useMallData } from "@/hooks/use-mall-data";
import { Header } from "@/components/header";
import { LensPanel } from "@/components/lens-panel";
import { CenterPanel } from "@/components/panels/center-panel";
import { FloorPanel } from "@/components/panels/floor-panel";
import { PortfolioPanel } from "@/components/panels/portfolio-panel";
import { StorePanel } from "@/components/panels/store-panel";
import { Plan2D } from "@/components/scene/plan-2d";
import { usePalette, webglAvailable } from "@/components/scene/scene-env";
import { ErrorBanner, Skeleton } from "@/components/states";
import { CATEGORY_ORDER } from "@/lib/categories";
import { createColorizer } from "@/lib/color-scales";
import { LENS_BY_ID } from "@/lib/lenses";

const MallScene = lazy(() => import("@/components/scene/mall-scene").then((m) => ({ default: m.MallScene })));

function SidePanel() {
    const { propertyKey, floorKey, unitKey } = useMallState();
    if (unitKey != null) return <StorePanel />;
    if (floorKey != null) return <FloorPanel />;
    if (propertyKey != null) return <CenterPanel />;
    return <PortfolioPanel />;
}

function Shell() {
    const data = useMallData();
    const { lensId } = useMallState();
    const { statusByUnit } = useActions();
    const palette = usePalette();
    const lens = LENS_BY_ID[lensId];
    const [webgl] = useState(() => webglAvailable());
    const colorizer = useMemo(
        () => createColorizer(lens, data.kpiList, [...CATEGORY_ORDER], palette, statusByUnit),
        [lens, data.kpiList, palette, statusByUnit],
    );

    return (
        <div className="grid h-dvh grid-rows-[minmax(0,1fr)_minmax(0,1fr)] overflow-hidden bg-background text-foreground lg:grid-cols-[minmax(0,1fr)_auto] lg:grid-rows-1">
            <main className="scene-backdrop relative min-h-0">
                <Header />
                {data.error ? (
                    <div className="absolute inset-x-4 top-28 z-20">
                        <ErrorBanner message={data.error.message} />
                    </div>
                ) : !data.ready ? (
                    <div className="absolute inset-0 grid place-items-center">
                        <p className="animate-pulse font-heading text-hero-800 text-muted-foreground">Loading floor plans…</p>
                    </div>
                ) : webgl ? (
                    <Suspense fallback={<Skeleton className="absolute inset-0 rounded-none" />}>
                        <MallScene mall={data.mall} kpiByUnit={data.kpiByUnit} colorizer={colorizer} lens={lens} propertyKpis={data.propertyKpis} />
                    </Suspense>
                ) : (
                    <Plan2D mall={data.mall} kpiByUnit={data.kpiByUnit} colorizer={colorizer} palette={palette} />
                )}
                {data.ready && <LensPanel legend={colorizer.legend} />}
            </main>
            <aside aria-label="Details" className="min-h-0 w-full overflow-y-auto border-t border-border bg-card p-5 lg:w-112 lg:border-l lg:border-t-0">
                {data.ready ? <SidePanel /> : <Skeleton className="h-64" />}
            </aside>
        </div>
    );
}

function App() {
    return (
        <MallStateProvider>
            <MallDataProvider>
                <ActionsProvider>
                    <Shell />
                </ActionsProvider>
            </MallDataProvider>
        </MallStateProvider>
    );
}

export default App;
