import { useEffect, useRef, useState } from "react";
import { Trash2 } from "lucide-react";
import * as _ from "lodash-es";
import {
    Transitions,
    transitionsEvaluate,
    transitionsGetAtT,
    transitionsLength,
    rollAngleEvaluateAtT,
    type Transition,
    evalCurve,
    evalTransition,
    TransitionCurve,
} from "../lib/core/Transitions";
import { scrollLineHeight } from "../lib/util";
import type { Forces } from "../lib/core/Track";

interface Props {
    transitions: Transitions;
    selected: { i: number; arr: "vert" | "lat" | "roll" } | undefined;
    onSelectedChange: (
        s: { i: number; arr: "vert" | "lat" | "roll" } | undefined,
    ) => void;
    onTransitionsChange: (t: Transitions) => void;
    startForces: Forces;
    markerTime: number;
    trackRollAngleAtTime?: (t: number) => number | undefined;
}

const transformG = (g: number) => -g * 0.125 + 0.72;

function getGraphTransform(
    width: number,
    height: number,
    zoomLevel: number,
    timeOffset: number,
) {
    return new DOMMatrix()
        .scale(width / zoomLevel, height)
        .translate(-timeOffset / width, 0);
}

function invTransform(
    { x, y }: { x: number; y: number },
    transformOrig: DOMMatrix,
) {
    const transform = transformOrig.inverse();
    return {
        x: x * transform.a + y * transform.c + transform.e,
        y: x * transform.b + y * transform.d + transform.f,
    };
}

function makeTransition(arr: "vert" | "lat" | "roll"): Transition {
    return {
        value: 0,
        length: 1,
        curve: arr === "vert" ? TransitionCurve.Cubic : TransitionCurve.Plateau,
        center: 0,
        tension: 0,
        dynamicLength: false,
    };
}

type RollRange = { min: number; max: number };

function getRollSharedRange(
    transitions: Transitions,
    startRollRate: number,
    tStart: number,
    tEnd: number,
    trackRollAngleAtTime?: (t: number) => number | undefined,
): RollRange {
    let min = Infinity;
    let max = -Infinity;
    const steps = 240;

    for (let i = 0; i <= steps; i++) {
        const t = tStart + ((tEnd - tStart) * i) / steps;
        const rollRate = transitionsEvaluate(transitions.roll, t, startRollRate);
        const rollAngle =
            trackRollAngleAtTime?.(t) ??
            rollAngleEvaluateAtT(transitions.roll, startRollRate, t);

        if (rollRate !== undefined && Number.isFinite(rollRate)) {
            min = Math.min(min, rollRate);
            max = Math.max(max, rollRate);
        }
        if (rollAngle !== undefined && Number.isFinite(rollAngle)) {
            min = Math.min(min, rollAngle);
            max = Math.max(max, rollAngle);
        }
    }

    if (!Number.isFinite(min) || !Number.isFinite(max)) {
        return { min: -100, max: 100 };
    }

    min = Math.min(min, 0);
    max = Math.max(max, 0);

    if (Math.abs(max - min) < 1e-6) {
        const pad = Math.max(1, Math.abs(max) * 0.2);
        return { min: min - pad, max: max + pad };
    }

    const pad = (max - min) * 0.15;
    return { min: min - pad, max: max + pad };
}

function makeRollTransform(range: RollRange, canvasHeight: number, dpr: number) {
    const top = (24 * dpr) / canvasHeight;
    const bottom = 1;
    const span = Math.max(range.max - range.min, 1e-6);

    return (value: number) => top + ((range.max - value) / span) * (bottom - top);
}

export function Graph({
    transitions,
    selected,
    onSelectedChange,
    onTransitionsChange,
    startForces,
    markerTime,
    trackRollAngleAtTime,
}: Props) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const zoomLevelRef = useRef(5);
    const timeOffsetRef = useRef(0);
    const draggingRef = useRef<number | undefined>(undefined);
    const [zoomLevel, setZoomLevel] = useState(5);
    const [timeOffset, setTimeOffset] = useState(0);

    useEffect(() => {
        zoomLevelRef.current = zoomLevel;
    }, [zoomLevel]);

    useEffect(() => {
        timeOffsetRef.current = timeOffset;
    }, [timeOffset]);

    const addBefore = () => {
        if (!selected) return;
        transitions[selected.arr].splice(
            selected.i,
            0,
            makeTransition(selected.arr),
        );
        onTransitionsChange(transitions);
        onSelectedChange({ arr: selected.arr, i: selected.i });
    };

    const addAfter = () => {
        if (!selected) return;
        transitions[selected.arr].splice(
            selected.i + 1,
            0,
            makeTransition(selected.arr),
        );
        onTransitionsChange(transitions);
        onSelectedChange({ arr: selected.arr, i: selected.i + 1 });
    };

    const deleteSelected = () => {
        if (!selected) return;
        if (transitions[selected.arr].length <= 1) return;
        transitions[selected.arr].splice(selected.i, 1);
        onTransitionsChange(transitions);
        onSelectedChange(undefined);
    };

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        drawGraph(
            canvas,
            transitions,
            zoomLevel,
            timeOffset,
            selected,
            markerTime,
            startForces,
            trackRollAngleAtTime,
        );
    });

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const handler = (ev: WheelEvent) => {
            const rect = canvas.getBoundingClientRect();
            const dpr = window.devicePixelRatio || 1;
            const pxX = (ev.clientX - rect.left) * dpr;
            const width = canvas.width || 1;
            const xRatio = _.clamp(pxX / width, 0, 1);
            const deltaY =
                ev.deltaMode === 0 ? ev.deltaY : ev.deltaY * scrollLineHeight;
            const currentZoom = zoomLevelRef.current;
            const currentOffset = timeOffsetRef.current;
            const nextZoom = _.clamp(
                currentZoom * Math.exp(deltaY * 0.001),
                0.5,
                30,
            );
            const tAtCursor = currentOffset / width + xRatio * currentZoom;
            const nextOffset = _.clamp(
                (tAtCursor - xRatio * nextZoom) * width,
                0,
                Infinity,
            );

            setZoomLevel(nextZoom);
            setTimeOffset(nextOffset);
            ev.preventDefault();
            ev.stopPropagation();
        };
        canvas.addEventListener("wheel", handler, { passive: false });
        return () => canvas.removeEventListener("wheel", handler);
    }, []);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const observer = new ResizeObserver(() => {
            canvas.width = canvas.clientWidth * (window.devicePixelRatio || 1);
            canvas.height =
                canvas.clientHeight * (window.devicePixelRatio || 1);
        });
        observer.observe(canvas);
        return () => observer.disconnect();
    }, []);

    useEffect(() => {
        const handler = (ev: KeyboardEvent) => {
            const tag = document.activeElement?.tagName;
            if (tag === "INPUT" || tag === "TEXTAREA") return;

            if (ev.code === "Backspace" && selected) {
                ev.preventDefault();
                deleteSelected();
            }
            if (ev.code === "KeyQ" && selected) {
                ev.preventDefault();
                addBefore();
            }
            if (ev.code === "KeyE" && selected) {
                ev.preventDefault();
                addAfter();
            }
        };
        window.addEventListener("keydown", handler);
        return () => window.removeEventListener("keydown", handler);
    }, [selected, transitions, onTransitionsChange, onSelectedChange]);

    const handleMouseDown = (ev: React.MouseEvent) => {
        if (ev.button === 0) {
            draggingRef.current = 0;
            canvasRef.current?.focus();
        }
        if (ev.button === 2) ev.preventDefault();
    };

    const handleMouseUp = (ev: React.MouseEvent) => {
        if (ev.button === 0) {
            const canvas = canvasRef.current;
            if (
                canvas &&
                draggingRef.current !== undefined &&
                Math.abs(draggingRef.current) <= 1
            ) {
                const rect = canvas.getBoundingClientRect();
                const pxX = ev.clientX - rect.left;
                const pxY = ev.clientY - rect.top;
                const dpr = window.devicePixelRatio || 1;
                const { x: t, y } = invTransform(
                    {
                        x: pxX * dpr,
                        y: pxY * dpr,
                    },
                    getGraphTransform(
                        canvas.width,
                        canvas.height,
                        zoomLevel,
                        timeOffset,
                    ),
                );

                const tStart = timeOffset / canvas.width;
                const tEnd = tStart + zoomLevel;
                const rollRange = getRollSharedRange(
                    transitions,
                    startForces.roll,
                    tStart,
                    tEnd,
                    trackRollAngleAtTime,
                );
                const transformRoll = makeRollTransform(
                    rollRange,
                    canvas.height,
                    dpr,
                );

                const vert = transitionsEvaluate(
                    transitions.vert,
                    t,
                    startForces.vert,
                );
                const lat = transitionsEvaluate(
                    transitions.lat,
                    t,
                    startForces.lat,
                );
                const rollRate = transitionsEvaluate(
                    transitions.roll,
                    t,
                    startForces.roll,
                );
                const rollAngle =
                    trackRollAngleAtTime?.(t) ??
                    rollAngleEvaluateAtT(
                        transitions.roll,
                        startForces.roll,
                        t,
                    );

                const vertY = vert !== undefined ? transformG(vert) : Infinity;
                const latY = lat !== undefined ? transformG(lat) : Infinity;
                const rollRateY =
                    rollRate !== undefined ? transformRoll(rollRate) : Infinity;
                const rollAngleY =
                    rollAngle !== undefined ? transformRoll(rollAngle) : Infinity;

                const diffs = [
                    { arr: "vert" as const, d: Math.abs(vertY - y) },
                    { arr: "roll" as const, d: Math.abs(rollRateY - y) },
                    { arr: "roll" as const, d: Math.abs(rollAngleY - y) },
                    { arr: "lat" as const, d: Math.abs(latY - y) },
                ].sort((a, b) => a.d - b.d);

                const THRESHOLD = 0.05;
                const candidates = diffs.filter((x) => x.d < THRESHOLD);

                if (candidates.length === 0) {
                    onSelectedChange(undefined);
                } else {
                    let pickIdx = 0;
                    if (selected) {
                        const curIdx = candidates.findIndex((c) => {
                            const t2 = transitionsGetAtT(transitions[c.arr], t);
                            return (
                                !!t2 &&
                                transitions[c.arr][selected.i] === t2 &&
                                selected.arr === c.arr
                            );
                        });
                        if (curIdx !== -1)
                            pickIdx = (curIdx + 1) % candidates.length;
                    }
                    const { arr } = candidates[pickIdx];
                    const newT = transitionsGetAtT(transitions[arr], t);
                    onSelectedChange(
                        newT
                            ? { i: transitions[arr].indexOf(newT), arr }
                            : undefined,
                    );
                }
            }
            draggingRef.current = undefined;
        }
        if (ev.button === 2) ev.preventDefault();
    };

    const handleMouseMove = (ev: React.MouseEvent) => {
        if (draggingRef.current !== undefined) {
            const delta = ev.movementX * zoomLevel * window.devicePixelRatio;
            setTimeOffset((o) => _.clamp(o - delta, 0, Infinity));
            draggingRef.current -= delta;
        }
    };

    return (
        <div
            className="w-full h-full"
            onMouseDown={handleMouseDown}
            onMouseUp={handleMouseUp}
            onMouseMove={handleMouseMove}
            onContextMenu={(e) => e.preventDefault()}
        >
            <div className="relative overflow-clip w-full h-full">
                <div className="absolute top-1 right-1 flex items-center gap-1.5 z-10 pointer-events-none select-none text-xs text-neutral-500">
                    <span style={{ color: "#60a5fa" }}>● vert</span>
                    <span style={{ color: "#4ade80" }}>● lat</span>
                    <span style={{ color: "#f87171" }}>● roll-rate</span>
                    <span style={{ color: "#fbbf24" }}>● roll-angle</span>
                </div>
                {selected && (
                    <div className="absolute top-1 left-1 flex gap-1 z-10 pointer-events-auto">
                        <button
                            onClick={addBefore}
                            className="button text-xs py-0 px-1"
                            title="Add before (Q)"
                        >
                            Before
                        </button>
                        <button
                            onClick={addAfter}
                            className="button text-xs py-0 px-1"
                            title="Add after (E)"
                        >
                            After
                        </button>
                        <button
                            onClick={deleteSelected}
                            className="button text-xs py-0 px-1"
                            title="Delete (⌫)"
                        >
                            <Trash2 size={11} />
                        </button>
                    </div>
                )}
                <canvas
                    ref={canvasRef}
                    tabIndex={0}
                    className="w-full h-full border-none outline-none"
                />
            </div>
        </div>
    );
}

function drawGraph(
    canvas: HTMLCanvasElement,
    transitions: Transitions,
    zoomLevel: number,
    timeOffset: number,
    selected: { i: number; arr: "vert" | "lat" | "roll" } | undefined,
    markerTime: number,
    startForces: Forces,
    trackRollAngleAtTime?: (t: number) => number | undefined,
) {
    canvas.width = canvas.clientWidth * (window.devicePixelRatio || 1);
    canvas.height = canvas.clientHeight * (window.devicePixelRatio || 1);

    const ctx = canvas.getContext("2d")!;
    const dpr = window.devicePixelRatio || 1;

    ctx.resetTransform();
    ctx.fillStyle = "#1a1a1a";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const tStart = timeOffset / canvas.width;
    const tEnd = tStart + zoomLevel;
    const rollRange = getRollSharedRange(
        transitions,
        startForces.roll,
        tStart,
        tEnd,
        trackRollAngleAtTime,
    );
    const transformRoll = makeRollTransform(rollRange, canvas.height, dpr);

    const transform = getGraphTransform(
        canvas.width,
        canvas.height,
        zoomLevel,
        timeOffset,
    );
    ctx.setTransform(transform);

    ctx.strokeStyle = "#6b7280";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(markerTime, (24 * dpr) / canvas.height);
    ctx.lineTo(markerTime, 1);
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.stroke();
    ctx.restore();

    for (
        let t = Math.floor(timeOffset / canvas.width);
        t < Math.ceil(timeOffset / canvas.width + zoomLevel);
        t++
    ) {
        ctx.strokeStyle = "#333";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(t, (24 * dpr) / canvas.height);
        ctx.lineTo(t, 1);
        ctx.save();
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.stroke();
        ctx.fillStyle = "#777";
        ctx.textAlign = "center";
        ctx.font = `${dpr * 16}px \"Overpass Variable\"`;
        ctx.fillText(
            `${t}s`,
            (t - timeOffset / canvas.width) * (canvas.width / zoomLevel),
            18 * dpr,
        );
        ctx.restore();
    }

    for (let g = -2; g < 6; g++) {
        ctx.strokeStyle = "#333";
        ctx.beginPath();
        ctx.moveTo(
            timeOffset / canvas.width +
                ((32 * dpr) / canvas.width) * zoomLevel,
            transformG(g),
        );
        ctx.lineTo(timeOffset / canvas.width + zoomLevel, transformG(g));
        ctx.save();
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.stroke();
        ctx.fillStyle = "#777";
        ctx.textAlign = "left";
        ctx.textBaseline = "middle";
        ctx.font = `${dpr * 16}px \"Overpass Variable\"`;
        ctx.fillText(
            `${g}g`,
            8 * dpr,
            transformG(g) * canvas.height + 2,
        );
        ctx.restore();
    }

    // Right-side roll axis labels (shared scale for roll-rate and roll-angle).
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.strokeStyle = "#444";
    ctx.beginPath();
    ctx.moveTo(canvas.width - 1.5 * dpr, 24 * dpr);
    ctx.lineTo(canvas.width - 1.5 * dpr, canvas.height);
    ctx.stroke();

    const labelVals = [rollRange.max, 0, rollRange.min];
    const usedYs: number[] = [];
    ctx.fillStyle = "#777";
    ctx.font = `${dpr * 13}px \"Overpass Mono Variable\"`;
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    for (const value of labelVals) {
        const y = transformRoll(value) * canvas.height;
        if (usedYs.some((u) => Math.abs(u - y) < 12 * dpr)) continue;
        usedYs.push(y);
        ctx.fillText(`${value.toFixed(0)}`, canvas.width - 6 * dpr, y);
    }
    ctx.fillText("roll", canvas.width - 6 * dpr, 12 * dpr);
    ctx.restore();

    function drawTransitions(
        transitionList: Transition[],
        startValue: number,
        color: string,
        transformFunc: (value: number) => number,
    ) {
        if (transitionsLength(transitionList) > 0) {
            let value = startValue;
            let timeAccum = 0;

            for (const transition of transitionList) {
                ctx.beginPath();
                ctx.moveTo(timeAccum, transformFunc(value));

                const step =
                    Math.abs(transition.value) < 0.01
                        ? transition.length
                        : 0.01 * (zoomLevel / 10);
                for (
                    let x = timeAccum;
                    x <= transition.length + timeAccum;
                    x += step
                ) {
                    ctx.lineTo(
                        x,
                        transformFunc(
                            evalTransition(transition, x - timeAccum)! + value,
                        ),
                    );
                }
                ctx.lineTo(
                    timeAccum + transition.length,
                    transformFunc(
                        evalCurve(transition.curve, 1) * transition.value +
                            value,
                    ),
                );
                value += evalCurve(transition.curve, 1) * transition.value;
                timeAccum += transition.length;

                ctx.save();
                ctx.lineWidth =
                    selected &&
                    transition === transitions[selected.arr][selected.i]
                        ? 4
                        : 2;
                ctx.strokeStyle = color;
                ctx.setTransform(1, 0, 0, 1, 0, 0);
                ctx.stroke();
                ctx.restore();
            }
        }
    }

    drawTransitions(transitions.vert, startForces.vert, "#60a5fa", transformG);
    drawTransitions(transitions.lat, startForces.lat, "#4ade80", transformG);
    drawTransitions(
        transitions.roll,
        startForces.roll,
        "#f87171",
        transformRoll,
    );

    // Draw roll-angle sampled from track geometry when available.
    const samples = 360;
    ctx.beginPath();
    let started = false;
    for (let i = 0; i <= samples; i++) {
        const t = tStart + ((tEnd - tStart) * i) / samples;
        const angle =
            trackRollAngleAtTime?.(t) ??
            rollAngleEvaluateAtT(transitions.roll, startForces.roll, t);
        if (angle === undefined) continue;

        const y = transformRoll(angle);
        if (!started) {
            ctx.moveTo(t, y);
            started = true;
        } else {
            ctx.lineTo(t, y);
        }
    }
    if (started) {
        ctx.save();
        ctx.lineWidth = 2;
        ctx.strokeStyle = "#fbbf24";
        ctx.setLineDash([6, 4]);
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.restore();
    }
}
