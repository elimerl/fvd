import { useEffect, useReducer, useRef, useState } from "react";
import * as THREE from "three";

import {
    Transition,
    TransitionCurve,
    Transitions,
    evalCurve,
    evalTransition,
    transitionsEvaluate,
    transitionsGetAtT,
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

let heartline: THREE.Line;
let leftRail: THREE.Line;
let rightRail: THREE.Line;

const heartlineOffset = 1.1;

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
    const [selectedTransition, setSelectedTransition] = useState<
        Transition | undefined
    >(undefined);

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
    });

    const canvasThree = useRef<HTMLCanvasElement>(null);

    const updateTransitions = () => {
        spline = fvd(transitions, vec(0, 35, 0), 3, defaultFvdConfig());
        forceUpdate();

        heartline.geometry.dispose();
        const heartlineGeometry = new THREE.BufferGeometry().setFromPoints(
            spline.points.map((v) => {
                const [x, y, z] = v.pos;
                return new THREE.Vector3(x, y, z);
            })
        );
        heartline.geometry = heartlineGeometry;

        leftRail.geometry.dispose();
        const leftRailGeometry = new THREE.BufferGeometry().setFromPoints(
            spline.points.map((v) => {
                const [x, y, z] = vsub(
                    v.pos,
                    qrotate(vec(-0.35, heartlineOffset, 0), v.rot)
                );
                return new THREE.Vector3(x, y, z);
            })
        );
        leftRail.geometry = leftRailGeometry;

        rightRail.geometry.dispose();
        const rightRailGeometry = new THREE.BufferGeometry().setFromPoints(
            spline.points.map((v) => {
                const [x, y, z] = vsub(
                    v.pos,
                    qrotate(vec(0.35, heartlineOffset, 0), v.rot)
                );
                return new THREE.Vector3(x, y, z);
            })
        );
        rightRail.geometry = rightRailGeometry;
    };

    useEffect(() => {
        if (canvasThree.current && !renderer) {
            spline = fvd(transitions, vec(0, 35, 0), 3, defaultFvdConfig());
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

            heartline = new THREE.Line(heartlineGeometry, heartlineMat);
            scene.add(heartline);

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

            leftRail = new THREE.Line(leftRailGeometry, railMat);
            scene.add(leftRail);

            rightRail = new THREE.Line(rightRailGeometry, railMat);
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
    const debugInfo: {
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
        <div className="flex flex-col h-full w-screen">
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
            <div className="flex-1 flex">
                <div className="w-1/6 m-0">
                    {selectedTransition && (
                        <>
                            <input
                                type="number"
                                step={0.1}
                                value={selectedTransition.length}
                                onWheel={}
                                onChange={(e) => {
                                    const length = e.target.valueAsNumber;
                                    if (length > 0) {
                                        selectedTransition.length = length;
                                        updateTransitions();
                                    }
                                    console.log(length);
                                }}
                            ></input>
                        </>
                    )}
                </div>
                <Graph
                    transitions={transitions}
                    selected={selectedTransition}
                    onSelect={(transition) => setSelectedTransition(transition)}
                />
            </div>
        </div>
    );
}

const transformG = (g: number) => -g * 0.125 + 0.75;
const transformRoll = (degPerS: number) => -degPerS * (1 / 400) + 0.75;

const invTransformG = (y: number) => 6 - 8 * y;
const invTransformRoll = (y: number) => 300 - 400 * y;

function drawGraph(
    canvas: HTMLCanvasElement,
    transitions: Transitions,
    zoomLevel: number,
    timeOffset: number,
    selectedTransition?: Transition
) {
    canvas.width = canvas.clientWidth * (window.devicePixelRatio || 1);
    canvas.height = canvas.clientHeight * (window.devicePixelRatio || 1);

    const ctx = canvas.getContext("2d")!;

    ctx.resetTransform();
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const transform = getGraphTransform(
        canvas.width,
        canvas.height,
        zoomLevel,
        timeOffset
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
        let value = transitions.vertStart;
        let timeAccum = 0;

        for (const transition of transitions.vert) {
            ctx.beginPath();

            ctx.moveTo(timeAccum, transformG(value));

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
                    transformG(
                        evalTransition(transition, x - timeAccum)! + value
                    )
                );
            }
            ctx.lineTo(
                timeAccum + transition.length,
                transformG(
                    evalCurve(transition.curve, 1) * transition.value + value
                )
            );
            value += evalCurve(transition.curve, 1) * transition.value;

            timeAccum += transition.length;

            ctx.save();
            ctx.lineWidth = transition === selectedTransition ? 4 : 2;
            ctx.strokeStyle = "blue";
            ctx.setTransform(1, 0, 0, 1, 0, 0);
            ctx.stroke();
            ctx.restore();
        }
    }
    // lat
    if (transitionsLength(transitions.lat) > 0) {
        let value = transitions.latStart;
        let timeAccum = 0;

        for (const transition of transitions.lat) {
            ctx.beginPath();
            ctx.moveTo(timeAccum, transformG(value));

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
                    transformG(
                        evalTransition(transition, x - timeAccum)! + value
                    )
                );
            }
            ctx.lineTo(
                timeAccum + transition.length,
                transformG(
                    evalCurve(transition.curve, 1) * transition.value + value
                )
            );
            value += evalCurve(transition.curve, 1) * transition.value;

            timeAccum += transition.length;

            ctx.lineWidth = transition === selectedTransition ? 4 : 2;
            ctx.strokeStyle = "green";
            ctx.save();
            ctx.setTransform(1, 0, 0, 1, 0, 0);
            ctx.stroke();
            ctx.restore();
        }
    }
    // roll
    if (transitionsLength(transitions.roll) > 0) {
        let value = transitions.rollStart;
        let timeAccum = 0;

        for (const transition of transitions.roll) {
            ctx.beginPath();

            ctx.moveTo(timeAccum, transformG(value));

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
                    transformRoll(
                        evalTransition(transition, x - timeAccum)! + value
                    )
                );
            }
            ctx.lineTo(
                timeAccum + transition.length,
                transformRoll(
                    evalCurve(transition.curve, 1) * transition.value + value
                )
            );
            value += evalCurve(transition.curve, 1) * transition.value;

            timeAccum += transition.length;

            ctx.lineWidth = transition === selectedTransition ? 4 : 2;
            ctx.strokeStyle = "red";
            ctx.save();
            ctx.setTransform(1, 0, 0, 1, 0, 0);
            ctx.stroke();
            ctx.restore();
        }
    }
}

function getGraphTransform(
    width: number,
    height: number,
    zoomLevel: number,
    timeOffset: number
) {
    return new DOMMatrix()
        .scale(width / zoomLevel, height)
        .translate(-timeOffset / width, 0);
}

function Graph({
    transitions,
    selected,
    onSelect,
}: {
    transitions: Transitions;
    selected: Transition | undefined;
    onSelect: (transition: Transition | undefined) => void;
}) {
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

    const dragging = useRef<number | null>(null);

    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    if (canvasRef.current)
        drawGraph(
            canvasRef.current,
            transitions,
            zoomLevel,
            timeOffset.current!,
            selected
        );
    const containerRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        if (containerRef.current) {
            const cb = (e: WheelEvent) => {
                if (e.deltaMode !== 0) {
                    throw new Error("Wheel event not in pixels");
                }
                setZoomLevel((z) => {
                    return _.clamp(z + e.deltaY * 0.01, 0.5, 30);
                });
                e.preventDefault();
                e.stopPropagation();
                return false;
            };
            containerRef.current.addEventListener("wheel", cb, {
                passive: false,
            });
            return () => {
                if (containerRef.current)
                    containerRef.current!.removeEventListener("wheel", cb);
            };
        }
    }, [containerRef.current]);

    return (
        <div
            ref={containerRef}
            className="overflow-clip overscroll-none w-full"
            onMouseDown={() => {
                dragging.current = 0;
            }}
            onMouseUp={() => {
                dragging.current = null;
            }}
            onMouseMove={(ev) => {
                if (dragging.current !== null) {
                    timeOffset.current -= ev.movementX * zoomLevel * 2;
                    dragging.current -= ev.movementX * zoomLevel * 2;
                }
            }}
        >
            <div className="overflow-clip  w-full">
                <canvas
                    className="w-full h-64"
                    ref={canvasRef}
                    onMouseUp={(ev) => {
                        if (
                            dragging.current &&
                            Math.abs(dragging.current) > 0.05
                        )
                            return;

                        const rect = canvasRef.current!.getBoundingClientRect();
                        const pxX = ev.clientX - rect.left;
                        const pxY = ev.clientY - rect.top;
                        const { x: t, y: y } = invTransform(
                            {
                                x: pxX * window.devicePixelRatio,
                                y: pxY * window.devicePixelRatio,
                            },
                            getGraphTransform(
                                canvasRef.current!.width,
                                canvasRef.current!.height,
                                zoomLevel,
                                timeOffset.current!
                            )
                        );
                        const vert = transitionsEvaluate(
                            transitions.vert,
                            t,
                            transitions.vertStart
                        );
                        const lat = transitionsEvaluate(
                            transitions.lat,
                            t,
                            transitions.latStart
                        );
                        const roll = transitionsEvaluate(
                            transitions.roll,
                            t,
                            transitions.rollStart
                        );

                        const vertY =
                            vert !== undefined ? transformG(vert) : Infinity;
                        const latY =
                            lat !== undefined ? transformG(lat) : Infinity;
                        const rollY =
                            roll !== undefined ? transformRoll(roll) : Infinity;

                        const vertYDiff = Math.abs(vertY - y);
                        const latYDiff = Math.abs(latY - y);
                        const rollYDiff = Math.abs(rollY - y);

                        const closest = Math.min(
                            vertYDiff,
                            rollYDiff,
                            latYDiff,
                            10000
                        );

                        switch (closest) {
                            case vertYDiff: {
                                const newTransition = transitionsGetAtT(
                                    transitions.vert,
                                    t
                                );
                                if (selected !== newTransition) {
                                    onSelect(newTransition);
                                    break;
                                }
                            }
                            case latYDiff: {
                                const newTransition = transitionsGetAtT(
                                    transitions.lat,
                                    t
                                );
                                if (selected !== newTransition) {
                                    onSelect(newTransition);
                                    break;
                                }
                            }
                            case rollYDiff: {
                                const newTransition = transitionsGetAtT(
                                    transitions.roll,
                                    t
                                );
                                if (selected !== newTransition) {
                                    onSelect(newTransition);
                                    break;
                                }
                            }
                            default:
                                onSelect(undefined);
                                break;
                        }
                    }}
                ></canvas>
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

function transform({ x, y }: { x: number; y: number }, transform: DOMMatrix) {
    return {
        x: x * transform.a + y * transform.c + transform.e,
        y: x * transform.b + y * transform.d + transform.f,
    };
}

function invTransform(
    { x, y }: { x: number; y: number },
    transformOrig: DOMMatrix
) {
    const transform = transformOrig.inverse();
    return {
        x: x * transform.a + y * transform.c + transform.e,
        y: x * transform.b + y * transform.d + transform.f,
    };
}

export default App;
