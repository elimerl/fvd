export const scrollLineHeight = 20;

export function deltaY(e: WheelEvent) {
    return e.deltaMode === 0 ? e.deltaY : e.deltaY * scrollLineHeight;
}

export function notNull<T>(a: T | undefined | null): T {
    return a!;
}

export function time<T>(f: () => T, label: string): T {
    const startTime = performance.now();
    const v = f();
    console.log(`${label} took ${(performance.now() - startTime).toFixed(3)}ms`);
    return v;
}
