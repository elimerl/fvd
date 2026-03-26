export function metersToFeet(meters: number) {
    return 3.2808399 * meters;
}

export function metersPerSecondToMph(v: number) {
    return 2.2369363 * v;
}

export function metersPerSecondToKph(v: number) {
    return 3.6 * v;
}
export enum UnitSystem {
    Metric = "metric",
    MetricKph = "metric-kph",
    Imperial = "imperial",
}

export function distanceUnit(unitSystem: UnitSystem) {
    switch (unitSystem) {
        case UnitSystem.Metric:
            return "m";
        case UnitSystem.MetricKph:
            return "m";
        case UnitSystem.Imperial:
            return "ft";
    }
}

export function velocityUnit(unitSystem: UnitSystem) {
    switch (unitSystem) {
        case UnitSystem.Metric:
            return "m/s";
        case UnitSystem.MetricKph:
            return "km/h";
        case UnitSystem.Imperial:
            return "mph";
    }
}

export function metersPerSecondToUnit(v: number, unitSystem: UnitSystem) {
    switch (unitSystem) {
        case UnitSystem.Metric:
            return v;
        case UnitSystem.MetricKph:
            return metersPerSecondToKph(v);
        case UnitSystem.Imperial:
            return metersPerSecondToMph(v);
    }
}

export function metersToUnit(v: number, unitSystem: UnitSystem) {
    switch (unitSystem) {
        case UnitSystem.Metric:
            return v;
        case UnitSystem.MetricKph:
            return v;
        case UnitSystem.Imperial:
            return metersToFeet(v);
    }
}
