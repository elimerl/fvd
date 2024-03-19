<script lang="ts">
    import { onMount } from "svelte";
    import type { TrackSpline } from "../../core/TrackSpline";
    import * as THREE from "three";
    import { InfiniteGridHelper } from "../../InfiniteGridHelper";
    import { qrotate, vec, vsub } from "../../core/math";
    import { keyState } from "../input";
    import * as _ from "lodash-es";
    import { models, toBufferGeometry } from "../../models/model";

    export let spline: TrackSpline;
    export let heartlineOffset: number = 1.1;
    export let pov: { pos: number } = { pos: 0 };

    let canvasThree: HTMLCanvasElement;

    let renderer: THREE.WebGLRenderer;
    let camera: THREE.PerspectiveCamera;
    let scene: THREE.Scene;

    let heartline: THREE.Line;
    let rails: THREE.Mesh;
    let spine: THREE.Mesh;

    let frame = 0;

    onMount(() => {
        if (!renderer) {
            renderer = new THREE.WebGLRenderer({
                antialias: true,
                canvas: canvasThree,
                powerPreference: "high-performance",
            });
            renderer.setPixelRatio(window.devicePixelRatio ?? 1);
            // renderer.toneMapping = THREE.ACESFilmicToneMapping;
            renderer.toneMappingExposure = 0.5;

            camera = new THREE.PerspectiveCamera(80, 2, 0.1, 1000);
            camera.lookAt(new THREE.Vector3());

            scene = new THREE.Scene();
            scene.background = new THREE.Color("white");

            const light = new THREE.AmbientLight("white", 1);

            scene.add(light);

            const grid = new InfiniteGridHelper(
                1,
                10,
                new THREE.Color("black"),
                500,
                "xzy",
            );
            scene.add(grid);

            const { heartlineGeometry, railGeometry } = trackGeometry(spline);

            const heartlineMat = new THREE.LineBasicMaterial({
                color: new THREE.Color("red"),
            });
            heartline = new THREE.Line(heartlineGeometry, heartlineMat);
            scene.add(heartline);

            const trackMat = new THREE.MeshStandardMaterial({
                color: new THREE.Color("blue"),
                wireframe: true,
            });

            rails = new THREE.Mesh(railGeometry, trackMat);
            scene.add(rails);

            spine = new THREE.Mesh(railGeometry, trackMat);
            scene.add(spine);

            frame = requestAnimationFrame(render);

            console.log("start");
            return () => {
                cancelAnimationFrame(frame);
                console.log("end");
            };
        }
    });

    $: {
        if (rails && heartline) {
            rails.geometry.dispose();
            heartline.geometry.dispose();
            const { heartlineGeometry, railGeometry, spineGeometry } =
                trackGeometry(spline);
            heartline.geometry = heartlineGeometry;
            rails.geometry = railGeometry;
            spine.geometry = spineGeometry;
        }
    }

    let lastTime = 0;
    function trackGeometry(spline: TrackSpline) {
        const railGeometry = toBufferGeometry(
            models
                .get("B&M Family Launch")!
                .makeRailsMesh(spline, heartlineOffset),
        );

        const spineGeometry = toBufferGeometry(
            models
                .get("B&M Family Launch")!
                .makeSpineMesh(spline, heartlineOffset),
        );

        const heartlineGeometry = new THREE.BufferGeometry().setFromPoints(
            spline.points.map(
                (v) => new THREE.Vector3(v.pos[0], v.pos[1], v.pos[2]),
            ),
        );
        return {
            heartlineGeometry,
            railGeometry,
            spineGeometry,
        };
    }

    function render(time: number) {
        const dt = (time - lastTime) * 0.001;
        lastTime = time;
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
        let start = spline.evaluate(pov.pos);
        if (!start) {
            pov.pos = 0;
            start = spline.evaluate(pov.pos)!;
            if (!start) {
                throw new Error("no spline points");
            }
        }

        const camPos = start.pos;

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

        requestAnimationFrame(render);
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
    class="w-full h-full"
    style="image-rendering: pixelated;"
/>
