<script lang="ts">
    import { onMount } from "svelte";
    import {
        Transitions,
        transitionsEvaluate,
        transitionsGetAtT,
        type Transition,
        evalCurve,
        evalTransition,
        transitionsLength,
        TransitionCurve,
    } from "../../core/Transitions";
    import * as _ from "lodash-es";
    import { scrollLineHeight } from "../util";
    import { keyState } from "../input";
    import type { Forces } from "../../core/Track";

    export let transitions: Transitions;
    export let selected:
        | { i: number; arr: "vert" | "lat" | "roll" }
        | undefined;

    export let startForces: Forces;

    let container: HTMLDivElement;
    let canvas: HTMLCanvasElement;
    let dragging: number | undefined = undefined;

    let zoomLevel = 5;
    let timeOffset: number = 0;

    const transformG = (g: number) => -g * 0.125 + 0.75;
    const transformRoll = (degPerS: number) => -degPerS * (1 / 400) + 0.75;

    function canvasMouseUp(ev: MouseEvent) {
        if (dragging && Math.abs(dragging) > 0.05) return;

        const rect = canvas.getBoundingClientRect();
        const pxX = ev.clientX - rect.left;
        const pxY = ev.clientY - rect.top;
        const { x: t, y: y } = invTransform(
            {
                x: pxX * window.devicePixelRatio,
                y: pxY * window.devicePixelRatio,
            },
            getGraphTransform(
                canvas.width,
                canvas.height,
                zoomLevel,
                timeOffset!,
            ),
        );
        const vert = transitionsEvaluate(transitions.vert, t, startForces.vert);
        const lat = transitionsEvaluate(transitions.lat, t, startForces.lat);
        const roll = transitionsEvaluate(transitions.roll, t, startForces.roll);

        const vertY = vert !== undefined ? transformG(vert) : Infinity;
        const latY = lat !== undefined ? transformG(lat) : Infinity;
        const rollY = roll !== undefined ? transformRoll(roll) : Infinity;

        const vertYDiff = Math.abs(vertY - y);
        const latYDiff = Math.abs(latY - y);
        const rollYDiff = Math.abs(rollY - y);

        const closest = Math.min(vertYDiff, rollYDiff, latYDiff, 10000);

        const selectedTransition = selected
            ? transitions[selected.arr][selected.i]
            : undefined;
        switch (closest) {
            case vertYDiff: {
                const newTransition = transitionsGetAtT(transitions.vert, t);
                if (selectedTransition !== newTransition) {
                    if (!newTransition) {
                        selected = undefined;
                    } else {
                        selected = {
                            i: transitions.vert.indexOf(newTransition),
                            arr: "vert",
                        };
                    }
                    break;
                }
            }

            case rollYDiff: {
                const newTransition = transitionsGetAtT(transitions.roll, t);
                if (selectedTransition !== newTransition) {
                    if (!newTransition) {
                        selected = undefined;
                    } else {
                        selected = {
                            i: transitions.roll.indexOf(newTransition),
                            arr: "roll",
                        };
                    }
                    break;
                }
            }
            case latYDiff: {
                const newTransition = transitionsGetAtT(transitions.lat, t);
                if (selectedTransition !== newTransition) {
                    if (!newTransition) {
                        selected = undefined;
                    } else {
                        selected = {
                            i: transitions.lat.indexOf(newTransition),
                            arr: "lat",
                        };
                    }
                    break;
                }
            }
            default:
                selected = undefined;
                break;
        }
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

    function drawGraph(
        transitions: Transitions,
        zoomLevel: number,
        timeOffset: number,
        selected: { i: number; arr: "vert" | "lat" | "roll" } | undefined,
    ) {
        const start = performance.now();
        canvas.width = canvas.clientWidth * (window.devicePixelRatio || 1);
        canvas.height = canvas.clientHeight * (window.devicePixelRatio || 1);

        const ctx = canvas.getContext("2d")!;

        ctx.resetTransform();
        ctx.fillStyle = "white";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        const transform = getGraphTransform(
            canvas.width,
            canvas.height,
            zoomLevel,
            timeOffset,
        );
        ctx.setTransform(transform);

        // gridlines
        for (
            let t = Math.floor(timeOffset / canvas.width);
            t < Math.ceil(timeOffset / canvas.width + zoomLevel);
            t++
        ) {
            ctx.strokeStyle = "grey";
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(
                t,

                (24 * window.devicePixelRatio) / canvas.height,
            );
            ctx.lineTo(t, 1);

            ctx.save();
            ctx.setTransform(1, 0, 0, 1, 0, 0);
            ctx.stroke();

            ctx.fillStyle = "black";
            ctx.textAlign = "center";
            ctx.font = `${
                (window.devicePixelRatio || 1) * 16
            }px "Overpass Variable"`;
            ctx.fillText(
                t + "s",
                (t - timeOffset / canvas.width) * (canvas.width / zoomLevel),
                18 * window.devicePixelRatio,
            );
            ctx.restore();
        }
        for (let g = -2; g < 6; g++) {
            ctx.strokeStyle = "grey";
            ctx.beginPath();
            ctx.moveTo(
                timeOffset / canvas.width +
                    ((32 * window.devicePixelRatio) / canvas.width) * zoomLevel,
                transformG(g),
            );
            ctx.lineTo(timeOffset / canvas.width + zoomLevel, transformG(g));

            ctx.save();
            ctx.setTransform(1, 0, 0, 1, 0, 0);
            ctx.stroke();

            ctx.fillStyle = "black";
            ctx.textAlign = "left";
            ctx.textBaseline = "middle";
            ctx.font = `${
                (window.devicePixelRatio || 1) * 16
            }px "Overpass Variable"`;
            ctx.fillText(
                g + "g",
                8 * window.devicePixelRatio,
                transformG(g) * canvas.height + 2,
            );
            ctx.restore();
        }

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
                                evalTransition(transition, x - timeAccum)! +
                                    value,
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

        drawTransitions(transitions.vert, startForces.vert, "blue", transformG);

        drawTransitions(transitions.lat, startForces.lat, "green", transformG);

        drawTransitions(
            transitions.roll,
            startForces.roll,
            "red",
            transformRoll,
        );
    }

    let frame = 0;

    $: if (canvas) drawGraph(transitions, zoomLevel, timeOffset, selected);

    onMount(() => {
        if (canvas) {
            drawGraph(transitions, zoomLevel, timeOffset, selected);
        }

        const observer = new ResizeObserver(() => {
            canvas.width = canvas.clientWidth * (window.devicePixelRatio || 1);
            canvas.height =
                canvas.clientHeight * (window.devicePixelRatio || 1);
        });
        observer.observe(canvas);
        return () => observer.disconnect();
    });

    function keyDown(ev: KeyboardEvent) {
        if (ev.code === "Backspace" && selected) {
            if (transitions[selected.arr].length > 1) {
                transitions[selected.arr].splice(selected.i, 1);
                transitions = transitions;
                selected = undefined;
            }
        }

        if (ev.code === "KeyQ" && selected) {
            const newTransition: Transition = {
                value: 0,
                length: 1,
                curve:
                    selected.arr === "vert"
                        ? TransitionCurve.Cubic
                        : TransitionCurve.Plateau,
                tension: 0,
                dynamicLength: false,
            };
            transitions[selected.arr].splice(selected.i, 0, newTransition);
            transitions = transitions;
            selected = {
                arr: selected.arr,
                i: selected.i,
            };
        }
    }

    function addTransition() {
        if (selected) {
            const newTransition: Transition = {
                value: 0,
                length: 1,
                curve:
                    selected.arr === "vert"
                        ? TransitionCurve.Cubic
                        : TransitionCurve.Plateau,
                tension: 0,
                dynamicLength: false,
            };
            transitions[selected.arr].splice(selected.i + 1, 0, newTransition);
            transitions = transitions;
            selected = {
                arr: selected.arr,
                i: selected.i + 1,
            };
        }
    }
</script>

<svelte:body
    on:keydown={(ev) => {
        if (ev.code === "KeyE") {
            addTransition();
        }
    }}
/>

<div
    bind:this={container}
    on:keydown={keyDown}
    class="overflow-clip overscroll-none w-full h-full"
    on:mousedown={(ev) => {
        if (ev.button === 0) {
            dragging = 0;
            canvas.focus();
        }

        if (ev.button === 2) {
            ev.preventDefault();
        }
    }}
    on:mouseup={(ev) => {
        if (ev.button === 0) {
            dragging = undefined;
        }
        if (ev.button === 2) {
            ev.preventDefault();
        }
    }}
    on:mousemove={(ev) => {
        if (dragging !== undefined) {
            timeOffset -= ev.movementX * zoomLevel * window.devicePixelRatio;
            timeOffset = _.clamp(timeOffset, 0, Infinity);
            dragging -= ev.movementX * zoomLevel * window.devicePixelRatio;
        }
    }}
    on:wheel={(ev) => {
        const deltaY =
            ev.deltaMode === 0 ? ev.deltaY : ev.deltaY * scrollLineHeight;
        zoomLevel = _.clamp(
            zoomLevel + deltaY * 0.005 * window.devicePixelRatio,
            0.5,
            30,
        );
        ev.preventDefault();
        ev.stopPropagation();
        return false;
    }}
>
    <div class="overflow-clip w-full h-full">
        <canvas
            tabindex="0"
            bind:this={canvas}
            class="w-full h-full border-none outline-none"
            on:mouseup={canvasMouseUp}
        />
    </div>
</div>
