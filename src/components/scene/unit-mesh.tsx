import { memo, useEffect, useMemo, useRef } from "react";
import { useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import * as THREE from "three";
import type { UnitModel } from "@/lib/mall-model";
import { extrude } from "./shape-utils";

export interface UnitMeshProps {
    unit: UnitModel;
    color: string;
    edgeColor: string;
    height: number;
    opacity: number;
    interactive: boolean;
    onHover: (unit: UnitModel | null, event?: ThreeEvent<PointerEvent>) => void;
    onSelect: (unit: UnitModel) => void;
}

const COLOR_EPS = 0.004;

function UnitMeshImpl({ unit, color, edgeColor, height, opacity, interactive, onHover, onSelect }: UnitMeshProps) {
    const geometry = useMemo(() => extrude(unit.points, 1), [unit.points]);
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
    const current = useRef({ h: height, o: 0, color: new THREE.Color(color), edge: new THREE.Color(edgeColor) });
    const invalidate = useThree((s) => s.invalidate);

    useEffect(() => {
        invalidate();
    }, [targetColor, targetEdge, height, opacity, invalidate]);

    useFrame((state, dt) => {
        const c = current.current;
        const k = 1 - Math.exp(-dt * 9);
        c.h += (height - c.h) * k;
        c.o += (opacity - c.o) * k;
        c.color.lerp(targetColor, k);
        c.edge.lerp(targetEdge, k);
        if (mesh.current && material.current && edgeMaterial.current) {
            mesh.current.scale.z = Math.max(c.h, 0.001);
            mesh.current.visible = c.o > 0.01;
            material.current.color.copy(c.color);
            material.current.opacity = c.o;
            edgeMaterial.current.color.copy(c.edge);
            edgeMaterial.current.opacity = c.o * 0.7;
        }
        const settled =
            Math.abs(height - c.h) < 0.002 &&
            Math.abs(opacity - c.o) < 0.004 &&
            Math.abs(c.color.r - targetColor.r) + Math.abs(c.color.g - targetColor.g) + Math.abs(c.color.b - targetColor.b) < COLOR_EPS &&
            Math.abs(c.edge.r - targetEdge.r) + Math.abs(c.edge.g - targetEdge.g) + Math.abs(c.edge.b - targetEdge.b) < COLOR_EPS;
        if (!settled) state.invalidate();
    });

    return (
        <mesh
            ref={mesh}
            rotation={[-Math.PI / 2, 0, 0]}
            geometry={geometry}
            onPointerOver={interactive ? (e) => { e.stopPropagation(); onHover(unit, e); } : undefined}
            onPointerMove={interactive ? (e) => { e.stopPropagation(); onHover(unit, e); } : undefined}
            onPointerOut={interactive ? () => onHover(null) : undefined}
            onClick={interactive ? (e) => { e.stopPropagation(); onSelect(unit); } : undefined}
        >
            <meshStandardMaterial ref={material} transparent roughness={0.85} metalness={0} />
            <lineSegments geometry={edges}>
                <lineBasicMaterial ref={edgeMaterial} transparent />
            </lineSegments>
        </mesh>
    );
}

export const UnitMesh = memo(UnitMeshImpl);
