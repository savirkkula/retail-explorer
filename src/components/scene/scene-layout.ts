import { PLAN_HEIGHT, PLAN_SCALE, PLAN_WIDTH } from "@/lib/geometry";

export type SceneMode = "portfolio" | "center" | "floor";

export const PROPERTY_SPACING = 11.5;
export const SLAB_THICKNESS = 0.08;
export const UNIT_HEIGHT = 0.22;
export const UNIT_HEIGHT_VACANT = 0.05;
export const UNIT_HEIGHT_HOVER = 0.34;
export const UNIT_HEIGHT_SELECTED = 0.55;

export function sceneMode(propertyKey: number | null, floorKey: number | null): SceneMode {
    if (propertyKey == null) return "portfolio";
    return floorKey == null ? "center" : "floor";
}

/** World x of the property group centre; properties are laid out in a row. */
export function propertyX(index: number, count: number): number {
    return (index - (count - 1) / 2) * PROPERTY_SPACING;
}

/** Distance between stacked floors. */
export function floorGap(mode: SceneMode): number {
    return mode === "portfolio" ? 0.55 : mode === "center" ? 1.05 : 1.5;
}

export interface FloorTarget {
    y: number;
    opacity: number;
    interactive: boolean;
}

/**
 * Where a floor should sit and how visible it is.
 * In floor mode floors above the selected one are lifted away and hidden so the plan can be viewed from above.
 */
export function floorTarget(args: {
    mode: SceneMode;
    index: number;
    selectedIndex: number;
    isGhost: boolean;
    propertyActive: boolean;
}): FloorTarget {
    const { mode, index, selectedIndex, isGhost, propertyActive } = args;
    const gap = floorGap(mode);
    let y = index * gap;
    let opacity = 1;
    let interactive = true;

    if (!propertyActive) {
        opacity = 0;
        interactive = false;
    } else if (mode === "floor") {
        if (index > selectedIndex) {
            y += 7;
            opacity = 0;
            interactive = false;
        } else if (index < selectedIndex) {
            opacity = 0.3;
            interactive = false;
        }
    }
    if (isGhost) {
        opacity = Math.min(opacity, 0.22);
        interactive = false;
    }
    return { y, opacity, interactive };
}

export interface CameraPose {
    position: [number, number, number];
    target: [number, number, number];
}

export const CAMERA_FOV = 35;

export function cameraPose(args: {
    mode: SceneMode;
    propertyX: number;
    floorCount: number;
    selectedY: number;
    propertyCount: number;
    aspect: number;
}): CameraPose {
    const { mode, propertyX: x, floorCount, selectedY, propertyCount, aspect } = args;
    const tanHalf = Math.tan((CAMERA_FOV * Math.PI) / 360);
    const fitWidth = (halfWidth: number) => halfWidth / (tanHalf * Math.max(aspect, 0.5));
    if (mode === "portfolio") {
        const half = ((propertyCount - 1) * PROPERTY_SPACING) / 2 + 6;
        const dist = Math.max(24, fitWidth(half) * 1.05);
        return { position: [0, dist * 0.45, dist * 0.88], target: [0, 1.4, 0] };
    }
    if (mode === "center") {
        const mid = ((floorCount - 1) * floorGap("center")) / 2;
        const dist = Math.max(14 + floorCount * 0.7, fitWidth(6.2));
        return { position: [x + dist * 0.4, mid + dist * 0.5, dist * 0.78], target: [x, mid, 0] };
    }
    const dist = Math.max(11, fitWidth(5.8));
    return { position: [x, selectedY + dist * 0.8, dist * 0.68], target: [x, selectedY, 0.2] };
}

/** Plan canvas coordinates (0..1000, 0..600) to local world x/z. */
export function planToWorld(x: number, y: number): [number, number] {
    return [(x - PLAN_WIDTH / 2) * PLAN_SCALE, (y - PLAN_HEIGHT / 2) * PLAN_SCALE];
}
