import * as THREE from "three";
import type { Point } from "@/lib/geometry";
import { planToWorld } from "./scene-layout";

/** Plan polygon to a three.js Shape lying in XY so that, rotated -90deg about X, it sits on the XZ ground plane. */
export function toShape(points: Point[], holes: Point[][] = []): THREE.Shape {
    const vec = ([x, y]: Point) => {
        const [wx, wz] = planToWorld(x, y);
        return new THREE.Vector2(wx, -wz);
    };
    const shape = new THREE.Shape(points.map(vec));
    shape.holes = holes.map((h) => new THREE.Path(h.map(vec)));
    return shape;
}

export function extrude(points: Point[], depth: number, holes: Point[][] = []): THREE.ExtrudeGeometry {
    return new THREE.ExtrudeGeometry(toShape(points, holes), { depth, bevelEnabled: false });
}
