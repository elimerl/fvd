import { useEffect, useRef, useState } from "react";
import {
    qaxisangle,
    qmul,
    qrotate,
    vadd,
    vec,
    type vec3,
} from "../lib/core/math";
import { keyState } from "../lib/input";
import { TrackModelType, type Geometry } from "../lib/coaster_types/model";
import type { TrackSpline } from "../lib/core/TrackSpline";
import type { TrackConfig } from "../lib/core/Track";

interface Props {
    spline: TrackSpline;
    models: Map<string, TrackModelType>;
    config: TrackConfig;
    fov?: number;
    mode: "fly" | "pov";
    onModeChange: (m: "fly" | "pov") => void;
    povRef: React.MutableRefObject<{ pos: number }>;
    onPovTick: () => void;
}

type GPUContext = {
    device: GPUDevice;
    context: GPUCanvasContext;
    format: GPUTextureFormat;
    cameraBuffer: GPUBuffer;
    cameraBindGroup: GPUBindGroup;
    groundPipeline: GPURenderPipeline;
    trackPipeline: GPURenderPipeline;
    shadowPipeline: GPURenderPipeline;
    heartlinePipeline: GPURenderPipeline;
    depthTexture: GPUTexture;
    depthView: GPUTextureView;
    msaaColorTexture: GPUTexture;
    msaaColorView: GPUTextureView;
    ground: GpuIndexedMesh;
    rails: GpuIndexedMesh;
    spine: GpuIndexedMesh;
    heartline: GpuLine;
};

type GpuIndexedMesh = {
    vertexBuffer: GPUBuffer;
    indexBuffer: GPUBuffer;
    indexCount: number;
};

type GpuLine = {
    vertexBuffer: GPUBuffer;
    vertexCount: number;
};

const VIEW_UNIFORM_FLOATS = 40; // viewProj + view + cameraPos + sunDir
const DEPTH_FORMAT: GPUTextureFormat = "depth24plus";
const GROUND_SIZE = 16384;
const SAMPLE_COUNT = 4;

export function Renderer({
    spline,
    models,
    config,
    fov = 70,
    mode,
    onModeChange,
    povRef,
    onPovTick,
}: Props) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [error, setError] = useState<string | null>(null);

    const gpuRef = useRef<GPUContext | null>(null);
    const flyPosRef = useRef(vec(0, 0, 0));
    const flyPitchRef = useRef(0);
    const flyYawRef = useRef(0);
    const pointerLockedRef = useRef(false);
    const modeRef = useRef(mode);
    const splineRef = useRef(spline);
    const configRef = useRef(config);
    const fovRef = useRef(fov);
    const modelWorkersRef = useRef<Worker[]>([]);
    const modelWorkerIdxRef = useRef(0);
    const frameRef = useRef(0);

    // Keep refs in sync with props.
    modeRef.current = mode;
    splineRef.current = spline;
    configRef.current = config;
    fovRef.current = fov;

    void onModeChange;

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        let disposed = false;

        const init = async () => {
            try {
                const gpu = (navigator as Navigator & { gpu?: GPU }).gpu;
                if (!gpu) {
                    setError("WebGPU is not available in this browser.");
                    return;
                }

                const adapter = await gpu.requestAdapter();
                if (!adapter) {
                    setError("No compatible WebGPU adapter found.");
                    return;
                }

                const device = await adapter.requestDevice();
                const context = canvas.getContext(
                    "webgpu",
                ) as GPUCanvasContext | null;
                if (!context) {
                    setError("Failed to acquire WebGPU canvas context.");
                    return;
                }

                const format = gpu.getPreferredCanvasFormat();
                const cameraBuffer = device.createBuffer({
                    size: VIEW_UNIFORM_FLOATS * 4,
                    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
                });

                const cameraLayout = device.createBindGroupLayout({
                    entries: [
                        {
                            binding: 0,
                            visibility:
                                GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
                            buffer: { type: "uniform" },
                        },
                    ],
                });

                const cameraBindGroup = device.createBindGroup({
                    layout: cameraLayout,
                    entries: [
                        { binding: 0, resource: { buffer: cameraBuffer } },
                    ],
                });

                const pipelineLayout = device.createPipelineLayout({
                    bindGroupLayouts: [cameraLayout],
                });

                const groundPipeline = createGroundPipeline(
                    device,
                    pipelineLayout,
                    format,
                );
                const trackPipeline = createTrackPipeline(
                    device,
                    pipelineLayout,
                    format,
                );
                const shadowPipeline = createShadowPipeline(
                    device,
                    pipelineLayout,
                    format,
                );
                const heartlinePipeline = createHeartlinePipeline(
                    device,
                    pipelineLayout,
                    format,
                );

                const modelType = models.get(configRef.current.modelId);
                if (!modelType) {
                    setError("Model type not found.");
                    return;
                }

                const railGeometry = modelType.makeRailsMesh(
                    splineRef.current,
                    configRef.current.heartlineHeight,
                );
                const spineGeometry = modelType.makeSpineMesh(
                    splineRef.current,
                    configRef.current.heartlineHeight,
                );
                const heartlinePositions = buildHeartlinePositions(
                    splineRef.current,
                );

                const ground = uploadGroundMesh(device);
                const rails = uploadIndexedGeometry(device, railGeometry);
                const spine = uploadIndexedGeometry(device, spineGeometry);
                const heartline = uploadLineGeometry(
                    device,
                    heartlinePositions,
                );

                const dpr = window.devicePixelRatio || 1;
                resizeCanvasToDisplaySize(canvas, dpr);
                context.configure({
                    device,
                    format,
                    alphaMode: "opaque",
                });

                const [depthTexture, depthView] = createDepthTarget(
                    device,
                    canvas.width,
                    canvas.height,
                );
                const [msaaColorTexture, msaaColorView] = createMsaaColorTarget(
                    device,
                    format,
                    canvas.width,
                    canvas.height,
                );

                if (disposed) {
                    safeDestroyMesh(ground);
                    safeDestroyMesh(rails);
                    safeDestroyMesh(spine);
                    safeDestroyLine(heartline);
                    depthTexture.destroy();
                    msaaColorTexture.destroy();
                    cameraBuffer.destroy();
                    return;
                }

                gpuRef.current = {
                    device,
                    context,
                    format,
                    cameraBuffer,
                    cameraBindGroup,
                    groundPipeline,
                    trackPipeline,
                    shadowPipeline,
                    heartlinePipeline,
                    depthTexture,
                    depthView,
                    msaaColorTexture,
                    msaaColorView,
                    ground,
                    rails,
                    spine,
                    heartline,
                };

                setError(null);

                for (let i = 0; i < 6; i++) {
                    const worker = new Worker(
                        new URL("../lib/modelWorker.ts", import.meta.url),
                        {
                            type: "module",
                        },
                    );
                    modelWorkersRef.current.push(worker);
                }

                modelWorkersRef.current.forEach((worker) => {
                    worker.postMessage({ type: "load", modelType });
                    worker.onmessage = (event) => {
                        requestIdleCallback(
                            () => {
                                const gpuState = gpuRef.current;
                                if (!gpuState) return;

                                const newRails = uploadIndexedGeometry(
                                    device,
                                    event.data.railsMesh,
                                );
                                const newSpine = uploadIndexedGeometry(
                                    device,
                                    event.data.spineMesh,
                                );
                                const newHeartline = uploadLineGeometry(
                                    device,
                                    buildHeartlinePositions(splineRef.current),
                                );

                                safeDestroyMesh(gpuState.rails);
                                safeDestroyMesh(gpuState.spine);
                                safeDestroyLine(gpuState.heartline);

                                gpuState.rails = newRails;
                                gpuState.spine = newSpine;
                                gpuState.heartline = newHeartline;
                            },
                            { timeout: 100 },
                        );
                    };
                });

                document.onpointerlockchange = () => {
                    pointerLockedRef.current =
                        document.pointerLockElement === canvas;
                };

                let lastTime = 0;
                let frameCount = 0;
                const keyHandler = (t: number) => {
                    if (disposed) return;
                    const dt = (t - lastTime) * 0.001;
                    lastTime = t;
                    frameCount++;

                    const pov = povRef.current;
                    const activeSpline = splineRef.current;
                    const activeMode = modeRef.current;

                    if (activeMode === "pov") {
                        if (
                            keyState.down.has("KeyW") ||
                            keyState.down.has("KeyS")
                        ) {
                            if (!activeSpline.evaluate(pov.pos)) {
                                const m = activeSpline.getLength();
                                const r = pov.pos % m;
                                pov.pos = r < 0 ? r + m : r;
                            }
                            const p = activeSpline.evaluate(pov.pos);
                            if (p) {
                                if (keyState.down.has("KeyW")) {
                                    pov.pos +=
                                        dt *
                                        (p.velocity ?? 0) *
                                        (keyState.shift ? 2 : 1);
                                }
                                if (keyState.down.has("KeyS")) {
                                    pov.pos -=
                                        dt *
                                        (p.velocity ?? 0) *
                                        (keyState.shift ? 2 : 1);
                                }
                                const m = activeSpline.getLength();
                                const r = pov.pos % m;
                                pov.pos = r < 0 ? r + m : r;
                            }
                        }
                    } else {
                        const flyQuat = qmul(
                            qaxisangle(vec(0, 1, 0), flyYawRef.current),
                            qaxisangle(vec(1, 0, 0), flyPitchRef.current),
                        );
                        const speed = keyState.shift ? 60 : 30;
                        if (keyState.down.has("KeyW")) {
                            flyPosRef.current = vadd(
                                flyPosRef.current,
                                qrotate([0, 0, dt * speed], flyQuat),
                            );
                        }
                        if (keyState.down.has("KeyS")) {
                            flyPosRef.current = vadd(
                                flyPosRef.current,
                                qrotate([0, 0, -dt * speed], flyQuat),
                            );
                        }
                        if (keyState.down.has("KeyA")) {
                            flyPosRef.current = vadd(
                                flyPosRef.current,
                                qrotate([dt * speed, 0, 0], flyQuat),
                            );
                        }
                        if (keyState.down.has("KeyD")) {
                            flyPosRef.current = vadd(
                                flyPosRef.current,
                                qrotate([-dt * speed, 0, 0], flyQuat),
                            );
                        }
                    }

                    renderScene(
                        gpuRef.current,
                        splineRef.current,
                        povRef.current,
                        modeRef.current,
                        fovRef.current,
                        flyPosRef.current,
                        flyYawRef.current,
                        flyPitchRef.current,
                        t,
                    );

                    if (frameCount % 6 === 0) {
                        onPovTick();
                    }

                    frameRef.current = requestAnimationFrame(keyHandler);
                };

                frameRef.current = requestAnimationFrame(keyHandler);
            } catch (e) {
                const message = e instanceof Error ? e.message : String(e);
                setError(`WebGPU initialization failed: ${message}`);
            }
        };

        void init();

        const observer = new ResizeObserver(() => {
            const state = gpuRef.current;
            if (!canvas || !state) return;
            const dpr = window.devicePixelRatio || 1;
            resizeCanvasToDisplaySize(canvas, dpr);
            state.context.configure({
                device: state.device,
                format: state.format,
                alphaMode: "opaque",
            });
            state.depthTexture.destroy();
            state.msaaColorTexture.destroy();
            const [depthTexture, depthView] = createDepthTarget(
                state.device,
                canvas.width,
                canvas.height,
            );
            const [msaaColorTexture, msaaColorView] = createMsaaColorTarget(
                state.device,
                state.format,
                canvas.width,
                canvas.height,
            );
            state.depthTexture = depthTexture;
            state.depthView = depthView;
            state.msaaColorTexture = msaaColorTexture;
            state.msaaColorView = msaaColorView;
        });
        observer.observe(canvas);

        return () => {
            disposed = true;
            cancelAnimationFrame(frameRef.current);
            observer.disconnect();

            modelWorkersRef.current.forEach((w) => w.terminate());
            modelWorkersRef.current = [];
            document.onpointerlockchange = null;

            const state = gpuRef.current;
            if (state) {
                safeDestroyMesh(state.ground);
                safeDestroyMesh(state.rails);
                safeDestroyMesh(state.spine);
                safeDestroyLine(state.heartline);
                state.depthTexture.destroy();
                state.msaaColorTexture.destroy();
                state.cameraBuffer.destroy();
                gpuRef.current = null;
            }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        if (modelWorkersRef.current.length === 0) return;
        const worker = modelWorkersRef.current[modelWorkerIdxRef.current];
        modelWorkerIdxRef.current =
            (modelWorkerIdxRef.current + 1) % modelWorkersRef.current.length;
        if (worker) {
            worker.postMessage({
                type: "geometry",
                points: spline.points,
                config,
            });
        }
    }, [spline, config]);

    useEffect(() => {
        const modelType = models.get(config.modelId);
        if (!modelType) return;
        modelWorkersRef.current.forEach((worker) => {
            worker.postMessage({ type: "load", modelType });
        });
    }, [config.modelId, models]);

    const handleContextMenu = (ev: React.MouseEvent) => ev.preventDefault();

    const handleMouseDown = async (ev: React.MouseEvent) => {
        ev.preventDefault();
        if (ev.button === 2) {
            const canvas = canvasRef.current;
            if (!canvas) return;
            try {
                if (!pointerLockedRef.current) {
                    (canvas as any).requestPointerLock({
                        unadjustedMovement: true,
                    });
                } else {
                    document.exitPointerLock();
                }
            } catch {
                console.error("pointer lock failed");
            }
        }
    };

    const handleMouseMove = (ev: React.MouseEvent) => {
        if (pointerLockedRef.current) {
            flyPitchRef.current += ev.movementY * 0.001;
            flyYawRef.current += -ev.movementX * 0.001;
        }
    };

    return (
        <div className="w-full h-full relative">
            <canvas
                ref={canvasRef}
                tabIndex={0}
                className="w-full h-full"
                onContextMenu={handleContextMenu}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
            />
            {error ? (
                <div className="absolute inset-0 flex items-center justify-center bg-white/95 text-neutral-800 p-4 text-sm">
                    {error}
                </div>
            ) : null}
        </div>
    );
}

function renderScene(
    state: GPUContext | null,
    spline: TrackSpline,
    pov: { pos: number },
    mode: "fly" | "pov",
    fov: number,
    flyPos: vec3,
    flyYaw: number,
    flyPitch: number,
    timeMs: number,
) {
    if (!state) return;

    const start = spline.evaluate(pov.pos) ?? spline.evaluate(0);
    if (!start) return;

    const flyQuat = qmul(
        qaxisangle(vec(0, 1, 0), flyYaw),
        qaxisangle(vec(1, 0, 0), flyPitch),
    );

    const cameraPos = mode === "pov" ? start.pos : flyPos;
    const cameraForward =
        mode === "pov"
            ? qrotate([0, 0, 1], start.rot)
            : qrotate([0, 0, 1], flyQuat);
    const cameraUp =
        mode === "pov"
            ? qrotate([0, 1, 0], start.rot)
            : qrotate([0, 1, 0], flyQuat);

    const canvas = state.context.canvas as HTMLCanvasElement;
    if (canvas.width === 0 || canvas.height === 0) return;

    const projection = mat4Perspective(
        (fov * Math.PI) / 180,
        canvas.width / canvas.height,
        0.1,
        5000,
    );
    const view = mat4LookAt(
        cameraPos,
        vadd(cameraPos, cameraForward),
        cameraUp,
    );
    const viewProj = mat4Multiply(projection, view);

    const sunDir = normalize([0.35, 1, 0.22]);

    const uniformData = new Float32Array(VIEW_UNIFORM_FLOATS);
    uniformData.set(viewProj, 0);
    uniformData.set(view, 16);
    uniformData.set(
        [cameraPos[0], cameraPos[1], cameraPos[2], timeMs * 0.001],
        32,
    );
    uniformData.set([sunDir[0], sunDir[1], sunDir[2], 0], 36);
    state.device.queue.writeBuffer(state.cameraBuffer, 0, uniformData);

    const colorView = state.context.getCurrentTexture().createView();
    const encoder = state.device.createCommandEncoder();

    const pass = encoder.beginRenderPass({
        colorAttachments: [
            {
                view: state.msaaColorView,
                resolveTarget: colorView,
                clearValue: { r: 1, g: 1, b: 1, a: 1 },
                loadOp: "clear",
                storeOp: "store",
            },
        ],
        depthStencilAttachment: {
            view: state.depthView,
            depthClearValue: 1,
            depthLoadOp: "clear",
            depthStoreOp: "store",
        },
    });

    pass.setBindGroup(0, state.cameraBindGroup);

    pass.setPipeline(state.groundPipeline);
    pass.setVertexBuffer(0, state.ground.vertexBuffer);
    pass.setIndexBuffer(state.ground.indexBuffer, "uint32");
    pass.drawIndexed(state.ground.indexCount);

    pass.setPipeline(state.shadowPipeline);
    pass.setVertexBuffer(0, state.rails.vertexBuffer);
    pass.setIndexBuffer(state.rails.indexBuffer, "uint32");
    pass.drawIndexed(state.rails.indexCount);
    pass.setVertexBuffer(0, state.spine.vertexBuffer);
    pass.setIndexBuffer(state.spine.indexBuffer, "uint32");
    pass.drawIndexed(state.spine.indexCount);

    pass.setPipeline(state.trackPipeline);
    pass.setVertexBuffer(0, state.rails.vertexBuffer);
    pass.setIndexBuffer(state.rails.indexBuffer, "uint32");
    pass.drawIndexed(state.rails.indexCount);
    pass.setVertexBuffer(0, state.spine.vertexBuffer);
    pass.setIndexBuffer(state.spine.indexBuffer, "uint32");
    pass.drawIndexed(state.spine.indexCount);

    pass.setPipeline(state.heartlinePipeline);
    pass.setVertexBuffer(0, state.heartline.vertexBuffer);
    pass.draw(state.heartline.vertexCount);

    pass.end();

    state.device.queue.submit([encoder.finish()]);
}

function createGroundPipeline(
    device: GPUDevice,
    layout: GPUPipelineLayout,
    format: GPUTextureFormat,
) {
    const module = device.createShaderModule({
        code: `
struct Camera {
  viewProj: mat4x4f,
  view: mat4x4f,
  cameraPosTime: vec4f,
  sunDir: vec4f,
}
@group(0) @binding(0) var<uniform> camera: Camera;

struct VertexOut {
  @builtin(position) position: vec4f,
  @location(0) worldPos: vec3f,
}

@vertex
fn vs_main(@location(0) position: vec3f) -> VertexOut {
  var out: VertexOut;
  out.worldPos = position;
  out.position = camera.viewProj * vec4f(position, 1.0);
  return out;
}

fn gridStrength(worldXZ: vec2f, scale: f32) -> f32 {
  let p = worldXZ / scale;
  let gv = abs(fract(p - 0.5) - 0.5) / fwidth(p);
  let line = min(gv.x, gv.y);
  return 1.0 - min(line, 1.0);
}

@fragment
fn fs_main(in: VertexOut) -> @location(0) vec4f {
  let worldXZ = in.worldPos.xz;
  let coarse = gridStrength(worldXZ, 10.0);
  let fine = gridStrength(worldXZ, 1.0) * 0.45;
  let dist = distance(worldXZ, camera.cameraPosTime.xz);
  let fade = 1.0 - clamp(dist / 900.0, 0.0, 1.0);
  let viewDir = normalize(camera.cameraPosTime.xyz - in.worldPos);
  let angleFade = smoothstep(0.06, 0.32, abs(dot(viewDir, vec3f(0.0, 1.0, 0.0))));
  let grid = (coarse + fine) * fade * angleFade;

  let base = vec3f(0.88, 0.88, 0.88);
  let lineColor = vec3f(0.15, 0.15, 0.15);
  let color = mix(base, lineColor, clamp(grid, 0.0, 1.0));
  return vec4f(color, 1.0);
}
        `,
    });

    return device.createRenderPipeline({
        layout,
        vertex: {
            module,
            entryPoint: "vs_main",
            buffers: [
                {
                    arrayStride: 12,
                    attributes: [
                        { shaderLocation: 0, offset: 0, format: "float32x3" },
                    ],
                },
            ],
        },
        fragment: {
            module,
            entryPoint: "fs_main",
            targets: [{ format }],
        },
        primitive: {
            topology: "triangle-list",
            cullMode: "none",
        },
        depthStencil: {
            format: DEPTH_FORMAT,
            depthWriteEnabled: true,
            depthCompare: "less-equal",
        },
        multisample: {
            count: SAMPLE_COUNT,
        },
    });
}

function createTrackPipeline(
    device: GPUDevice,
    layout: GPUPipelineLayout,
    format: GPUTextureFormat,
) {
    const module = device.createShaderModule({
        code: `
struct Camera {
  viewProj: mat4x4f,
  view: mat4x4f,
  cameraPosTime: vec4f,
  sunDir: vec4f,
}
@group(0) @binding(0) var<uniform> camera: Camera;

struct VertexOut {
  @builtin(position) position: vec4f,
  @location(0) normal: vec3f,
}

@vertex
fn vs_main(@location(0) position: vec3f, @location(1) normal: vec3f) -> VertexOut {
  var out: VertexOut;
  out.position = camera.viewProj * vec4f(position, 1.0);
  out.normal = normal;
  return out;
}

@fragment
fn fs_main(in: VertexOut) -> @location(0) vec4f {
  let n = normalize(in.normal);
  let lightDir = normalize(camera.sunDir.xyz);
  let ndl = max(dot(n, lightDir), 0.0);
  let ambient = 0.40;
  let lit = ambient + ndl * 0.60;
  let baseColor = vec3f(0.196, 0.380, 0.890);
  return vec4f(baseColor * lit, 1.0);
}
        `,
    });

    return device.createRenderPipeline({
        layout,
        vertex: {
            module,
            entryPoint: "vs_main",
            buffers: [
                {
                    arrayStride: 24,
                    attributes: [
                        { shaderLocation: 0, offset: 0, format: "float32x3" },
                        { shaderLocation: 1, offset: 12, format: "float32x3" },
                    ],
                },
            ],
        },
        fragment: {
            module,
            entryPoint: "fs_main",
            targets: [{ format }],
        },
        primitive: {
            topology: "triangle-list",
            cullMode: "back",
        },
        depthStencil: {
            format: DEPTH_FORMAT,
            depthWriteEnabled: true,
            depthCompare: "less-equal",
        },
        multisample: {
            count: SAMPLE_COUNT,
        },
    });
}

function createShadowPipeline(
    device: GPUDevice,
    layout: GPUPipelineLayout,
    format: GPUTextureFormat,
) {
    const module = device.createShaderModule({
        code: `
struct Camera {
  viewProj: mat4x4f,
  view: mat4x4f,
  cameraPosTime: vec4f,
  sunDir: vec4f,
}
@group(0) @binding(0) var<uniform> camera: Camera;

@vertex
fn vs_main(@location(0) position: vec3f) -> @builtin(position) vec4f {
  let flattened = vec3f(position.x, 0.1, position.z);
  return camera.viewProj * vec4f(flattened, 1.0);
}

@fragment
fn fs_main() -> @location(0) vec4f {
  return vec4f(0.0, 0.0, 0.0, 1.0);
}
        `,
    });

    return device.createRenderPipeline({
        layout,
        vertex: {
            module,
            entryPoint: "vs_main",
            buffers: [
                {
                    arrayStride: 24,
                    attributes: [
                        { shaderLocation: 0, offset: 0, format: "float32x3" },
                    ],
                },
            ],
        },
        fragment: {
            module,
            entryPoint: "fs_main",
            targets: [
                {
                    format,
                    blend: {
                        color: {
                            srcFactor: "src-alpha",
                            dstFactor: "one-minus-src-alpha",
                            operation: "add",
                        },
                        alpha: {
                            srcFactor: "one",
                            dstFactor: "one-minus-src-alpha",
                            operation: "add",
                        },
                    },
                },
            ],
        },
        primitive: {
            topology: "triangle-list",
            cullMode: "none",
        },
        depthStencil: {
            format: DEPTH_FORMAT,
            depthWriteEnabled: false,
            depthCompare: "always",
            depthBias: -8,
        },
        multisample: {
            count: SAMPLE_COUNT,
        },
    });
}

function createHeartlinePipeline(
    device: GPUDevice,
    layout: GPUPipelineLayout,
    format: GPUTextureFormat,
) {
    const module = device.createShaderModule({
        code: `
struct Camera {
  viewProj: mat4x4f,
  view: mat4x4f,
  cameraPosTime: vec4f,
  sunDir: vec4f,
}
@group(0) @binding(0) var<uniform> camera: Camera;

@vertex
fn vs_main(@location(0) position: vec3f) -> @builtin(position) vec4f {
  return camera.viewProj * vec4f(position, 1.0);
}

@fragment
fn fs_main() -> @location(0) vec4f {
  return vec4f(1.0, 0.08, 0.08, 1.0);
}
        `,
    });

    return device.createRenderPipeline({
        layout,
        vertex: {
            module,
            entryPoint: "vs_main",
            buffers: [
                {
                    arrayStride: 12,
                    attributes: [
                        { shaderLocation: 0, offset: 0, format: "float32x3" },
                    ],
                },
            ],
        },
        fragment: {
            module,
            entryPoint: "fs_main",
            targets: [{ format }],
        },
        primitive: {
            topology: "line-strip",
        },
        depthStencil: {
            format: DEPTH_FORMAT,
            depthWriteEnabled: false,
            depthCompare: "less-equal",
        },
        multisample: {
            count: SAMPLE_COUNT,
        },
    });
}

function uploadIndexedGeometry(
    device: GPUDevice,
    geometry: Geometry,
): GpuIndexedMesh {
    const vertexData = interleavePositionNormals(
        geometry.positions,
        geometry.normals,
    );
    const vertexBuffer = createBufferWithData(
        device,
        vertexData,
        GPUBufferUsage.VERTEX,
    );
    const indexBuffer = createBufferWithData(
        device,
        geometry.indices,
        GPUBufferUsage.INDEX,
    );
    return {
        vertexBuffer,
        indexBuffer,
        indexCount: geometry.indices.length,
    };
}

function uploadGroundMesh(device: GPUDevice): GpuIndexedMesh {
    const positions = new Float32Array([
        -GROUND_SIZE,
        0,
        -GROUND_SIZE,
        GROUND_SIZE,
        0,
        -GROUND_SIZE,
        GROUND_SIZE,
        0,
        GROUND_SIZE,
        -GROUND_SIZE,
        0,
        GROUND_SIZE,
    ]);
    const indices = new Uint32Array([0, 1, 2, 0, 2, 3]);

    return {
        vertexBuffer: createBufferWithData(
            device,
            positions,
            GPUBufferUsage.VERTEX,
        ),
        indexBuffer: createBufferWithData(
            device,
            indices,
            GPUBufferUsage.INDEX,
        ),
        indexCount: indices.length,
    };
}

function uploadLineGeometry(
    device: GPUDevice,
    positions: Float32Array,
): GpuLine {
    return {
        vertexBuffer: createBufferWithData(
            device,
            positions,
            GPUBufferUsage.VERTEX,
        ),
        vertexCount: positions.length / 3,
    };
}

function createBufferWithData(
    device: GPUDevice,
    data: Float32Array | Uint32Array,
    usage: GPUBufferUsageFlags,
): GPUBuffer {
    const buffer = device.createBuffer({
        size: alignTo(data.byteLength, 4),
        usage: usage | GPUBufferUsage.COPY_DST,
        mappedAtCreation: true,
    });

    if (data instanceof Float32Array) {
        new Float32Array(buffer.getMappedRange()).set(data);
    } else {
        new Uint32Array(buffer.getMappedRange()).set(data);
    }
    buffer.unmap();
    return buffer;
}

function createDepthTarget(
    device: GPUDevice,
    width: number,
    height: number,
): [GPUTexture, GPUTextureView] {
    const texture = device.createTexture({
        size: { width: Math.max(1, width), height: Math.max(1, height) },
        sampleCount: SAMPLE_COUNT,
        format: DEPTH_FORMAT,
        usage: GPUTextureUsage.RENDER_ATTACHMENT,
    });
    return [texture, texture.createView()];
}

function createMsaaColorTarget(
    device: GPUDevice,
    format: GPUTextureFormat,
    width: number,
    height: number,
): [GPUTexture, GPUTextureView] {
    const texture = device.createTexture({
        size: { width: Math.max(1, width), height: Math.max(1, height) },
        sampleCount: SAMPLE_COUNT,
        format,
        usage: GPUTextureUsage.RENDER_ATTACHMENT,
    });
    return [texture, texture.createView()];
}

function interleavePositionNormals(
    positions: Float32Array,
    normals: Float32Array,
): Float32Array {
    const count = positions.length / 3;
    const interleaved = new Float32Array(count * 6);
    for (let i = 0; i < count; i++) {
        interleaved[i * 6 + 0] = positions[i * 3 + 0];
        interleaved[i * 6 + 1] = positions[i * 3 + 1];
        interleaved[i * 6 + 2] = positions[i * 3 + 2];
        interleaved[i * 6 + 3] = normals[i * 3 + 0];
        interleaved[i * 6 + 4] = normals[i * 3 + 1];
        interleaved[i * 6 + 5] = normals[i * 3 + 2];
    }
    return interleaved;
}

function buildHeartlinePositions(spline: TrackSpline): Float32Array {
    const points = spline.intervalPoints(0.1);
    const out = new Float32Array(points.length * 3);
    for (let i = 0; i < points.length; i++) {
        const p = points[i].point.pos;
        out[i * 3 + 0] = p[0];
        out[i * 3 + 1] = p[1];
        out[i * 3 + 2] = p[2];
    }
    return out;
}

function safeDestroyMesh(mesh: GpuIndexedMesh) {
    mesh.vertexBuffer.destroy();
    mesh.indexBuffer.destroy();
}

function safeDestroyLine(line: GpuLine) {
    line.vertexBuffer.destroy();
}

function resizeCanvasToDisplaySize(canvas: HTMLCanvasElement, dpr: number) {
    const width = Math.max(1, Math.floor(canvas.clientWidth * dpr));
    const height = Math.max(1, Math.floor(canvas.clientHeight * dpr));
    if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
    }
}

function alignTo(value: number, alignment: number) {
    return Math.ceil(value / alignment) * alignment;
}

function normalize(v: vec3): vec3 {
    const len = Math.hypot(v[0], v[1], v[2]);
    if (len <= 1e-6) return [0, 1, 0];
    return [v[0] / len, v[1] / len, v[2] / len];
}

function mat4Perspective(
    fovy: number,
    aspect: number,
    near: number,
    far: number,
): Float32Array {
    const f = 1 / Math.tan(fovy / 2);
    const nf = 1 / (near - far);
    const out = new Float32Array(16);

    out[0] = f / aspect;
    out[5] = f;
    out[10] = far * nf;
    out[11] = -1;
    out[14] = far * near * nf;

    return out;
}

function mat4LookAt(eye: vec3, center: vec3, up: vec3): Float32Array {
    const z = normalize([
        eye[0] - center[0],
        eye[1] - center[1],
        eye[2] - center[2],
    ]);
    const x = normalize(cross(up, z));
    const y = cross(z, x);

    const out = new Float32Array(16);
    out[0] = x[0];
    out[1] = y[0];
    out[2] = z[0];
    out[3] = 0;

    out[4] = x[1];
    out[5] = y[1];
    out[6] = z[1];
    out[7] = 0;

    out[8] = x[2];
    out[9] = y[2];
    out[10] = z[2];
    out[11] = 0;

    out[12] = -dot(x, eye);
    out[13] = -dot(y, eye);
    out[14] = -dot(z, eye);
    out[15] = 1;

    return out;
}

function mat4Multiply(a: Float32Array, b: Float32Array): Float32Array {
    const out = new Float32Array(16);
    const a00 = a[0],
        a01 = a[1],
        a02 = a[2],
        a03 = a[3];
    const a10 = a[4],
        a11 = a[5],
        a12 = a[6],
        a13 = a[7];
    const a20 = a[8],
        a21 = a[9],
        a22 = a[10],
        a23 = a[11];
    const a30 = a[12],
        a31 = a[13],
        a32 = a[14],
        a33 = a[15];

    const b00 = b[0],
        b01 = b[1],
        b02 = b[2],
        b03 = b[3];
    const b10 = b[4],
        b11 = b[5],
        b12 = b[6],
        b13 = b[7];
    const b20 = b[8],
        b21 = b[9],
        b22 = b[10],
        b23 = b[11];
    const b30 = b[12],
        b31 = b[13],
        b32 = b[14],
        b33 = b[15];

    out[0] = a00 * b00 + a10 * b01 + a20 * b02 + a30 * b03;
    out[1] = a01 * b00 + a11 * b01 + a21 * b02 + a31 * b03;
    out[2] = a02 * b00 + a12 * b01 + a22 * b02 + a32 * b03;
    out[3] = a03 * b00 + a13 * b01 + a23 * b02 + a33 * b03;
    out[4] = a00 * b10 + a10 * b11 + a20 * b12 + a30 * b13;
    out[5] = a01 * b10 + a11 * b11 + a21 * b12 + a31 * b13;
    out[6] = a02 * b10 + a12 * b11 + a22 * b12 + a32 * b13;
    out[7] = a03 * b10 + a13 * b11 + a23 * b12 + a33 * b13;
    out[8] = a00 * b20 + a10 * b21 + a20 * b22 + a30 * b23;
    out[9] = a01 * b20 + a11 * b21 + a21 * b22 + a31 * b23;
    out[10] = a02 * b20 + a12 * b21 + a22 * b22 + a32 * b23;
    out[11] = a03 * b20 + a13 * b21 + a23 * b22 + a33 * b23;
    out[12] = a00 * b30 + a10 * b31 + a20 * b32 + a30 * b33;
    out[13] = a01 * b30 + a11 * b31 + a21 * b32 + a31 * b33;
    out[14] = a02 * b30 + a12 * b31 + a22 * b32 + a32 * b33;
    out[15] = a03 * b30 + a13 * b31 + a23 * b32 + a33 * b33;
    return out;
}

function dot(a: vec3, b: vec3) {
    return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

function cross(a: vec3, b: vec3): vec3 {
    return [
        a[1] * b[2] - a[2] * b[1],
        a[2] * b[0] - a[0] * b[2],
        a[0] * b[1] - a[1] * b[0],
    ];
}
