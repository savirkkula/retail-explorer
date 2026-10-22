import { createContext, useContext, useMemo, useReducer, type ReactNode } from "react";
import type { LensId } from "@/lib/lenses";
import type { PeriodId } from "@/lib/periods";

export interface MallState {
    propertyKey: number | null;
    floorKey: number | null;
    unitKey: number | null;
    lensId: LensId;
    periodId: PeriodId;
}

type Action =
    | { type: "property"; key: number | null }
    | { type: "floor"; key: number | null }
    | { type: "unit"; key: number | null }
    | { type: "focus"; propertyKey: number; floorKey: number; unitKey: number }
    | { type: "lens"; id: LensId }
    | { type: "period"; id: PeriodId }
    | { type: "back" };

const initial: MallState = { propertyKey: null, floorKey: null, unitKey: null, lensId: "category", periodId: "ltm" };

export function mallReducer(state: MallState, action: Action): MallState {
    switch (action.type) {
        case "property":
            return { ...state, propertyKey: action.key, floorKey: null, unitKey: null };
        case "floor":
            return { ...state, floorKey: action.key, unitKey: null };
        case "unit":
            return { ...state, unitKey: action.key };
        case "focus":
            return { ...state, propertyKey: action.propertyKey, floorKey: action.floorKey, unitKey: action.unitKey };
        case "lens":
            return { ...state, lensId: action.id };
        case "period":
            return { ...state, periodId: action.id };
        case "back":
            if (state.unitKey != null) return { ...state, unitKey: null };
            if (state.floorKey != null) return { ...state, floorKey: null };
            return { ...state, propertyKey: null };
    }
}

interface MallActions {
    selectProperty: (key: number | null) => void;
    selectFloor: (key: number | null) => void;
    selectUnit: (key: number | null) => void;
    /** Jumps straight to a store, setting its center and level too. */
    focusUnit: (propertyKey: number, floorKey: number, unitKey: number) => void;
    setLens: (id: LensId) => void;
    setPeriod: (id: PeriodId) => void;
    back: () => void;
}

const StateContext = createContext<(MallState & MallActions) | undefined>(undefined);

export function MallStateProvider({ children }: { children: ReactNode }) {
    const [state, dispatch] = useReducer(mallReducer, initial);
    const value = useMemo(
        () => ({
            ...state,
            selectProperty: (key: number | null) => dispatch({ type: "property", key }),
            selectFloor: (key: number | null) => dispatch({ type: "floor", key }),
            selectUnit: (key: number | null) => dispatch({ type: "unit", key }),
            focusUnit: (propertyKey: number, floorKey: number, unitKey: number) => dispatch({ type: "focus", propertyKey, floorKey, unitKey }),
            setLens: (id: LensId) => dispatch({ type: "lens", id }),
            setPeriod: (id: PeriodId) => dispatch({ type: "period", id }),
            back: () => dispatch({ type: "back" }),
        }),
        [state],
    );
    return <StateContext.Provider value={value}>{children}</StateContext.Provider>;
}

export function useMallState() {
    const ctx = useContext(StateContext);
    if (!ctx) throw new Error("useMallState must be used within MallStateProvider");
    return ctx;
}
