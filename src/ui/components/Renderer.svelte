<script lang="ts">
    import { onMount } from "svelte";
    import type { TrackSpline } from "../../core/TrackSpline";
    import * as THREE from "three";
    import { InfiniteGridHelper } from "../InfiniteGridHelper";
    import { qrotate, vadd, vec } from "../../core/math";
    import { keyState } from "../input";
    import * as _ from "lodash-es";
    import {
        toBufferGeometry,
        TrackModelType,
        type Geometry,
    } from "../../coaster_types/model";

    import { time } from "../util";

    import ModelWorker from "../modelWorker?worker";

    const modelWorker = new ModelWorker();

    export let spline: TrackSpline;
    export let pov: { pos: number } = { pos: 0 };

    export let models: Map<string, TrackModelType>;

    let canvasThree: HTMLCanvasElement;

    let renderer: THREE.WebGLRenderer;
    let camera: THREE.PerspectiveCamera;
    let scene: THREE.Scene;

    let heartline: THREE.Line;
    let rails: THREE.Mesh;
    let spine: THREE.Mesh;

    let lastGeometryUpdate: number = 0;

    onMount(() => {
        modelWorker.postMessage({
            type: "load",
            modelType: models.get("B&M Family Launch"),
        });

        modelWorker.onmessage = (event) => {
            console.log(event);
            const gu = lastGeometryUpdate;

            const applyGeometry = () => {
                if (gu !== lastGeometryUpdate) {
                    return;
                }
                lastGeometryUpdate = performance.now();
                rails.geometry.dispose();
                heartline.geometry.dispose();
                spine.geometry.dispose();
                const { heartlineGeometry, railGeometry, spineGeometry } = time(
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

            if (performance.now() - lastGeometryUpdate < 100) {
                console.log("waiting");
                setTimeout(() => applyGeometry(), 100);
            } else {
                applyGeometry();
            }
        };

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
            sunLight.shadow.camera.far = 100;

            sunLight.position.set(1, 3, 2);
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
                new THREE.PlaneGeometry(1024, 1024, 1, 1),
                new THREE.MeshStandardMaterial({
                    color: "#0ea800",
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
                    models.get("B&M Family Launch")!.makeRailsMesh(spline),
                    models.get("B&M Family Launch")!.makeSpineMesh(spline),
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
            });

            rails = new THREE.Mesh(railGeometry, railMat);
            rails.castShadow = true;
            rails.receiveShadow = true;
            scene.add(rails);

            const spineMat = new THREE.MeshStandardMaterial({
                color: new THREE.Color("#3261e3"),
                roughness: 0.6,
                metalness: 0.2,
                flatShading: true,
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

            if (keyState.down.has("KeyW") || keyState.down.has("KeyS")) {
                if (!spline.evaluate(pov.pos)) {
                    fixPos();
                }
                if (keyState.down.has("KeyW")) {
                    const speed = keyState.shift ? 2 : 1;
                    pov.pos += dt * spline.evaluate(pov.pos)!.velocity * speed;
                }
                if (keyState.down.has("KeyS")) {
                    const speed = keyState.shift ? 2 : 1;
                    pov.pos -= dt * spline.evaluate(pov.pos)!.velocity * speed;
                }
                fixPos();
            }

            f = requestAnimationFrame(keyHandler);
        }
        f = requestAnimationFrame(keyHandler);

        return () => cancelAnimationFrame(f);
    });

    $: if (spline && renderer) {
        render(performance.now(), pov, spline, heartline, rails, spine);
    }

    $: {
        if (renderer) {
            modelWorker.postMessage({
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
                .map((v) => new THREE.Vector3(v.pos[0], v.pos[1], v.pos[2])),
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
</script>

<canvas
    bind:this={canvasThree}
    on:resize={() => {
        resizeCanvas(renderer, camera);
    }}
    class="w-full h-full"
/>
