import { useEffect, useRef } from "react";
import { useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import type * as THREE from "three";
import type { Colorizer, Palette } from "@/lib/color-scales";
import { boundsOf } from "@/lib/geometry";
import type { FloorModel, UnitModel } from "@/lib/mall-model";
import type { UnitKpis } from "@/queries/floorplan/unit-kpis";
import { Slab } from "./slab";
import { UnitMesh } from "./unit-mesh";
import { UNIT_HEIGHT, UNIT_HEIGHT_HOVER, UNIT_HEIGHT_SELECTED, UNIT_HEIGHT_VACANT, planToWorld, type FloorTarget } from "./scene-layout";

interface FloorGroupProps {
    floor: FloorModel;
    target: FloorTarget;
    colorizer: Colorizer;
    kpiByUnit: Map<number, UnitKpis>;
    palette: Palette;
    selectedUnitKey: number | null;
    hoveredUnitKey: number | null;
    showLabels: boolean;
    onHover: (unit: UnitModel | null, event?: ThreeEvent<PointerEvent>) => void;
    onSelect: (unit: UnitModel) => void;
}

/** Store names on a level. Kept mounted and toggled with CSS because unmounting drei Html throws under React 19. */
function UnitLabels({ units, kpiByUnit, show }: { units: UnitModel[]; kpiByUnit: Map<number, UnitKpis>; show: boolean }) {
    return (
        <>
            {units.map((unit) => {
                const b = boundsOf(unit.points);
                const kpi = kpiByUnit.get(unit.unitKey);
                const [x, z] = planToWorld(unit.cx, unit.cy);
                const label = !kpi || kpi.isVacant === 1 ? "Vacant" : (kpi.tenant ?? unit.unitCode);
                return (
                    <Html key={unit.unitKey} position={[x, 0.3, z]} center zIndexRange={[5, 0]} style={{ pointerEvents: "none" }}>
                        <span
                            className="truncate text-center text-100 font-medium text-foreground"
                            style={{ display: show ? "block" : "none", width: Math.max(36, (b.maxX - b.minX) * 0.85) }}
                        >
                            {label}
                        </span>
                    </Html>
                );
            })}
        </>
    );
}

export function FloorGroup({ floor, target, colorizer, kpiByUnit, palette, selectedUnitKey, hoveredUnitKey, showLabels, onHover, onSelect }: FloorGroupProps) {
    const group = useRef<THREE.Group>(null);
    const y = useRef(target.y);
    const invalidate = useThree((s) => s.invalidate);

    useEffect(() => {
        invalidate();
    }, [target.y, invalidate]);

    useFrame((state, dt) => {
        const k = 1 - Math.exp(-dt * 6);
        y.current += (target.y - y.current) * k;
        if (group.current) group.current.position.y = y.current;
        if (Math.abs(target.y - y.current) > 0.002) state.invalidate();
    });

    const ghost = floor.floorType !== "Retail";
    return (
        <group ref={group} position={[0, target.y, 0]}>
            <Slab
                outline={floor.outline}
                atria={floor.atria}
                color={palette.slab}
                edgeColor={palette.slabEdge}
                opacity={target.opacity}
                ghost={ghost}
            />
            {floor.units.map((unit) => {
                const kpi = kpiByUnit.get(unit.unitKey);
                const vacant = !kpi || kpi.isVacant === 1;
                const selected = unit.unitKey === selectedUnitKey;
                const hovered = unit.unitKey === hoveredUnitKey;
                const height = selected ? UNIT_HEIGHT_SELECTED : hovered ? UNIT_HEIGHT_HOVER : vacant ? UNIT_HEIGHT_VACANT : UNIT_HEIGHT;
                const color = vacant && !colorizer.colorsVacant ? palette.vacant : colorizer.colorOf(unit.category, kpi, unit.unitKey);
                return (
                    <UnitMesh
                        key={unit.unitKey}
                        unit={unit}
                        color={color}
                        edgeColor={selected ? palette.signal : palette.slabEdge}
                        height={height}
                        opacity={target.opacity * (vacant ? 0.7 : 1)}
                        interactive={target.interactive}
                        onHover={onHover}
                        onSelect={onSelect}
                    />
                );
            })}
            {!ghost && <UnitLabels units={floor.units} kpiByUnit={kpiByUnit} show={showLabels} />}
        </group>
    );
}
