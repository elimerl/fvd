<script lang="ts">
    import { onMount } from "svelte";
    import type { TrackSpline } from "../../core/TrackSpline";
    import * as THREE from "three";
    import { InfiniteGridHelper } from "../../InfiniteGridHelper";
    import { qrotate, vec, vsub } from "../../core/math";
    import { keyState } from "../input";
    import * as _ from "lodash-es";

    export let spline: TrackSpline;
    export let heartlineOffset: number = 1.1;
    export let pov: { pos: number } = { pos: 0 };

    let canvasThree: HTMLCanvasElement;

    let renderer: THREE.WebGLRenderer;
    let camera: THREE.PerspectiveCamera;
    let scene: THREE.Scene;

    let heartline: THREE.Line;
    let leftRail: THREE.Line;
    let rightRail: THREE.Line;

    let frame = 0;

    onMount(() => {
        renderer = new THREE.WebGLRenderer({
            antialias: true,
            canvas: canvasThree,
            powerPreference: "high-performance",
        });
        renderer.setPixelRatio(window.devicePixelRatio);
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 0.5;

        camera = new THREE.PerspectiveCamera(80, 2, 0.1, 1000);
        camera.lookAt(new THREE.Vector3());

        scene = new THREE.Scene();
        scene.background = new THREE.Color("white");

        const light = new THREE.DirectionalLight(0xffffff, 1);
        light.position.set(0, 1, 0);
        light.castShadow = true;

        const grid = new InfiniteGridHelper(
            1,
            10,
            new THREE.Color("black"),
            300,
            "xzy",
        );
        scene.add(grid);

        const { heartlineGeometry, leftRailGeometry, rightRailGeometry } =
            trackGeometry(spline);

        const heartlineMat = new THREE.LineBasicMaterial({
            color: new THREE.Color("red"),
        });
        heartline = new THREE.Line(heartlineGeometry, heartlineMat);
        scene.add(heartline);

        const railMat = new THREE.LineBasicMaterial({
            color: new THREE.Color("blue"),
        });

        leftRail = new THREE.Line(leftRailGeometry, railMat);
        scene.add(leftRail);

        rightRail = new THREE.Line(rightRailGeometry, railMat);
        scene.add(rightRail);

        frame = requestAnimationFrame(render);
    });

    $: {
        if (leftRail && rightRail && heartline) {
            leftRail.geometry.dispose();
            rightRail.geometry.dispose();
            heartline.geometry.dispose();
            const { heartlineGeometry, leftRailGeometry, rightRailGeometry } =
                trackGeometry(spline);
            heartline.geometry = heartlineGeometry;
            leftRail.geometry = leftRailGeometry;
            rightRail.geometry = rightRailGeometry;
        }
    }

    let lastTime = 0;
    function trackGeometry(spline: TrackSpline) {
        const railSpacing = 1.2;
        const leftRailGeometry = new THREE.BufferGeometry().setFromPoints(
            spline.points.map((v) => {
                const [x, y, z] = vsub(
                    v.pos,
                    qrotate(vec(-railSpacing / 2, heartlineOffset, 0), v.rot),
                );
                return new THREE.Vector3(x, y, z);
            }),
        );
        const rightRailGeometry = new THREE.BufferGeometry().setFromPoints(
            spline.points.map((v) => {
                const [x, y, z] = vsub(
                    v.pos,
                    qrotate(vec(railSpacing / 2, heartlineOffset, 0), v.rot),
                );
                return new THREE.Vector3(x, y, z);
            }),
        );
        const heartlineGeometry = new THREE.BufferGeometry().setFromPoints(
            spline.points.map(
                (v) => new THREE.Vector3(v.pos[0], v.pos[1], v.pos[2]),
            ),
        );
        return { heartlineGeometry, leftRailGeometry, rightRailGeometry };
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

        camera.position.set(start.pos[0], start.pos[1], start.pos[2]);
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

<canvas bind:this={canvasThree} class="w-full h-full" />
