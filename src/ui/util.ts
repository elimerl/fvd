import { TransitionCurve, Transitions } from "../core/Transitions";

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

export function testTransitions(): Transitions {
    const transitions = new Transitions(1, 0, 0);
    transitions.lat[0].length = 30;
    transitions.roll[0].length = 6.8;
    transitions.roll[0].curve = TransitionCurve.Plateau;
    transitions.roll[0].value = 0;

    transitions.roll.push({
        length: 3,
        curve: TransitionCurve.Plateau,
        tension: 0,
        value: 180,
    });
    transitions.vert.pop();
    transitions.vert.push({
        curve: TransitionCurve.Cubic,
        length: 1.5,
        tension: 0,
        value: -1.5,
    });
    transitions.vert.push({
        curve: TransitionCurve.Cubic,
        length: 0.3,
        tension: 0,
        value: 0,
    });
    transitions.vert.push({
        curve: TransitionCurve.Cubic,
        length: 1,
        tension: 0,
        value: 4,
    });
    transitions.vert.push({
        curve: TransitionCurve.Cubic,
        length: 3.5,
        tension: 0,
        value: 0,
    });
    transitions.vert.push({
        curve: TransitionCurve.Plateau,
        length: 3.5,
        tension: -1,
        value: -3.5,
    });
    return transitions;
}

export function notNull<T>(a: T | undefined | null): T {
    return a!;
}
