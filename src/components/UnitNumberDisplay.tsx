import type { UnitSystem } from "../contexts/UnitContext";
import { getUnitLabel, toDisplay } from "../lib/unitConversions";
import { NumberDisplay } from "./NumberDisplay";

interface Props {
    label: string;
    value: number;
    baseUnit: "distance" | "velocity";
    unitSystem: UnitSystem;
    parentheses?: boolean;
    plusPositive?: boolean;
    fractionalDigits?: number;
}

export function UnitNumberDisplay({
    label,
    value,
    baseUnit,
    unitSystem,
    parentheses,
    plusPositive,
    fractionalDigits = 2,
}: Props) {
    const base = baseUnit === "distance" ? "m" : "m/s";
    const valueConverted = toDisplay(value, base, unitSystem);
    const unit = getUnitLabel(base, unitSystem);

    return (
        <NumberDisplay
            label={label}
            value={valueConverted}
            unit={unit}
            fractionalDigits={fractionalDigits}
            parentheses={parentheses}
            plusPositive={plusPositive}
        />
    );
}
