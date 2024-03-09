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
    } from "../../core/Transitions";
    import * as _ from "lodash-es";
    import { scrollLineHeight } from "../util";

    export let transitions: Transitions;
    export let selected: Transition | undefined;

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
        const vert = transitionsEvaluate(
            transitions.vert,
            t,
            transitions.vertStart,
        );
        const lat = transitionsEvaluate(
            transitions.lat,
            t,
            transitions.latStart,
        );
        const roll = transitionsEvaluate(
            transitions.roll,
            t,
            transitions.rollStart,
        );

        const vertY = vert !== undefined ? transformG(vert) : Infinity;
        const latY = lat !== undefined ? transformG(lat) : Infinity;
        const rollY = roll !== undefined ? transformRoll(roll) : Infinity;

        const vertYDiff = Math.abs(vertY - y);
        const latYDiff = Math.abs(latY - y);
        const rollYDiff = Math.abs(rollY - y);

        const closest = Math.min(vertYDiff, rollYDiff, latYDiff, 10000);

        switch (closest) {
            case vertYDiff: {
                const newTransition = transitionsGetAtT(transitions.vert, t);
                if (selected !== newTransition) {
                    selected = newTransition;
                    break;
                }
            }
            case latYDiff: {
                const newTransition = transitionsGetAtT(transitions.lat, t);
                if (selected !== newTransition) {
                    selected = newTransition;
                    break;
                }
            }
            case rollYDiff: {
                const newTransition = transitionsGetAtT(transitions.roll, t);
                if (selected !== newTransition) {
                    selected = newTransition;
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

    function drawGraph() {
        const start = performance.now();
        canvas.width = canvas.clientWidth * (window.devicePixelRatio || 1);
        canvas.height = canvas.clientHeight * (window.devicePixelRatio || 1);

        const ctx = canvas.getContext("2d")!;

        ctx.resetTransform();
        ctx.clearRect(0, 0, canvas.width, canvas.height);
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
            ctx.moveTo(t, 0.08);
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
                timeOffset / canvas.width + 0.018 * zoomLevel,
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
                (-g * 0.125 + 0.75) * canvas.height + 2,
            );
            ctx.restore();
        }

        function drawTransitions(
            transitions: Transition[],
            startValue: number,
            color: string,
            transformFunc: (value: number) => number,
        ) {
            if (transitionsLength(transitions) > 0) {
                let value = startValue;
                let timeAccum = 0;

                for (const transition of transitions) {
                    ctx.beginPath();
                    ctx.moveTo(timeAccum, transformFunc(value));

                    const step =
                        Math.abs(transition.value) < 0.01
                            ? transition.length
                            : 0.01 * (zoomLevel / 3);
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
                    ctx.lineWidth = transition === selected ? 4 : 2;
                    ctx.strokeStyle = color;
                    ctx.setTransform(1, 0, 0, 1, 0, 0);
                    ctx.stroke();
                    ctx.restore();
                }
            }
        }

        drawTransitions(
            transitions.vert,
            transitions.vertStart,
            "blue",
            transformG,
        );

        drawTransitions(
            transitions.lat,
            transitions.latStart,
            "green",
            transformG,
        );

        drawTransitions(
            transitions.roll,
            transitions.rollStart,
            "red",
            transformRoll,
        );

        console.log((performance.now() - start).toFixed(1) + "ms");
    }

    function frameHandler() {
        drawGraph();
        requestAnimationFrame(frameHandler);
    }

    let frame = requestAnimationFrame(frameHandler);

    onMount(() => {
        frame = requestAnimationFrame(frameHandler);

        return () => cancelAnimationFrame(frame);
    });
</script>

<div
    bind:this={container}
    class="overflow-clip overscroll-none w-full"
    on:mousedown={() => {
        dragging = 0;
    }}
    on:mouseup={() => {
        dragging = undefined;
    }}
    on:mousemove={(ev) => {
        if (dragging !== undefined) {
            timeOffset -= ev.movementX * zoomLevel * 2;
            dragging -= ev.movementX * zoomLevel * 2;
        }
    }}
    on:wheel={(ev) => {
        const deltaY =
            ev.deltaMode === 0 ? ev.deltaY : ev.deltaY * scrollLineHeight;
        zoomLevel = _.clamp(zoomLevel + deltaY * 0.005, 0.5, 30);
        ev.preventDefault();
        ev.stopPropagation();
        return false;
    }}
>
    <div class="overflow-clip w-full">
        <canvas
            bind:this={canvas}
            class="w-full h-64"
            on:mouseup={canvasMouseUp}
        />
    </div>
</div>
