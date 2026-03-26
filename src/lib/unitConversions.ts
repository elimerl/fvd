import type { UnitSystem } from "../contexts/UnitContext";

type UnitDef = {
    label: (s: UnitSystem) => string;
    toDisplay: (v: number, s: UnitSystem) => number;
    fromDisplay: (v: number, s: UnitSystem) => number;
};

export const UNIT_DEFS: Record<string, UnitDef> = {
    m: {
        label: (s) => (s === "imperial" ? "ft" : "m"),
        toDisplay: (v, s) => (s === "imperial" ? v * 3.28084 : v),
        fromDisplay: (v, s) => (s === "imperial" ? v / 3.28084 : v),
    },
    "m/s": {
        label: (s) => (s === "imperial" ? "mph" : "m/s"),
        toDisplay: (v, s) => (s === "imperial" ? v * 2.23694 : v),
        fromDisplay: (v, s) => (s === "imperial" ? v / 2.23694 : v),
    },
};

export function getUnitLabel(unit: string, system: UnitSystem): string {
    return UNIT_DEFS[unit]?.label(system) ?? unit;
}

export function toDisplay(value: number, unit: string, system: UnitSystem): number {
    return UNIT_DEFS[unit]?.toDisplay(value, system) ?? value;
}

export function fromDisplay(value: number, unit: string, system: UnitSystem): number {
    return UNIT_DEFS[unit]?.fromDisplay(value, system) ?? value;
}
