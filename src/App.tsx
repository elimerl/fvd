import { Fragment, useEffect, useReducer, useRef, useState } from "react";
import * as THREE from "three";
import { Sky } from "three/addons/objects/Sky.js";

import {
    TransitionCurve,
    Transitions,
    evalCurve,
    evalTransition,
    fixAngleRange,
    integrate,
    toZeroRoll,
    transitionsEvaluate,
    transitionsLength,
} from "./core/Transitions";
import { defaultFvdConfig, fvd } from "./core/fvd";
import { qrotate, vec, vsub } from "./core/math";
import { InfiniteGridHelper } from "./InfiniteGridHelper";
import { TrackPoint, TrackSpline } from "./core/TrackSpline";
import * as _ from "lodash-es";
import {
    metersPerSecondToKph,
    metersPerSecondToMph,
    metersToFeet,
} from "./core/constants";

import { showSaveFilePicker } from "file-system-access";

function resizeCanvasToDisplaySize(
    renderer: THREE.WebGLRenderer,
    camera: THREE.PerspectiveCamera
) {
    const canvas = renderer.domElement;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;

    if (canvas.width !== width || canvas.height !== height) {
        renderer.setSize(width, height, false);
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
    }
}

let renderer: THREE.WebGLRenderer;
let camera: THREE.PerspectiveCamera;
let scene: THREE.Scene;
let spline: TrackSpline;

const povState = {
    pos: 0,
};

enum UnitSystem {
    Metric = "metric",
    MetricKph = "metric-kph",
    Imperial = "imperial",
}

function App() {
    const [unitSystem, setUnitSystem] = useState(UnitSystem.Imperial);

    let speedUnit: string;
    let distanceUnit: string;

    switch (unitSystem) {
        case UnitSystem.Metric:
            distanceUnit = "m";
            speedUnit = "m/s";
            break;
        case UnitSystem.MetricKph:
            distanceUnit = "m";
            speedUnit = "kph";
            break;
        case UnitSystem.Imperial:
            distanceUnit = "ft";
            speedUnit = "mph";
            break;
    }

    const convertSpeed = (velocity: number) => {
        switch (unitSystem) {
            case UnitSystem.Imperial:
                return metersPerSecondToMph(velocity);
            case UnitSystem.MetricKph:
                return metersPerSecondToKph(velocity);
            case UnitSystem.Metric:
                return velocity;
        }
    };

    const convertDistance = (dist: number) => {
        switch (unitSystem) {
            case UnitSystem.Imperial:
                return metersToFeet(dist);
            case UnitSystem.MetricKph:
            case UnitSystem.Metric:
                return dist;
        }
    };

    const [, forceUpdate] = useReducer((x) => x + 1, 0);

    const [transitions] = useState(() => {
        const transitions = new Transitions(1, 0, 0);
        transitions.lat[0].length = 30;
        transitions.roll[0].length = 7.8;
        transitions.roll[0].curve = TransitionCurve.Plateau;
        transitions.roll[0].value = 0;

        transitions.roll.push({
            length: 3.5,
            curve: TransitionCurve.Plateau,
            tension: 2,
            value: 200,
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
            length: 4.6,
            tension: 0,
            value: 0,
        });
        transitions.vert.push({
            curve: TransitionCurve.Plateau,
            length: 4,
            tension: 0,
            value: -3.5,
        });

        return transitions;
    });

    const canvasThree = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        if (canvasThree.current && !renderer) {
            spline = fvd(transitions, vec(0, 1, 0), 3, defaultFvdConfig());
            console.log(spline.exportToNl2Elem());
            renderer = new THREE.WebGLRenderer({
                antialias: true,
                canvas: canvasThree.current,
                powerPreference: "low-power",
            });
            renderer.setPixelRatio(window.devicePixelRatio);
            renderer.toneMapping = THREE.ACESFilmicToneMapping;
            renderer.toneMappingExposure = 0.5;

            camera = new THREE.PerspectiveCamera(80, 2, 0.1, 1000);
            camera.position.z = 0;
            camera.position.y = 2;
            camera.position.x = 2;
            camera.lookAt(new THREE.Vector3());

            scene = new THREE.Scene();
            scene.background = new THREE.Color("white");

            const light = new THREE.DirectionalLight(0xffffff, 1);
            light.position.set(0, 1, 0); //default; light shining from top
            light.castShadow = true; // default false

            const grid = new InfiniteGridHelper(
                1,
                10,
                new THREE.Color("black"),
                200,
                "xzy"
            );
            scene.add(grid);

            const heartlineGeometry = new THREE.BufferGeometry().setFromPoints(
                spline.points.map(
                    (v) => new THREE.Vector3(v.pos[0], v.pos[1], v.pos[2])
                )
            );

            const heartlineMat = new THREE.LineBasicMaterial({
                color: new THREE.Color("red"),
            });

            const heartline = new THREE.Line(heartlineGeometry, heartlineMat);
            scene.add(heartline);

            const heartlineOffset = 1.1;

            const leftRailGeometry = new THREE.BufferGeometry().setFromPoints(
                spline.points.map((v) => {
                    const [x, y, z] = vsub(
                        v.pos,
                        qrotate(vec(-0.35, heartlineOffset, 0), v.rot)
                    );
                    return new THREE.Vector3(x, y, z);
                })
            );
            const rightRailGeometry = new THREE.BufferGeometry().setFromPoints(
                spline.points.map((v) => {
                    const [x, y, z] = vsub(
                        v.pos,
                        qrotate(vec(0.35, heartlineOffset, 0), v.rot)
                    );
                    return new THREE.Vector3(x, y, z);
                })
            );

            const railMat = new THREE.LineBasicMaterial({
                color: new THREE.Color("blue"),
            });

            const leftRail = new THREE.Line(leftRailGeometry, railMat);
            scene.add(leftRail);

            const rightRail = new THREE.Line(rightRailGeometry, railMat);
            scene.add(rightRail);
        }

        const start = spline.evaluate(povState.pos);
        if (!start) throw new Error("no point");
        camera.position.set(start.pos[0], start.pos[1], start.pos[2]);
        camera.setRotationFromQuaternion(
            new THREE.Quaternion(
                start.rot[1],
                start.rot[2],
                start.rot[3],
                start.rot[0]
            ).multiply(
                new THREE.Quaternion().setFromAxisAngle(
                    new THREE.Vector3(0, 1, 0),
                    Math.PI
                )
            )
        );

        resizeCanvasToDisplaySize(renderer, camera);

        renderer.render(scene, camera);
    }, [canvasThree, povState.pos]);

    useEffect(() => {
        let shouldStop = false;
        let lastFrameTime = 0;
        let realTime = 0;
        const frame = (frameTime: number) => {
            if (shouldStop) return;

            requestAnimationFrame(frame);

            if (frameTime - lastFrameTime > 1000) {
                return;
            }
            const dt = (frameTime - lastFrameTime) * 0.001;
            realTime += dt;

            const vel = spline.evaluate(povState.pos)!.velocity;
            if (povState.pos + vel * dt >= spline.getLength()) {
                povState.pos = 0;
            }
            povState.pos += vel * dt;

            lastFrameTime = frameTime;
            forceUpdate();
        };
        requestAnimationFrame(frame);

        return () => {
            shouldStop = true;
        };
    }, []);
    let debugInfo: {
        pitch: number;
        yaw: number;
        roll: number;
        pitchPerS: number;
        yawPerS: number;
        rollPerS: number;

        point: TrackPoint | undefined;
        transitionsAtTime:
            | { vert: number; lat: number; roll: number }
            | undefined;
    } = {
        pitch: 0,
        yaw: 0,
        roll: 0,
        pitchPerS: 0,
        yawPerS: 0,
        rollPerS: 0,

        point: undefined,
        transitionsAtTime: undefined,
    };
    if (spline) {
        const dp = 0.001;
        let lastPoint = spline.evaluate(povState.pos - dp);
        if (!lastPoint) lastPoint = spline.evaluate(povState.pos);

        const point = spline.evaluate(povState.pos);
        if (!point || !lastPoint) throw new Error("no point");
        debugInfo.point = point;

        const euler = new THREE.Euler().setFromQuaternion(
            new THREE.Quaternion(
                point.rot[1],
                point.rot[2],
                point.rot[3],
                point.rot[0]
            )
        );
        debugInfo.pitch = -THREE.MathUtils.radToDeg(euler.x);
        debugInfo.yaw = -THREE.MathUtils.radToDeg(euler.y);
        debugInfo.roll = -THREE.MathUtils.radToDeg(euler.z);
        const lastEuler = new THREE.Euler().setFromQuaternion(
            new THREE.Quaternion(
                lastPoint.rot[1],
                lastPoint.rot[2],
                lastPoint.rot[3],
                lastPoint.rot[0]
            )
        );

        debugInfo.pitchPerS = -THREE.MathUtils.radToDeg(
            (euler.x - lastEuler.x) * (point.velocity / dp)
        );
        debugInfo.yawPerS = -THREE.MathUtils.radToDeg(
            (euler.y - lastEuler.y) * (point.velocity / dp)
        );
        debugInfo.rollPerS = -THREE.MathUtils.radToDeg(
            (euler.z - lastEuler.z) * (point.velocity / dp)
        );

        debugInfo.transitionsAtTime = transitions.evaluate(point.time);
    }

    return (
        <div className="flex flex-col h-full">
            <button
                onClick={async () => {
                    const options = {
                        types: [
                            {
                                description: "NL2 element files",
                                accept: {
                                    "text/xml": [".nl2elem"],
                                },
                            },
                        ],
                    };

                    const handle = await showSaveFilePicker(options);
                    const writable = await handle.createWritable();

                    await writable.write(spline.exportToNl2Elem());
                    await writable.close();
                    console.log(handle.name);
                }}
            >
                save nl2elem
            </button>
            <div className="p-4 bg-green-600 text-white">
                {debugInfo.point && (
                    <>
                        <div className="my-1">
                            <NumberDisplay
                                value={debugInfo.point.time}
                                unit={"s"}
                                label="time"
                            />
                        </div>
                        <div className="my-1 flex gap-x-4">
                            <NumberDisplay
                                value={convertDistance(debugInfo.point.pos[0])}
                                unit={distanceUnit}
                                label="x"
                            />
                            <NumberDisplay
                                value={convertDistance(debugInfo.point.pos[1])}
                                unit={distanceUnit}
                                label="y"
                            />
                            <NumberDisplay
                                value={convertDistance(debugInfo.point.pos[2])}
                                unit={distanceUnit}
                                label="z"
                            />
                            <NumberDisplay
                                value={convertSpeed(debugInfo.point.velocity)}
                                unit={speedUnit}
                                label="velocity"
                                fractionalDigits={1}
                            />
                        </div>
                        <div className="my-1 flex gap-x-4">
                            <NumberDisplay
                                value={debugInfo.pitch}
                                unit="°"
                                label="pitch"
                                plusPositive={true}
                                fractionalDigits={1}
                            />
                            <NumberDisplay
                                value={debugInfo.pitchPerS}
                                unit="°/s"
                                label=""
                                plusPositive={true}
                                fractionalDigits={1}
                                parentheses={true}
                            />
                            <NumberDisplay
                                value={debugInfo.yaw}
                                unit="°"
                                label="yaw"
                                plusPositive={true}
                                fractionalDigits={1}
                            />
                            <NumberDisplay
                                value={debugInfo.yawPerS}
                                unit="°/s"
                                label=""
                                plusPositive={true}
                                fractionalDigits={1}
                                parentheses={true}
                            />
                            <NumberDisplay
                                value={debugInfo.roll}
                                unit="°"
                                label="roll"
                                plusPositive={true}
                                fractionalDigits={1}
                            />
                            <NumberDisplay
                                value={debugInfo.rollPerS}
                                unit="°/s"
                                label=""
                                plusPositive={true}
                                fractionalDigits={1}
                                parentheses={true}
                            />
                        </div>
                        <div className="my-1 flex gap-x-4">
                            <NumberDisplay
                                value={debugInfo.transitionsAtTime!.vert}
                                fractionalDigits={2}
                                label="vert"
                                unit="g"
                            />
                            <NumberDisplay
                                value={debugInfo.transitionsAtTime!.lat}
                                fractionalDigits={2}
                                label="lat"
                                unit="g"
                            />
                        </div>
                    </>
                )}
            </div>
            <div className="flex-1">
                <canvas className="w-full h-full" ref={canvasThree} />
            </div>
            <div className="flex-1">
                <Graph transitions={transitions} />
            </div>
        </div>
    );
}

function drawGraph(
    canvas: HTMLCanvasElement,
    transitions: Transitions,
    zoomLevel: number,
    timeOffset: number
) {
    canvas.width = canvas.clientWidth * (window.devicePixelRatio || 1);
    canvas.height = canvas.clientHeight * (window.devicePixelRatio || 1);

    const ctx = canvas.getContext("2d")!;

    ctx.resetTransform();
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.scale(canvas.width / zoomLevel, canvas.height);
    ctx.translate(-timeOffset / canvas.width, 0);
    const transformG = (t: number) => -t * 0.125 + 0.75;
    const transformRoll = (degPerS: number) => -degPerS * (1 / 400) + 0.75;

    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.restore();

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
            18 * window.devicePixelRatio
        );
        ctx.restore();
    }
    for (let g = -2; g < 6; g++) {
        ctx.strokeStyle = "grey";
        ctx.beginPath();
        ctx.moveTo(
            timeOffset / canvas.width + 0.018 * zoomLevel,
            transformG(g)
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
            (-g * 0.125 + 0.75) * canvas.height + 2
        );
        ctx.restore();
    }
    // vert
    if (transitionsLength(transitions.vert) > 0) {
        ctx.beginPath();

        // const vertLength = transitionsLength(transitions.vert);
        // for (let x = 0; x < vertLength; x += 0.05) {
        //     ctx.lineTo(
        //         x,
        //         transformG(
        //             transitionsEvaluate(
        //                 transitions.vert,
        //                 x,
        //                 transitions.vertStart
        //             )!
        //         )
        //     );
        // }

        // let timeAccum = 0;
        // let value = transitions.vertStart;
        // for (const transition of transitions.vert) {
        // for (let x = timeAccum; x < transition.length + timeAccum; x += 0.05) {
        //     ctx.lineTo(
        //         x,
        //         transformG(evalTransition(transition, x - timeAccum)!) + value
        //     );
        // }

        //     timeAccum += transition.length;
        // }

        let value = transitions.vertStart;
        let timeAccum = 0;

        ctx.moveTo(0, transformG(value));
        for (const transition of transitions.vert) {
            for (
                let x = timeAccum;
                x < transition.length + timeAccum;
                x += 0.05
            ) {
                ctx.lineTo(
                    x,
                    transformG(evalTransition(transition, x - timeAccum)!)
                );
            }
            // FIXMe
            value += evalCurve(transition.curve, 1) * transition.value;

            timeAccum += transition.length;
        }

        ctx.lineWidth = 2;
        ctx.strokeStyle = "blue";
        ctx.save();
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.stroke();
        ctx.restore();
    }
    // lat
    if (transitionsLength(transitions.lat) > 0) {
        ctx.beginPath();

        ctx.moveTo(
            0,
            transformG(
                transitionsEvaluate(transitions.lat, 0, transitions.latStart)!
            )
        );
        const latLength = transitionsLength(transitions.lat);
        for (let x = 0; x < latLength; x += 0.05) {
            ctx.lineTo(
                x,
                transformG(
                    transitionsEvaluate(
                        transitions.lat,
                        x,
                        transitions.latStart
                    )!
                )
            );
        }

        ctx.lineWidth = 2;
        ctx.strokeStyle = "green";
        ctx.save();
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.stroke();
        ctx.restore();
    }
    // roll
    if (transitionsLength(transitions.roll) > 0) {
        ctx.beginPath();

        ctx.moveTo(
            0,
            transformRoll(
                transitionsEvaluate(transitions.roll, 0, transitions.rollStart)!
            )
        );
        const latLength = transitionsLength(transitions.roll);
        for (let x = 0; x < latLength; x += 0.05) {
            ctx.lineTo(
                x,
                transformRoll(
                    transitionsEvaluate(
                        transitions.roll,
                        x,
                        transitions.rollStart
                    )!
                )
            );
        }

        ctx.lineWidth = 2;
        ctx.strokeStyle = "red";
        ctx.save();
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.stroke();
        ctx.restore();
    }
}

function Graph({ transitions }: { transitions: Transitions }) {
    // const vertPoints = [];

    // for (let t = 0; t < transitionsLength(transitions.vert); t += 0.01) {
    //     vertPoints.push(
    //         `${t * 10},${
    //             -transitionsEvaluate(
    //                 transitions.vert,
    //                 t,
    //                 transitions.vertStart
    //             )! *
    //                 10 +
    //             75
    //         }`
    //     );
    // }

    // const latPoints = [];
    // for (let t = 0; t < transitionsLength(transitions.lat); t += 0.01) {
    //     latPoints.push(
    //         `${t * 10},${
    //             -transitionsEvaluate(
    //                 transitions.lat,
    //                 t,
    //                 transitions.latStart
    //             )! *
    //                 10 +
    //             75
    //         }`
    //     );
    // }

    // const svgRef = useRef<SVGSVGElement>(null);
    // const graphSvgRef = useRef<SVGSVGElement>(null);

    const [zoomLevel, setZoomLevel] = useState(5);
    const timeOffset = useRef<number>(-32);

    const dragging = useRef<boolean>(false);

    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    if (canvasRef.current)
        drawGraph(
            canvasRef.current,
            transitions,
            zoomLevel,
            timeOffset.current!
        );
    const containerRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        if (containerRef.current) {
            const cb = (e: WheelEvent) => {
                if (e.deltaMode !== 0) {
                    throw new Error("Wheel event not in pixels");
                }
                setZoomLevel((z) => {
                    return _.clamp(z + e.deltaY * 0.01, 0.01, 30);
                });
                e.preventDefault();
                e.stopPropagation();
                return false;
            };
            containerRef.current.addEventListener("wheel", cb, {
                passive: false,
            });
            return () => containerRef.current!.removeEventListener("wheel", cb);
        }
    }, [containerRef.current]);

    return (
        <div
            ref={containerRef}
            className="my-4 overflow-clip overscroll-none"
            onMouseDown={(ev) => {
                dragging.current = true;
            }}
            onMouseUp={(ev) => {
                dragging.current = false;
            }}
            onMouseMove={(ev) => {
                if (dragging.current) {
                    timeOffset.current -= ev.movementX * zoomLevel * 2;
                }
            }}
        >
            <div className="overflow-clip">
                <canvas className="w-full h-64" ref={canvasRef}></canvas>
                {/* <svg className="w-full h-64" ref={svgRef}>
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox={`${xOffset.current * zoomLevel} 0 ${
                            100 * zoomLevel
                        } 100`}
                        x={20}
                        preserveAspectRatio="none"
                        ref={graphSvgRef}
                    >
                        <polyline
                            points={vertPoints.join(" ")}
                            width={zoomLevel * vertPoints.length}
                            stroke="blue"
                            strokeWidth={2}
                            fill="none"
                            vectorEffect={"non-scaling-stroke"}
                        />
                        <polyline
                            points={latPoints.join(" ")}
                            width={zoomLevel * vertPoints.length}
                            stroke="green"
                            strokeWidth={2}
                            fill="none"
                            vectorEffect={"non-scaling-stroke"}
                        />
                        {svgRef.current &&
                            _.range(0, 500).map((v) => {
                                const x = (v * 10) / zoomLevel;
                                const y = 90;
                                return (
                                    <Fragment key={v}>
                                        <line
                                            x1={x}
                                            x2={x}
                                            y1={y}
                                            y2={0}
                                            stroke="black"
                                            strokeWidth={1}
                                            vectorEffect={"non-scaling-stroke"}
                                            opacity={v === 0 ? 0.5 : 0.2}
                                        />
                                    </Fragment>
                                );
                            })}
                    </svg>

                    {svgRef.current && (
                        <g>
                            {_.range(-2, 7).map((v) => {
                                const y =
                                    svgRef.current!.clientHeight * 0.75 -
                                    v * 25;
                                return (
                                    <Fragment key={v}>
                                        <text
                                            x="10"
                                            y={y}
                                            textAnchor="middle"
                                            alignmentBaseline="middle"
                                            className="select-none"
                                        >
                                            {v}g
                                        </text>
                                        <line
                                            x1={"25"}
                                            x2={svgRef.current!.clientWidth}
                                            y1={y}
                                            y2={y}
                                            stroke="black"
                                            opacity={v === 0 ? 0.5 : 0.2}
                                        />
                                    </Fragment>
                                );
                            })}
                            {svgRef.current &&
                                _.range(0, 500).map((v) => {
                                    const x = v * 10;
                                    const y = svgRef.current!.clientHeight - 10;
                                    return (
                                        <Fragment key={v}>
                                            <text
                                                x={
                                                    (x * 10 -
                                                        xOffset.current * 10 +
                                                        27) /
                                                    zoomLevel // FIXME
                                                }
                                                y={y}
                                                textAnchor="middle"
                                                alignmentBaseline="middle"
                                                className="select-none"
                                            >
                                                {v}s
                                            </text>
                                        </Fragment>
                                    );
                                })}
                        </g>
                    )}
                </svg> */}
            </div>
        </div>
    );
}

function NumberDisplay({
    value,
    fractionalDigits: decimalPoints,
    unit,
    label,
    plusPositive,
    parentheses,
}: {
    value: number;
    fractionalDigits?: number;
    unit: string;
    label?: string;
    plusPositive?: boolean;
    parentheses?: boolean;
}) {
    return (
        <div className="inline-flex m-0 text-base">
            {parentheses && "("}
            <span>{label ? label + ": " : "\u00A0"}</span>

            <div className="w-20 text-right font-mono">
                {(!plusPositive || value <= 0 ? "" : "+") +
                    value.toFixed(decimalPoints ?? 2)}
                {unit}
            </div>
            {parentheses && ")"}
        </div>
    );
}

function svgUnscale(el: SVGElement) {
    var svg = el.ownerSVGElement;
    //@ts-expect-error
    var xf = el.scaleIndependentXForm;
    if (!xf) {
        // Keep a single transform matrix in the stack for fighting transformations
        // @ts-expect-error
        xf = el.scaleIndependentXForm = svg.createSVGTransform();
        // Be sure to apply this transform after existing transforms (translate)
        // @ts-expect-error
        el.transform.baseVal.appendItem(xf);
    }
    //@ts-expect-error
    var m = svg.getTransformToElement(el.parentNode);
    m.e = m.f = 0; // Ignore (preserve) any translations done up to this point
    xf.setMatrix(m);
}

export default App;
