import { NumberScroll } from "./NumberScroll";
import {
    Transitions,
    curveTypes,
    evalCurve,
    evalTransition,
    curveIntegral,
    rollStateAtTransitionStart,
    rollAngleAtTransitionEnd,
} from "../lib/core/Transitions";
import type { Forces } from "../lib/core/Track";
import { LabelWithHelp } from "./LabelWithHelp";

interface Props {
    selected: { i: number; arr: "vert" | "lat" | "roll" } | undefined;
    transitions: Transitions;
    startForces: Forces;
    onTransitionsChange: (t: Transitions) => void;
}

export function TransitionEditor({ selected, transitions, startForces, onTransitionsChange }: Props) {
    const selectedTransition = selected ? transitions[selected.arr][selected.i] : undefined;

    const update = (fn: () => void) => {
        fn();
        onTransitionsChange(transitions);
    };

    let startVal = 0;
    let peakVal = 0;
    let endVal = 0;
    let rollAngleStart = 0;
    let rollAngleEnd = 0;
    let setToZeroDenom = 0;
    if (selectedTransition && selected) {
        startVal = startForces[selected.arr];
        for (let k = 0; k < selected.i; k++) {
            startVal += evalCurve(transitions[selected.arr][k].curve, 1) * transitions[selected.arr][k].value;
        }
        endVal = startVal + evalCurve(selectedTransition.curve, 1) * selectedTransition.value;

        let peakAbs = Math.abs(startVal);
        peakVal = startVal;
        for (let p = 0; p <= 100; p++) {
            const t = (selectedTransition.length * p) / 100;
            const current = startVal + evalTransition(selectedTransition, t);
            const absVal = Math.abs(current);
            if (absVal > peakAbs) {
                peakAbs = absVal;
                peakVal = current;
            }
        }

        if (selected.arr === "roll") {
            const state = rollStateAtTransitionStart(
                transitions.roll,
                startForces.roll,
                selected.i
            );
            rollAngleStart = state.angleStart;
            rollAngleEnd = rollAngleAtTransitionEnd(
                transitions.roll,
                startForces.roll,
                selected.i
            );
            setToZeroDenom =
                selectedTransition.length *
                curveIntegral(
                    selectedTransition.curve,
                    1,
                    selectedTransition.center,
                    selectedTransition.tension
                );
        }
    }
    const unit = selected?.arr === "roll" ? "°/s" : "g";

    const setRollEndToZero = () => {
        if (!selected || selected.arr !== "roll") return;
        if (!selectedTransition) return;

        const state = rollStateAtTransitionStart(
            transitions.roll,
            startForces.roll,
            selected.i
        );

        const shapeIntegral =
            selectedTransition.length *
            curveIntegral(
                selectedTransition.curve,
                1,
                selectedTransition.center,
                selectedTransition.tension
            );
        if (Math.abs(shapeIntegral) < 1e-6) return;

        const requiredValue =
            -(state.angleStart + state.rateStart * selectedTransition.length) /
            shapeIntegral;
        update(() => {
            selectedTransition.value = requiredValue;
        });
    };

    return (
        <div className="w-1/3 flex flex-col p-2 overflow-y-auto bg-neutral-900 border-r border-neutral-700">
            <h1 className="font-semibold my-2 text-neutral-300">Transition Editor</h1>
            {selectedTransition && selected ? (
                <div className="flex flex-col gap-1">
                    <div className="flex items-center justify-between">
                        <label className="mr-2 inline-flex items-center gap-1 text-sm text-neutral-300">
                            <LabelWithHelp label="Dynamic Length" topic="dynamic-length" />
                            <input
                                type="checkbox"
                                checked={selectedTransition.dynamicLength}
                                onChange={(e) =>
                                    update(() => {
                                        selectedTransition.dynamicLength = e.target.checked;
                                    })
                                }
                            />
                        </label>
                        <NumberScroll
                            value={selectedTransition.length}
                            onChange={(v) => update(() => { selectedTransition.length = v; })}
                            fractionalDigits={1}
                            min={0.1}
                            max={100}
                            disabled={selectedTransition.dynamicLength}
                        />
                    </div>

                    <label className="flex items-center justify-between">
                        <span className="mr-2 text-sm text-neutral-300">
                            <LabelWithHelp label="Value" topic="transition-value" />
                        </span>
                        <NumberScroll
                            value={selectedTransition.value}
                            onChange={(v) => update(() => { selectedTransition.value = v; })}
                            fractionalDigits={selected.arr === "roll" ? 0 : 1}
                            unit={selected.arr === "roll" ? "°/s" : "g"}
                        />
                    </label>
                    <div className="text-xs text-neutral-400 flex justify-between border-t border-neutral-700 pt-1 mt-1">
                        <span>Start</span>
                        <span className="text-neutral-200 font-mono">{startVal.toFixed(2)} {unit}</span>
                    </div>
                    <div className="text-xs text-neutral-400 flex justify-between">
                        <span>Peak</span>
                        <span className="text-neutral-200 font-mono">{peakVal.toFixed(2)} {unit}</span>
                    </div>
                    <div className="text-xs text-neutral-400 flex justify-between">
                        <span>End</span>
                        <span className="text-neutral-200 font-mono">{endVal.toFixed(2)} {unit}</span>
                    </div>
                    {selected.arr === "roll" && (
                        <>
                            <div className="text-xs text-neutral-400 flex justify-between border-t border-neutral-700 pt-1 mt-1">
                                <span>Roll Angle @ Start</span>
                                <span className="text-neutral-200 font-mono">
                                    {rollAngleStart.toFixed(2)}°
                                </span>
                            </div>
                            <div className="text-xs text-neutral-400 flex justify-between">
                                <span>Roll Angle @ End</span>
                                <span className="text-neutral-200 font-mono">
                                    {rollAngleEnd.toFixed(2)}°
                                </span>
                            </div>
                            <button
                                className="button text-xs w-fit mt-1"
                                onClick={setRollEndToZero}
                                disabled={Math.abs(setToZeroDenom) < 1e-6}
                                title={
                                    Math.abs(setToZeroDenom) < 1e-6
                                        ? "Cannot solve: near-zero integral"
                                        : "Set end roll angle to 0°"
                                }
                            >
                                Set to 0°
                            </button>
                        </>
                    )}

                    <label className="flex items-center justify-between">
                        <span className="mr-2 text-sm text-neutral-300">
                            <LabelWithHelp label="Curve" topic="transition-curve" />
                        </span>
                        <select
                            className="px-1 py-0.5 m-0.5 rounded border border-neutral-600 bg-neutral-800 text-neutral-200 text-sm"
                            value={selectedTransition.curve}
                            onChange={(e) =>
                                update(() => {
                                    selectedTransition.curve = e.target.value as any;
                                })
                            }
                        >
                            {curveTypes.map((curve) => (
                                <option key={curve} value={curve}>
                                    {curve}
                                </option>
                            ))}
                        </select>
                    </label>

                    <label className="flex items-center justify-between">
                        <span className="mr-2 text-sm text-neutral-300">
                            <LabelWithHelp label="Center" topic="transition-center" />
                        </span>
                        <NumberScroll
                            value={selectedTransition.center}
                            onChange={(v) => update(() => { selectedTransition.center = v; })}
                        />
                    </label>

                    <label className="flex items-center justify-between">
                        <span className="mr-2 text-sm text-neutral-300">
                            <LabelWithHelp label="Tension" topic="transition-tension" />
                        </span>
                        <NumberScroll
                            value={selectedTransition.tension}
                            onChange={(v) => update(() => { selectedTransition.tension = v; })}
                        />
                    </label>
                </div>
            ) : (
                <span className="text-sm text-neutral-500 text-center mt-4">
                    no transition selected
                </span>
            )}
        </div>
    );
}
