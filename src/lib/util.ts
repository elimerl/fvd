import { TransitionCurve, Transitions } from "./core/Transitions";

// function getScrollLineHeight() {
//     var r;
//     var iframe = document.createElement("iframe");
//     iframe.src = "#";
//     document.body.appendChild(iframe);
//     var iwin = iframe.contentWindow;
//     var idoc = iwin!.document;
//     idoc.open();
//     idoc.write(
//         "<!DOCTYPE html><html><head></head><body><span>a</span></body></html>"
//     );
//     idoc.close();
//     var span = idoc.body.firstElementChild as HTMLElement;
//     r = span!.offsetHeight;
//     document.body.removeChild(iframe);
//     return r;
// }

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
    console.log(
        `${label} took ${(performance.now() - startTime).toFixed(3)}ms`
    );
    return v;
}
