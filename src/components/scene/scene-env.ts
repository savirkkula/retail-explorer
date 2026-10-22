import { useEffect, useState } from "react";
import { readPalette, type Palette } from "@/lib/color-scales";

/** Design-token colors resolved for WebGL; refreshes when the theme class or appearance attribute changes. */
export function usePalette(): Palette {
    const [palette, setPalette] = useState<Palette>(readPalette);
    useEffect(() => {
        const observer = new MutationObserver(() => setPalette(readPalette()));
        observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class", "data-appearance"] });
        return () => observer.disconnect();
    }, []);
    return palette;
}

export function webglAvailable(): boolean {
    try {
        const canvas = document.createElement("canvas");
        return Boolean(canvas.getContext("webgl2") ?? canvas.getContext("webgl"));
    } catch {
        return false;
    }
}

export function prefersReducedMotion(): boolean {
    return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}
