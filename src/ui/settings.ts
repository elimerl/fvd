import { UnitSystem } from "../core/constants";

export interface AppSettings {
    unitSystem: UnitSystem;
}

export const defaultSettings = (): AppSettings => {
    return {
        unitSystem: UnitSystem.Metric,
    };
};
