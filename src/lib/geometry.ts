export type Point = [number, number];

export function parsePoints(points: string): Point[] {
    return points
        .trim()
        .split(/\s+/)
        .map((pair) => {
            const [x, y] = pair.split(",");
            return [Number(x), Number(y)] as Point;
        });
}

export interface Bounds {
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
}

export function boundsOf(points: Point[]): Bounds {
    const xs = points.map((p) => p[0]);
    const ys = points.map((p) => p[1]);
    return { minX: Math.min(...xs), maxX: Math.max(...xs), minY: Math.min(...ys), maxY: Math.max(...ys) };
}

/** Plan canvas units to scene units. */
export const PLAN_SCALE = 0.01;
export const PLAN_WIDTH = 1000;
export const PLAN_HEIGHT = 600;
