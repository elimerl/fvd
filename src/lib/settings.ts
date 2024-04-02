import { UnitSystem } from "../core/constants";

export interface AppSettings {
    unitSystem: UnitSystem;
    darkMode: boolean;
}

export const defaultSettings = (darkMode: boolean = true): AppSettings => {
    return {
        unitSystem: UnitSystem.Metric,
        darkMode,
    };
};
