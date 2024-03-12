import mitt from "mitt";

export const keyState = {
    down: new Set<string>(),
    ctrl: false,
    shift: false,
    alt: false,
};

export function keydownHandler(ev: KeyboardEvent) {
    if (
        ev.code !== "ControlLeft" &&
        ev.code !== "ControlRight" &&
        ev.code !== "ShiftLeft" &&
        ev.code !== "ShiftRight" &&
        ev.code !== "AltLeft" &&
        ev.code !== "AltRight"
    ) {
        keyState.down.add(ev.code);
    }
    keyState.ctrl = ev.ctrlKey;
    keyState.shift = ev.shiftKey;
    keyState.alt = ev.altKey;
}
export function keyupHandler(ev: KeyboardEvent) {
    keyState.down.delete(ev.code);
    keyState.ctrl = ev.ctrlKey;
    keyState.shift = ev.shiftKey;
    keyState.alt = ev.altKey;
}
