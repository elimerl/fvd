<script lang="ts">
    import { onMount } from "svelte";
    import type { TrackSpline } from "$lib/core/TrackSpline";
    import * as THREE from "three";
    import { InfiniteGridHelper } from "../InfiniteGridHelper";
    import { qaxisangle, qmul, qrotate, vadd, vec } from "$lib/core/math";
    import { keyState } from "../input";
    import * as _ from "lodash-es";
    import {
        toBufferGeometry,
        TrackModelType,
        type Geometry,
    } from "$lib/coaster_types/model";

    import { time } from "../util";

    import ModelWorker from "../modelWorker?worker";
    import type { TrackConfig } from "$lib/core/Track";

    const modelWorkers = [];
    for (let i = 0; i < 6; i++) {
        modelWorkers.push(new ModelWorker());
    }

    let modelWorkerIdx = 0;

    export let spline: TrackSpline;
    export let pov: { pos: number } = { pos: 0 };

    export let models: Map<string, TrackModelType>;
    export let config: TrackConfig;

    let canvasThree: HTMLCanvasElement;

    let renderer: THREE.WebGLRenderer;
    let camera: THREE.PerspectiveCamera;
    let scene: THREE.Scene;

    let heartline: THREE.Line;
    let rails: THREE.Mesh;
    let spine: THREE.Mesh;

    let mode: "fly" | "pov" = "pov";

    let flyPos = vec(0, 0, 0);
    let flyPitch = 0;
    let flyYaw = 0;
    $: flyQuat = qmul(
        qaxisangle(vec(0, 1, 0), flyYaw),
        qaxisangle(vec(1, 0, 0), flyPitch),
    );

    let modelType = models.get("b&m_family");

    onMount(() => {
        modelWorkers.forEach((worker) =>
            worker.postMessage({
                type: "load",
                modelType,
            }),
        );

        modelWorkers.forEach((worker) => {
            worker.onmessage = (event) => {
                const applyGeometry = () => {
                    rails.geometry.dispose();
                    heartline.geometry.dispose();
                    spine.geometry.dispose();
                    const { heartlineGeometry, railGeometry, spineGeometry } =
                        time(
                            () =>
                                trackGeometry(
                                    spline,
                                    event.data.railsMesh,
                                    event.data.spineMesh,
                                ),
                            "makeGeometry",
                        );
                    heartline.geometry = heartlineGeometry;
                    rails.geometry = railGeometry;
                    spine.geometry = spineGeometry;

                    heartline = heartline;
                };

                requestIdleCallback(applyGeometry, { timeout: 100 });
            };
        });

        if (!renderer) {
            renderer = new THREE.WebGLRenderer({
                antialias: true,
                canvas: canvasThree,
                powerPreference: "high-performance",
                precision: "highp",
            });
            renderer.setPixelRatio(window.devicePixelRatio ?? 1);
            renderer.shadowMap.enabled = true;
            renderer.shadowMap.type = THREE.PCFSoftShadowMap;
            renderer.toneMapping = THREE.ACESFilmicToneMapping;
            renderer.toneMappingExposure = 1;

            camera = new THREE.PerspectiveCamera(75, 2, 0.1, 1000);

            scene = new THREE.Scene();
            scene.background = new THREE.Color("white");

            const ambientLight = new THREE.AmbientLight("white", 1);

            scene.add(ambientLight);

            const sunLight = new THREE.DirectionalLight("white", 2.7);

            sunLight.castShadow = true;
            sunLight.shadow.mapSize.width = 2048;
            sunLight.shadow.mapSize.height = 2048;
            sunLight.shadow.camera.near = 0.1;
            sunLight.shadow.camera.far = 1000;
            sunLight.shadow.camera.top = 32;
            sunLight.shadow.camera.right = 32;
            sunLight.shadow.camera.bottom = -32;
            sunLight.shadow.camera.left = -32;

            sunLight.position.set(0, 500, 0);
            scene.add(sunLight);

            const grid = new InfiniteGridHelper(
                1,
                10,
                new THREE.Color("black"),
                500,
                "xzy",
            );
            scene.add(grid);

            // ground
            const ground = new THREE.Mesh(
                new THREE.PlaneGeometry(16384, 16384, 16, 16),
                new THREE.MeshStandardMaterial({
                    color: "#dddddd",
                    side: THREE.DoubleSide,
                }),
            );
            ground.rotateX(-Math.PI / 2);
            ground.position.set(0, -0.1, 0);
            ground.receiveShadow = true;
            scene.add(ground);

            // track
            const { heartlineGeometry, railGeometry, spineGeometry } =
                trackGeometry(
                    spline,
                    modelType.makeRailsMesh(spline, config.heartlineHeight),
                    modelType.makeSpineMesh(spline, config.heartlineHeight),
                );

            const heartlineMat = new THREE.LineBasicMaterial({
                color: new THREE.Color("red"),
            });
            heartline = new THREE.Line(heartlineGeometry, heartlineMat);
            scene.add(heartline);

            const railMat = new THREE.MeshStandardMaterial({
                color: new THREE.Color("#3261e3"),
                roughness: 0.6,
                metalness: 0.2,
                // wireframe: true,
            });

            rails = new THREE.Mesh(railGeometry, railMat);
            rails.castShadow = true;
            rails.receiveShadow = true;
            scene.add(rails);

            const spineMat = new THREE.MeshStandardMaterial({
                color: new THREE.Color("#3261e3"),
                roughness: 0.6,
                metalness: 0.2,
                // flatShading: true,
                // wireframe: true,
            });

            spine = new THREE.Mesh(spineGeometry, spineMat);
            spine.castShadow = true;
            spine.receiveShadow = true;
            scene.add(spine);
        }

        let f = 0;
        let lastTime = 0;
        function keyHandler(t: number) {
            const dt = (t - lastTime) * 0.001;
            lastTime = t;

            if (mode === "pov") {
                if (keyState.down.has("KeyW") || keyState.down.has("KeyS")) {
                    if (!spline.evaluate(pov.pos)) {
                        fixPos();
                    }
                    const p = spline.evaluate(pov.pos)!;
                    if (keyState.down.has("KeyW")) {
                        const speed = keyState.shift ? 2 : 1;
                        pov.pos += dt * (p.velocity ?? 0) * speed;
                    }
                    if (keyState.down.has("KeyS")) {
                        const speed = keyState.shift ? 2 : 1;
                        pov.pos -= dt * (p.velocity ?? 0) * speed;
                    }
                    fixPos();
                }
            } else if (mode === "fly") {
                const speed = keyState.shift ? 60 : 30;
                if (keyState.down.has("KeyW")) {
                    flyPos = vadd(flyPos, qrotate([0, 0, dt * speed], flyQuat));
                }
                if (keyState.down.has("KeyS")) {
                    flyPos = vadd(
                        flyPos,
                        qrotate([0, 0, -dt * speed], flyQuat),
                    );
                }
                if (keyState.down.has("KeyA")) {
                    flyPos = vadd(flyPos, qrotate([dt * speed, 0, 0], flyQuat));
                }
                if (keyState.down.has("KeyD")) {
                    flyPos = vadd(
                        flyPos,
                        qrotate([-dt * speed, 0, 0], flyQuat),
                    );
                }
            }

            f = requestAnimationFrame(keyHandler);
        }
        f = requestAnimationFrame(keyHandler);
        const observer = new ResizeObserver(() => {
            render(performance.now(), pov, spline);
        });
        observer.observe(canvasThree);

        return () => {
            cancelAnimationFrame(f);
            observer.disconnect();
        };
    });

    $: if (spline && renderer) {
        render(
            performance.now(),
            pov,
            spline,
            heartline,
            rails,
            spine,
            mode,
            flyPos,
            flyQuat,
        );
    }

    $: {
        if (renderer) {
            const worker = modelWorkers[modelWorkerIdx];
            modelWorkerIdx = (modelWorkerIdx + 1) % modelWorkers.length;

            worker.postMessage({
                type: "geometry",
                points: spline.points,
            });
        }
    }

    function trackGeometry(
        spline: TrackSpline,
        railsMesh: Geometry,
        spineMesh: Geometry,
    ) {
        const railGeometry = toBufferGeometry(railsMesh);

        railGeometry.computeVertexNormals();

        const spineGeometry = toBufferGeometry(spineMesh);

        spineGeometry.computeVertexNormals();

        const heartlineGeometry = new THREE.BufferGeometry().setFromPoints(
            spline
                .intervalPoints(0.1)
                .map(
                    (v) =>
                        new THREE.Vector3(
                            v.point.pos[0],
                            v.point.pos[1],
                            v.point.pos[2],
                        ),
                ),
        );
        return {
            heartlineGeometry,
            railGeometry,
            spineGeometry,
        };
    }

    function render(
        time: number,
        pov: { pos: number },
        spline: TrackSpline,
        ..._unused: any[]
    ) {
        let start = spline.evaluate(pov.pos);
        if (!start) {
            pov.pos = 0;
            start = spline.evaluate(pov.pos)!;
            if (!start) {
                throw new Error("no spline points");
            }
        }

        if (mode === "pov") {
            const camPos = vadd(start.pos, qrotate(vec(0, 0, 0), start.rot));

            camera.position.set(camPos[0], camPos[1], camPos[2]);
            camera.setRotationFromQuaternion(
                new THREE.Quaternion(
                    start.rot[1],
                    start.rot[2],
                    start.rot[3],
                    start.rot[0],
                ).multiply(
                    new THREE.Quaternion().setFromAxisAngle(
                        new THREE.Vector3(0, 1, 0),
                        Math.PI,
                    ),
                ),
            );
        } else {
            camera.position.set(flyPos[0], flyPos[1], flyPos[2]);
            camera.setRotationFromQuaternion(
                new THREE.Quaternion(
                    flyQuat[1],
                    flyQuat[2],
                    flyQuat[3],
                    flyQuat[0],
                ).multiply(
                    new THREE.Quaternion().setFromAxisAngle(
                        new THREE.Vector3(0, 1, 0),
                        Math.PI,
                    ),
                ),
            );
        }

        resizeCanvas(renderer, camera);
        renderer.render(scene, camera);
    }

    function fixPos() {
        const m = spline.getLength();
        const r = pov.pos % m;
        pov.pos = r < 0 ? r + m : r;
    }

    function resizeCanvas(
        renderer: THREE.WebGLRenderer,
        camera: THREE.PerspectiveCamera,
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

    let pointerLocked = false;
    document.onpointerlockchange = () => {
        pointerLocked = document.pointerLockElement === canvasThree;
    };
</script>

<svelte:body
    on:keydown={(ev) => {
        if (ev.code === "Tab") {
            ev.preventDefault();
            ev.stopPropagation();
            if (mode === "pov") {
                mode = "fly";
            } else {
                mode = "pov";
            }
        }
    }}
/>

<canvas
    tabindex="0"
    bind:this={canvasThree}
    on:resize={() => {
        resizeCanvas(renderer, camera);
    }}
    on:contextmenu={(ev) => ev.preventDefault()}
    on:mousedown={(ev) => {
        ev.preventDefault();
        if (ev.button === 2) {
            if (!pointerLocked)
                // @ts-expect-error
                canvasThree.requestPointerLock({ unadjustedMovement: true });
            else document.exitPointerLock();
        }
    }}
    on:mousemove={(ev) => {
        if (pointerLocked) {
            flyPitch += ev.movementY * 0.001;
            flyYaw += -ev.movementX * 0.001;
        }
    }}
    class="w-full h-full"
/>
