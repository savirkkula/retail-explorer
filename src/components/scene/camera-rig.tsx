import { useEffect, useMemo, useRef } from "react";
import { useThree } from "@react-three/fiber";
import { CameraControls } from "@react-three/drei";
import type CameraControlsImpl from "camera-controls";
import { cameraPose, type SceneMode } from "./scene-layout";
import { prefersReducedMotion } from "./scene-env";

interface CameraRigProps {
    mode: SceneMode;
    propertyX: number;
    propertyCount: number;
    floorCount: number;
    selectedY: number;
    /** Changes whenever the focused entity changes, even if the numeric pose does not. */
    focusKey: string;
}

export function CameraRig({ mode, propertyX, propertyCount, floorCount, selectedY, focusKey }: CameraRigProps) {
    const controls = useRef<CameraControlsImpl>(null);
    const placed = useRef(false);
    const size = useThree((s) => s.size);
    const aspect = size.width / Math.max(size.height, 1);
    const pose = useMemo(
        () => cameraPose({ mode, propertyX, floorCount, selectedY, propertyCount, aspect }),
        [mode, propertyX, floorCount, selectedY, propertyCount, aspect],
    );

    useEffect(() => {
        const c = controls.current;
        if (!c) return;
        const animate = placed.current && !prefersReducedMotion();
        void c.setLookAt(...pose.position, ...pose.target, animate);
        placed.current = true;
    }, [pose, focusKey]);

    return (
        <CameraControls
            ref={controls}
            makeDefault
            minDistance={4}
            maxDistance={70}
            minPolarAngle={0.15}
            maxPolarAngle={Math.PI * 0.49}
            smoothTime={0.55}
            draggingSmoothTime={0.12}
            dollySpeed={0.6}
        />
    );
}
