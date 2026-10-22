import { useRef, useState, type ReactNode } from "react";
import { Canvas, type ThreeEvent } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import type { Colorizer } from "@/lib/color-scales";
import type { Lens } from "@/lib/lenses";
import type { PropertyModel, UnitModel } from "@/lib/mall-model";
import { fmtCompact, fmtInt, fmtPct } from "@/lib/format";
import { useMallState } from "@/hooks/mall-state";
import type { UnitKpis } from "@/queries/floorplan/unit-kpis";
import type { PropertyKpis } from "@/queries/portfolio/property-kpis";
import { usePalette } from "./scene-env";
import { CameraRig } from "./camera-rig";
import { FloorGroup } from "./floor-group";
import { CAMERA_FOV, floorGap, floorTarget, propertyX, sceneMode, type SceneMode } from "./scene-layout";

interface MallSceneProps {
    mall: PropertyModel[];
    kpiByUnit: Map<number, UnitKpis>;
    colorizer: Colorizer;
    lens: Lens;
    propertyKpis: PropertyKpis[];
}

interface HoverState {
    unit: UnitModel;
    mode: SceneMode;
}

export function MallScene({ mall, kpiByUnit, colorizer, lens, propertyKpis }: MallSceneProps) {
    const { propertyKey, floorKey, unitKey, selectProperty, selectFloor, selectUnit } = useMallState();
    const palette = usePalette();
    const mode = sceneMode(propertyKey, floorKey);
    const [hover, setHover] = useState<HoverState | null>(null);
    const tooltip = useRef<HTMLDivElement>(null);
    const container = useRef<HTMLDivElement>(null);

    const activeProperty = mall.find((p) => p.propertyKey === propertyKey);
    const activeIndex = activeProperty ? mall.indexOf(activeProperty) : 0;
    const selectedFloorIndex = activeProperty ? activeProperty.floors.findIndex((f) => f.floorKey === floorKey) : -1;
    const selectedY = Math.max(selectedFloorIndex, 0) * floorGap(mode);

    const handleHover = (unit: UnitModel | null, event?: ThreeEvent<PointerEvent>) => {
        if (container.current) container.current.style.cursor = unit ? "pointer" : "";
        if (unit && event && tooltip.current && container.current) {
            const rect = container.current.getBoundingClientRect();
            tooltip.current.style.transform = `translate(${event.nativeEvent.clientX - rect.left + 14}px, ${event.nativeEvent.clientY - rect.top + 14}px)`;
        }
        setHover((prev) => {
            if (!unit) return prev ? null : prev;
            return prev?.unit.unitKey === unit.unitKey && prev.mode === mode ? prev : { unit, mode };
        });
    };

    const handleSelect = (unit: UnitModel) => {
        if (mode === "portfolio") selectProperty(unit.propertyKey);
        else if (mode === "center") selectFloor(unit.floorKey);
        else selectUnit(unit.unitKey === unitKey ? null : unit.unitKey);
    };

    const hoveredUnit = hover?.unit ?? null;

    return (
        <div ref={container} className="relative size-full overflow-hidden isolate">
            <Canvas
                flat
                frameloop="demand"
                dpr={[1, 2]}
                camera={{ fov: CAMERA_FOV, near: 0.1, far: 300, position: [0, 18, 36] }}
                gl={{ antialias: true, alpha: true }}
                onPointerMissed={() => {
                    if (unitKey != null) selectUnit(null);
                }}
            >
                <ambientLight intensity={1.7} />
                <directionalLight position={[6, 12, 8]} intensity={1.7} />
                <CameraRig
                    mode={mode}
                    propertyX={propertyX(activeIndex, mall.length)}
                    propertyCount={mall.length}
                    floorCount={activeProperty?.floors.length ?? 5}
                    selectedY={selectedY}
                    focusKey={`${propertyKey}:${floorKey}`}
                />
                {mall.map((property, index) => {
                    const active = propertyKey == null || property.propertyKey === propertyKey;
                    return (
                        <group key={property.propertyKey} position={[propertyX(index, mall.length), 0, 0]}>
                            {property.floors.map((floor, floorIndex) => (
                                <FloorGroup
                                    key={floor.floorKey}
                                    floor={floor}
                                    target={floorTarget({
                                        mode,
                                        index: floorIndex,
                                        selectedIndex: selectedFloorIndex,
                                        isGhost: floor.floorType !== "Retail",
                                        propertyActive: active,
                                    })}
                                    colorizer={colorizer}
                                    kpiByUnit={kpiByUnit}
                                    palette={palette}
                                    selectedUnitKey={unitKey}
                                    hoveredUnitKey={hoveredUnit?.unitKey ?? null}
                                    showLabels={mode === "floor" && floor.floorKey === floorKey}
                                    onHover={handleHover}
                                    onSelect={handleSelect}
                                />
                            ))}
                            <Html position={[0, property.floors.length * floorGap("portfolio") + 3, 0]} center zIndexRange={[10, 0]}>
                                <PropertyLabel
                                    property={property}
                                    kpis={propertyKpis.find((k) => k.propertyKey === property.propertyKey)}
                                    visible={mode === "portfolio"}
                                    onClick={() => selectProperty(property.propertyKey)}
                                />
                            </Html>
                        </group>
                    );
                })}
            </Canvas>
            <div
                ref={tooltip}
                className="pointer-events-none absolute left-0 top-0 z-20 max-w-64 rounded-xl border border-border bg-popover px-3 py-2 text-200 text-popover-foreground shadow-16"
                style={{ opacity: hover ? 1 : 0, transition: "opacity 120ms" }}
                role="status"
            >
                {hover && <HoverContent hover={hover} kpi={kpiByUnit.get(hover.unit.unitKey)} lens={lens} mall={mall} />}
            </div>
        </div>
    );
}

function PropertyLabel({ property, kpis, visible, onClick }: { property: PropertyModel; kpis: PropertyKpis | undefined; visible: boolean; onClick: () => void }) {
    return (
        <button
            type="button"
            onClick={onClick}
            tabIndex={visible ? 0 : -1}
            aria-hidden={!visible}
            className="group flex flex-col items-center rounded-xl border border-border bg-card/85 px-4 py-2 text-center shadow-8 backdrop-blur transition-opacity hover:border-signal focus-visible:outline-2 focus-visible:outline-ring"
            style={{ opacity: visible ? 1 : 0, pointerEvents: visible ? "auto" : "none" }}
        >
            <span className="font-heading text-hero-700 leading-hero-700 text-foreground">{property.propertyName}</span>
            <span className="text-200 text-muted-foreground">
                {property.city} · {kpis ? `${fmtCompact(kpis.sales, "€")} sales · ${fmtPct(kpis.occupancy, 0)} let` : "…"}
            </span>
        </button>
    );
}

function HoverContent({ hover, kpi, lens, mall }: { hover: HoverState; kpi: UnitKpis | undefined; lens: Lens; mall: PropertyModel[] }): ReactNode {
    const { unit, mode } = hover;
    const property = mall.find((p) => p.propertyKey === unit.propertyKey);
    const floor = property?.floors.find((f) => f.floorKey === unit.floorKey);
    if (mode === "portfolio") {
        return <strong className="font-medium">{property?.propertyName}</strong>;
    }
    if (mode === "center") {
        return (
            <>
                <strong className="font-medium">Level {floor?.levelLabel}</strong>
                <div className="text-muted-foreground">{floor?.units.length} units · click to open</div>
            </>
        );
    }
    const vacant = !kpi || kpi.isVacant === 1;
    return (
        <>
            <strong className="font-medium">{vacant ? "Vacant unit" : kpi.tenant}</strong>
            <div className="text-muted-foreground">
                {unit.unitCode} · {unit.category} · {fmtInt(unit.area)} m²
            </div>
            {lens.field && kpi && !vacant && (
                <div className="tabular mt-1">
                    {lens.label}: <span className="font-semibold">{lens.format(kpi[lens.field])}</span>
                </div>
            )}
        </>
    );
}
