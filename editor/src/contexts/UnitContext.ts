import { createContext, useContext } from "react";

export type UnitSystem = "metric" | "imperial";

export const UnitContext = createContext<{
    system: UnitSystem;
    setSystem: (s: UnitSystem) => void;
}>({
    system: "metric",
    setSystem: () => {},
});

export function useUnitSystem() {
    return useContext(UnitContext);
}
