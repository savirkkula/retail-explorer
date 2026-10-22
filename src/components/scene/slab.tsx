import { memo, useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import type { Point } from "@/lib/geometry";
import { extrude } from "./shape-utils";
import { SLAB_THICKNESS } from "./scene-layout";

interface SlabProps {
    outline: Point[];
    atria: Point[][];
    color: string;
    edgeColor: string;
    opacity: number;
    ghost: boolean;
}

function SlabImpl({ outline, atria, color, edgeColor, opacity, ghost }: SlabProps) {
    const geometry = useMemo(() => extrude(outline, SLAB_THICKNESS, atria), [outline, atria]);
    const edges = useMemo(() => new THREE.EdgesGeometry(geometry, 25), [geometry]);
    useEffect(
        () => () => {
            geometry.dispose();
            edges.dispose();
        },
        [geometry, edges],
    );

    const mesh = useRef<THREE.Mesh>(null);
    const material = useRef<THREE.MeshStandardMaterial>(null);
    const edgeMaterial = useRef<THREE.LineBasicMaterial>(null);
    const targetColor = useMemo(() => new THREE.Color(color), [color]);
    const targetEdge = useMemo(() => new THREE.Color(edgeColor), [edgeColor]);
    const current = useRef({ o: 0, color: new THREE.Color(color), edge: new THREE.Color(edgeColor) });
    const invalidate = useThree((s) => s.invalidate);

    useEffect(() => {
        invalidate();
    }, [targetColor, targetEdge, opacity, invalidate]);

    useFrame((state, dt) => {
        const c = current.current;
        const k = 1 - Math.exp(-dt * 9);
        c.o += (opacity - c.o) * k;
        c.color.lerp(targetColor, k);
        c.edge.lerp(targetEdge, k);
        if (mesh.current && material.current && edgeMaterial.current) {
            mesh.current.visible = c.o > 0.01;
            material.current.color.copy(c.color);
            material.current.opacity = ghost ? c.o * 0.35 : c.o;
            edgeMaterial.current.color.copy(c.edge);
            edgeMaterial.current.opacity = c.o * (ghost ? 0.9 : 0.8);
        }
        const settled =
            Math.abs(opacity - c.o) < 0.004 &&
            Math.abs(c.color.r - targetColor.r) + Math.abs(c.color.g - targetColor.g) + Math.abs(c.color.b - targetColor.b) < 0.004;
        if (!settled) state.invalidate();
    });

    return (
        <mesh ref={mesh} geometry={geometry} rotation={[-Math.PI / 2, 0, 0]} position={[0, -SLAB_THICKNESS, 0]}>
            <meshStandardMaterial ref={material} transparent roughness={0.95} metalness={0} />
            <lineSegments geometry={edges}>
                <lineBasicMaterial ref={edgeMaterial} transparent />
            </lineSegments>
        </mesh>
    );
}

export const Slab = memo(SlabImpl);
