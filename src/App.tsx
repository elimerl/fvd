import { useEffect, useReducer, useRef, useState } from "react";
import * as THREE from "three";
import { Sky } from "three/addons/objects/Sky.js";

import {
    TransitionCurve,
    Transitions,
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

        // transitions.roll[0].length = 7.8;
        // transitions.roll[0].curve = TransitionCurve.Plateau;
        // transitions.roll[0].value = 0;

        // transitions.roll.push({
        //     length: 2.5,
        //     curve: TransitionCurve.Plateau,
        //     tension: 0,
        //     value: 200,
        // });

        // transitions.roll.push({
        //     length: 10,
        //     curve: TransitionCurve.Plateau,
        //     tension: 0,
        //     value: 0,
        // });
        transitions.vert[0].length = 30;
        transitions.roll[0].length = 30;

        transitions.lat[0].length = 30;
        transitions.lat[0].curve = TransitionCurve.Plateau;
        transitions.lat[0].tension = 10;
        transitions.lat[0].value = 2;

        // transitions.vert.pop();
        // transitions.vert.push({
        //     curve: TransitionCurve.Cubic,
        //     length: 1.5,
        //     tension: 0,
        //     value: -1.5,
        // });
        // transitions.vert.push({
        //     curve: TransitionCurve.Cubic,
        //     length: 0.3,
        //     tension: 0,
        //     value: 0,
        // });
        // transitions.vert.push({
        //     curve: TransitionCurve.Cubic,
        //     length: 1,
        //     tension: 0,
        //     value: 3.5,
        // });
        // transitions.vert.push({
        //     curve: TransitionCurve.Cubic,
        //     length: 4.6,
        //     tension: 0,
        //     value: 0,
        // });
        // transitions.vert.push({
        //     curve: TransitionCurve.Plateau,
        //     length: 4,
        //     tension: 0,
        //     value: -3,
        // });

        return transitions;
    });

    const canvasThree = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        if (canvasThree.current && !renderer) {
            spline = fvd(transitions, vec(0, 1, 0), 30, defaultFvdConfig());
            console.log(spline.exportToNl2Elem());
            renderer = new THREE.WebGLRenderer({
                antialias: true,
                canvas: canvasThree.current,
                powerPreference: "low-power",
            });
            renderer.toneMapping = THREE.ACESFilmicToneMapping;
            renderer.toneMappingExposure = 0.5;

            camera = new THREE.PerspectiveCamera(80, 2, 0.1, 1000);
            camera.position.z = 0;
            camera.position.y = 2;
            camera.position.x = 2;
            camera.lookAt(new THREE.Vector3());

            scene = new THREE.Scene();
            scene.background = new THREE.Color("white");

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

// function drawGraph(
//     canvas: HTMLCanvasElement,
//     transitions: Transitions,
//     zoomLevel: number
// ) {
//     canvas.width = Math.round(1000 * zoomLevel);
//     const ctx = canvas.getContext("2d")!;

//     ctx.clearRect(0, 0, canvas.width, canvas.height);

//     if (transitionsLength(transitions.vert) > 0) {
//         ctx.moveTo(
//             0,
//             transitionsEvaluate(transitions.vert, 0, transitions.vertStart)! *
//                 100
//         );
//         const vertLength = transitionsLength(transitions.vert);
//         for (let x = 0; x < vertLength; x += 0.1) {
//             ctx.lineTo(
//                 x / 0.1,
//                 transitionsEvaluate(transitions.vert, 0, 1)! * 100
//             );
//         }
//         ctx.strokeStyle = "blue";
//         ctx.stroke();
//     }
// }

function Graph({ transitions }: { transitions: Transitions }) {
    const [zoomLevel, setZoomLevel] = useState(1);
    const vertPoints = [];
    for (let t = 0; t < transitionsLength(transitions.vert); t += 0.01) {
        vertPoints.push(
            `${t * 10},${
                -transitionsEvaluate(
                    transitions.vert,
                    t,
                    transitions.vertStart
                )! *
                    10 +
                75
            }`
        );
    }

    const latPoints = [];
    for (let t = 0; t < transitionsLength(transitions.lat); t += 0.01) {
        latPoints.push(
            `${t * 10},${
                -transitionsEvaluate(
                    transitions.lat,
                    t,
                    transitions.latStart
                )! *
                    10 +
                75
            }`
        );
    }

    const svgRef = useRef<SVGSVGElement>(null);
    const graphSvgRef = useRef<SVGSVGElement>(null);

    const xOffset = useRef<number>(0);

    const dragging = useRef<boolean>(false);

    return (
        <div
            className="my-4 overflow-hidden"
            onWheel={(ev) => {
                if (ev.deltaMode !== 0) {
                    throw new Error("Wheel event not in pixels");
                }
                setZoomLevel((z) => {
                    return _.clamp(z + ev.deltaY * 0.01, 0.1, 10);
                });
            }}
            onScroll={(ev) => {
                ev.preventDefault();
                ev.stopPropagation();
            }}
            onMouseDown={(ev) => {
                dragging.current = true;
            }}
            onMouseUp={(ev) => {
                dragging.current = false;
            }}
            onMouseMove={(ev) => {
                if (dragging.current) {
                    xOffset.current -= ev.movementX / (zoomLevel * 10);
                    graphSvgRef.current!.viewBox.baseVal.x =
                        xOffset.current * zoomLevel;
                }
            }}
        >
            <div className="overflow-hidden">
                <svg className="w-full h-64" ref={svgRef}>
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
                    </svg>
                    {svgRef.current && (
                        <g>
                            {_.range(-2, 7).map((v) => {
                                const y =
                                    svgRef.current!.clientHeight * 0.75 -
                                    v * 25;
                                return (
                                    <>
                                        <text
                                            x="10"
                                            y={y}
                                            textAnchor="middle"
                                            alignmentBaseline="middle"
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
                                    </>
                                );
                            })}
                        </g>
                    )}
                </svg>
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

export default App;
