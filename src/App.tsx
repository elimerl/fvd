import { useEffect, useReducer, useRef, useState } from "react";
import reactLogo from "./assets/react.svg";
import viteLogo from "/vite.svg";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import {
    TransitionCurve,
    Transitions,
    evalCurve,
    timewarp,
} from "./core/Transitions";
import { defaultFvdConfig, fvd } from "./core/fvd";
import { qrotate, vec, vsub } from "./core/math";
import { InfiniteGridHelper } from "./InfiniteGridHelper";
import { TrackPoint, TrackSpline } from "./core/TrackSpline";
import { metersPerSecondToMph } from "./core/constants";

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
    t: 0,
    pos: 0,
};

function App() {
    const [, forceUpdate] = useReducer((x) => x + 1, 0);

    const [transitions] = useState(() => {
        const transitions = new Transitions(1, 0, 0);

        transitions.roll[0].length = 7.5;
        transitions.roll[0].curve = TransitionCurve.Plateau;
        transitions.roll[0].value = 0;

        transitions.roll.push({
            length: 2.5,
            curve: TransitionCurve.Plateau,
            tension: 0,
            value: 200,
        });

        // transitions.roll.push({
        //     length: 10,
        //     curve: TransitionCurve.Plateau,
        //     tension: 0,
        //     value: 0,
        // });
        transitions.lat[0].length = 30;
        transitions.vert.pop();
        transitions.vert.push({
            curve: TransitionCurve.Cubic,
            length: 1.5,
            tension: 0,
            value: -1,
        });
        transitions.vert.push({
            curve: TransitionCurve.Cubic,
            length: 0.5,
            tension: 0,
            value: 0,
        });
        transitions.vert.push({
            curve: TransitionCurve.Cubic,
            length: 1,
            tension: 0,
            value: 3.5,
        });
        transitions.vert.push({
            curve: TransitionCurve.Cubic,
            length: 3.5,
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
            spline = fvd(transitions, vec(0, 30, 0), 2.5, defaultFvdConfig());
            console.log(spline.exportToNl2Elem());
            renderer = new THREE.WebGLRenderer({
                antialias: true,
                canvas: canvasThree.current,
            });
            camera = new THREE.PerspectiveCamera(90, 2, 0.1, 1000);
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
                1000,
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
        const frame = (frameTime: number) => {
            if (shouldStop) return;

            requestAnimationFrame(frame);

            if (frameTime - lastFrameTime > 1000) {
                return;
            }
            const dt = (frameTime - lastFrameTime) * 0.001;
            povState.t += dt;

            const vel = spline.evaluate(povState.pos)!.velocity;
            if (povState.pos + vel * dt >= spline.getLength()) {
                povState.t = 0;
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
    } = {
        pitch: 0,
        yaw: 0,
        roll: 0,
        pitchPerS: 0,
        yawPerS: 0,
        rollPerS: 0,

        point: undefined,
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
    }

    return (
        <div className="flex flex-col h-full">
            <div className="font-mono">
                {debugInfo.point && (
                    <>
                        time: {povState.t.toFixed(1)}s<br /> x:{" "}
                        {debugInfo.point.pos[0].toFixed(1)}m y:{" "}
                        {debugInfo.point.pos[1].toFixed(1)}m z:
                        {debugInfo.point.pos[2].toFixed(1)}m pos:{" "}
                        {povState.pos.toFixed(1)}m velocity:{" "}
                        {metersPerSecondToMph(debugInfo.point.velocity).toFixed(
                            1
                        )}
                        mph <br />
                        pitch: {debugInfo.pitch.toFixed(1)} (
                        {debugInfo.pitchPerS.toFixed(1)}deg/s) yaw:{" "}
                        {debugInfo.yaw.toFixed(1)} (
                        {debugInfo.yawPerS.toFixed(1)}deg/s) roll:{" "}
                        {debugInfo.roll.toFixed(1)}deg (
                        {debugInfo.rollPerS.toFixed(1)}deg/s)
                        <br />
                        vert:{" "}
                        {transitions.evaluate(povState.t)!.vert.toFixed(1)}g
                        lat: {transitions.evaluate(povState.t)!.lat.toFixed(1)}g
                        roll:{" "}
                        {transitions.evaluate(povState.t)!.roll.toFixed(1)}
                        deg/s
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
    zoomLevel: number
) {
    canvas.width = transitions.length() * zoomLevel;
    const ctx = canvas.getContext("2d");

    ctx?.clearRect(0, 0, canvas.width, canvas.height);

    ctx?.moveTo(100, 100);
    ctx?.lineTo(200, 100);
    ctx?.stroke();
}

function Graph({ transitions }: { transitions: Transitions }) {
    const [zoomLevel, setZoomLevel] = useState(1);
    const graphCanvas = useRef<HTMLCanvasElement>(null);

    if (graphCanvas.current) {
        drawGraph(graphCanvas.current, transitions, zoomLevel);
    }

    return (
        <div style={{ width: "100%", overflow: "scroll" }}>
            <div style={{ overflow: "hidden" }}>
                <canvas ref={graphCanvas} />
            </div>
        </div>
    );
}

export default App;
