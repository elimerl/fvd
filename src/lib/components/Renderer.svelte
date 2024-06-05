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
    export let fov: number = 70;

    export let models: Map<string, TrackModelType>;
    export let config: TrackConfig;

    let canvasThree: HTMLCanvasElement;

    let renderer: THREE.WebGLRenderer;
    let camera: THREE.PerspectiveCamera;
    let scene: THREE.Scene;
    let sunLight: THREE.DirectionalLight;

    let heartline: THREE.Line;
    let rails: THREE.Mesh;

    let overlayPlane: THREE.Mesh;

    export let mode: "fly" | "pov" = "pov";

    export let overlay: HTMLImageElement | null;

    let flyPos = vec(0, 0, 0);
    let flyPitch = 0;
    let flyYaw = 0;
    $: flyQuat = qmul(
        qaxisangle(vec(0, 1, 0), flyYaw),
        qaxisangle(vec(1, 0, 0), flyPitch),
    );

    $: modelType = models.get(config.modelId);

    $: {
        modelWorkers.forEach((worker) =>
            worker.postMessage({
                type: "load",
                modelType,
            }),
        );
    }

    onMount(() => {
        modelWorkers.forEach((worker) => {
            worker.onmessage = (event) => {
                const applyGeometry = () => {
                    rails.geometry.dispose();
                    heartline.geometry.dispose();
                    const { heartlineGeometry, railsGeometry } = time(
                        () => trackGeometry(spline, event.data.railsMesh),
                        "makeGeometry",
                    );
                    heartline.geometry = heartlineGeometry;
                    rails.geometry = railsGeometry;

                    heartline = heartline;
                };

                applyGeometry();
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
            scene.background = new THREE.Color(0x87ceeb);

            const ambientLight = new THREE.AmbientLight("white", 1);

            scene.add(ambientLight);

            sunLight = new THREE.DirectionalLight("white", 2.7);

            sunLight.castShadow = true;
            sunLight.shadow.mapSize.width = 2048;
            sunLight.shadow.mapSize.height = 2048;
            sunLight.shadow.camera.near = 0.1;
            sunLight.shadow.camera.far = 1000;
            sunLight.shadow.camera.top = 128;
            sunLight.shadow.camera.right = 128;
            sunLight.shadow.camera.bottom = -128;
            sunLight.shadow.camera.left = -128;

            sunLight.position.set(0, 500, 0);
            scene.add(sunLight);
            scene.add(sunLight.target);

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

            overlayPlane = new THREE.Mesh(
                new THREE.PlaneGeometry(400, 400, 16, 16),
                new THREE.MeshStandardMaterial({
                    color: "#fff",
                    side: THREE.DoubleSide,
                }),
            );
            overlayPlane.rotateX(-Math.PI / 2);
            overlayPlane.position.set(0, -0.05, 10);
            overlayPlane.visible = false;
            scene.add(overlayPlane);

            // track
            const { heartlineGeometry, railsGeometry } = trackGeometry(
                spline,
                modelType.makeMesh(spline, config.heartlineHeight),
            );

            const heartlineMat = new THREE.LineBasicMaterial({
                color: new THREE.Color("red"),
            });
            heartline = new THREE.Line(heartlineGeometry, heartlineMat);
            scene.add(heartline);

            const railMat = new THREE.MeshPhysicalMaterial({
                color: new THREE.Color("#3261e3"),
                roughness: 0.6,
                metalness: 0.2,
                specularIntensity: 0.5,
                flatShading: false,
            });

            rails = new THREE.Mesh(railsGeometry, railMat);
            rails.castShadow = true;
            rails.receiveShadow = true;
            scene.add(rails);
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
            mode,
            flyPos,
            flyQuat,
            fov,
            overlay,
        );
    }

    $: {
        if (renderer) {
            const worker = modelWorkers[modelWorkerIdx];
            modelWorkerIdx = (modelWorkerIdx + 1) % modelWorkers.length;

            worker.postMessage({
                type: "geometry",
                points: spline.points,
                config,
            });
        }
    }

    function trackGeometry(spline: TrackSpline, trackMesh: Geometry) {
        const railsGeometry = toBufferGeometry(trackMesh);

        railsGeometry.computeVertexNormals();

        const heartlineGeometry = new THREE.BufferGeometry().setFromPoints(
            spline.intervalPoints(0.1).map((v) => {
                const p = v.point.pos;
                return new THREE.Vector3(p[0], p[1], p[2]);
            }),
        );
        return {
            heartlineGeometry,
            railsGeometry,
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

        camera.fov = fov;

        if (overlay) {
            if (!overlayPlane.visible) {
                const tex = new THREE.Texture(overlay);
                tex.wrapS = THREE.RepeatWrapping;
                tex.wrapT = THREE.RepeatWrapping;
                tex.needsUpdate = true;
                overlayPlane.visible = true;
                overlayPlane.material = new THREE.MeshBasicMaterial({
                    color: "white",
                    side: THREE.DoubleSide,
                    map: tex,
                });
            }
        } else {
            if (overlayPlane.visible) {
                overlayPlane.visible = false;
                overlayPlane.material = new THREE.MeshBasicMaterial({
                    color: "#fff",
                    side: THREE.DoubleSide,
                });
            }
        }

        if (mode === "pov") {
            const camPos = vadd(start.pos, qrotate(vec(0, 0, 0), start.rot));

            sunLight.position.set(camPos[0], 500, camPos[2]);
            sunLight.target.position.set(camPos[0], 0, camPos[2]);
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
            sunLight.position.set(flyPos[0], 500, flyPos[2]);
            sunLight.target.position.set(flyPos[0], 0, flyPos[2]);
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
    on:mousedown={async (ev) => {
        ev.preventDefault();
        if (ev.button === 2) {
            try {
                if (!pointerLocked) {
                    // @ts-expect-error
                    canvasThree.requestPointerLock({
                        unadjustedMovement: true,
                    });
                } else document.exitPointerLock();
            } catch {
                console.error("pointer lock failed");
            }
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
