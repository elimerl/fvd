import {
    type Object3D,
    BufferAttribute,
    BufferGeometry,
    Mesh as ThreeMesh,
    Points as ThreePoints,
} from "three";
import { OBJLoader } from "three/addons/loaders/OBJLoader.js";
import {
    vsub,
    type vec3,
    vec,
    qrotate,
    vadd,
    vmul,
    qslerp,
    vlerp,
} from "../core/math";

import type { TrackPoint, TrackSpline } from "../core/TrackSpline";
import { BufferGeometryUtils } from "three/examples/jsm/Addons.js";

export type Geometry = {
    vertices: Float32Array;
    indices: number[];
};

export function toBufferGeometry(geometry: Geometry): BufferGeometry {
    const threeGeometry = new BufferGeometry();
    threeGeometry.setIndex(geometry.indices);
    threeGeometry.setAttribute(
        "position",
        new BufferAttribute(geometry.vertices, 3)
    );

    return threeGeometry;
}

export type RailGeometry = {
    type: "cylinder";
    radius: number;
};

// model info: gauge is from center of rail to center of other rail
// all distances in meters

const RAIL_INTERVAL = 0.1;

export class TrackModelType {
    name: string;
    author: string;

    heartlineHeight: number;
    railGauge: number;
    railGeometry: RailGeometry;
    readonly spineGeometry: { vertices: vec3[] };
    spineInterval: number | null;
    crossTieInterval: number | null;
    readonly crossTieGeometry: { vertices: vec3[]; indices: number[] };

    constructor(info: {
        name: string;
        author: string;
        heartlineHeight: number;
        railGauge: number;
        railGeometry: RailGeometry;
        spineInterval: number | null;
        crossTieInterval: number | null;
        spineGeometry: { vertices: vec3[] };
        crossTieGeometry: { vertices: vec3[]; indices: number[] };
    }) {
        this.name = info.name;
        this.author = info.author;
        this.heartlineHeight = info.heartlineHeight;
        this.railGauge = info.railGauge;
        this.railGeometry = info.railGeometry;
        this.spineInterval = info.spineInterval;
        this.crossTieInterval = info.crossTieInterval;
        this.spineGeometry = info.spineGeometry;
        this.crossTieGeometry = info.crossTieGeometry;

        this.fixGeometryOrder();
    }

    private fixGeometryOrder() {
        this.spineGeometry.vertices.sort((a, b) => {
            const angleA = Math.atan2(a[1], a[2]);
            const angleB = Math.atan2(b[1], b[2]);

            return angleA - angleB;
        });
    }

    makeSpineMesh(spline: TrackSpline): Geometry {
        const vertices: vec3[] = [];
        const indices: number[] = [];
        const indexArray = [];

        const points =
            this.spineInterval !== null
                ? spline.intervalPoints(this.spineInterval)
                : spline.intervalPoints(0);

        for (let i = 0; i < points.length; i++) {
            const indexRow: number[] = [];
            const trackPoint = vsub(
                points[i].point.pos,
                qrotate(vec(0, this.heartlineHeight, 0), points[i].point.rot)
            );

            for (let j = 0; j < this.spineGeometry.vertices.length; j++) {
                let baseVertex = this.spineGeometry.vertices[j];
                baseVertex = vec(baseVertex[2], baseVertex[1], baseVertex[0]);
                const point = vadd(
                    trackPoint,
                    qrotate(
                        [
                            baseVertex[0] * Math.sign(this.heartlineHeight),
                            baseVertex[1] * Math.sign(this.heartlineHeight),
                            baseVertex[2],
                        ],
                        points[i].point.rot
                    )
                );

                const vertex: vec3 = [point[0], point[1], point[2]];
                vertices.push(vertex);

                indexRow.push(vertices.length - 1);
            }

            indexArray.push(indexRow);

            // TODO: add end faces
        }

        for (let i = 0; i < indexArray.length - 1; i++) {
            for (let j = 0; j < this.spineGeometry.vertices.length; j++) {
                const a = indexArray[i][j];
                const b = indexArray[i + 1][j];
                const c =
                    indexArray[i + 1][
                        (j + 1) % this.spineGeometry.vertices.length
                    ];
                const d =
                    indexArray[i][(j + 1) % this.spineGeometry.vertices.length];

                indices.push(c, b, a);
                indices.push(d, c, a);
            }
        }

        return {
            vertices: new Float32Array(vertices.flat()),
            indices,
        };
    }

    makeRailsMesh(spline: TrackSpline, vertexCount: number = 6): Geometry {
        const baseVertices: vec3[] = [];

        if (this.railGeometry.type === "cylinder") {
            for (let i = 0; i < vertexCount; i++) {
                const angle = (i / vertexCount) * Math.PI * 2;
                const x = Math.cos(angle);
                const y = Math.sin(angle);
                baseVertices.push([
                    x * this.railGeometry.radius,
                    y * this.railGeometry.radius,
                    0,
                ]);
            }
        }

        const vertices: vec3[] = [];
        const indices: number[] = [];

        const points = spline.intervalPoints(RAIL_INTERVAL);

        this.makeRail(baseVertices, vertices, indices, -1, points);

        this.makeRail(baseVertices, vertices, indices, 1, points);

        this.makeCrossTies(spline, vertices, indices);

        return { vertices: new Float32Array(vertices.flat()), indices };
    }
    private makeCrossTies(
        spline: TrackSpline,
        vertices: vec3[],
        indices: number[]
    ) {
        if (!this.crossTieGeometry) return;
        const interval = this.crossTieInterval ?? this.spineInterval;
        if (interval === null) throw new Error("no cross tie interval");

        const points = spline.intervalPoints(interval, false);

        for (let i = 0; i < points.length; i++) {
            const trackPointStart = vsub(
                points[i].point.pos,
                qrotate(vec(0, this.heartlineHeight, 0), points[i].point.rot)
            );
            const pointEnd =
                spline.evaluate(points[i].dist + interval) ?? points[i].point;

            for (const index of this.crossTieGeometry.indices) {
                indices.push(index + vertices.length);
            }

            for (let j = 0; j < this.crossTieGeometry.vertices.length; j++) {
                const baseVertex = [
                    this.crossTieGeometry.vertices[j][2],
                    this.crossTieGeometry.vertices[j][1],
                    this.crossTieGeometry.vertices[j][0],
                ];
                const offset = baseVertex[0];

                const rot = qslerp(
                    points[i].point.rot,
                    pointEnd.rot,
                    offset / interval
                );
                const pos = trackPointStart;

                const point = vadd(
                    pos,
                    qrotate(
                        [
                            -baseVertex[0] * Math.sign(this.heartlineHeight),
                            baseVertex[1] * Math.sign(this.heartlineHeight),
                            baseVertex[2],
                        ],
                        rot
                    )
                );
                vertices.push(point);
            }
        }
    }

    private makeRail(
        baseVertices: vec3[],
        vertices: vec3[],
        indices: number[],
        side: -1 | 1,
        points: { point: TrackPoint; dist: number }[]
    ) {
        const indexArray = [];

        for (let i = 0; i < points.length; i++) {
            {
                const trackPoint = vsub(
                    points[i].point.pos,
                    qrotate(
                        vec(
                            (this.railGauge / 2) * side,
                            this.heartlineHeight,
                            0
                        ),
                        points[i].point.rot
                    )
                );
                const indexRow = [];
                for (let j = 0; j < baseVertices.length; j++) {
                    const baseVertex = baseVertices[j];
                    const point = vadd(
                        trackPoint,
                        qrotate(baseVertex, points[i].point.rot)
                    );

                    const vertex: vec3 = [point[0], point[1], point[2]];
                    vertices.push(vertex);

                    indexRow.push(vertices.length - 1);
                }

                indexArray.push(indexRow);
                if (1 < i && i < points.length - 1) {
                    for (let j = 0; j < baseVertices.length; j++) {
                        const a = indexArray[i][j];
                        const b = indexArray[i - 1][j];
                        const c =
                            indexArray[i - 1][(j + 1) % baseVertices.length];
                        const d = indexArray[i][(j + 1) % baseVertices.length];

                        indices.push(a, b, d);
                        indices.push(b, c, d);
                    }
                }

                // TODO: add end faces
            }
        }

        indexArray.length = 0;
    }
}

export async function loadModels() {
    const modelsJSON = import.meta.glob("./*.json", { eager: true });
    const models = new Map<string, TrackModelType>();

    const findMeshChild = (obj: Object3D) => {
        let v: ThreeMesh | ThreePoints | undefined;
        obj.traverse(function (child) {
            if (child instanceof ThreeMesh || child instanceof ThreePoints) {
                v = child;
            }
        });
        return v;
    };

    for (const [filename, json] of Object.entries(modelsJSON)) {
        const filenameNoJson = filename.slice(2, -5);
        const modelJSON = json as any;
        const spineText = await fetch(
            `/models/${filenameNoJson}/${modelJSON.spineObj}`
        ).then((r) => r.text());
        const spineObj = findMeshChild(new OBJLoader().parse(spineText));
        const crossTieText = await fetch(
            `/models/${filenameNoJson}/${modelJSON.crossTieObj}`
        ).then((r) => r.text());
        const crossTieObj = findMeshChild(new OBJLoader().parse(crossTieText));
        const fixedCrossTieGeometry = BufferGeometryUtils.mergeVertices(
            crossTieObj.geometry,
            0.0001
        );
        const model = new TrackModelType({
            name: modelJSON.name,
            author: modelJSON.author,
            heartlineHeight: modelJSON.heartlineHeight,
            crossTieInterval: modelJSON.crossTieInterval,
            spineInterval: modelJSON.spineInterval,
            railGauge: modelJSON.railGauge,
            railGeometry: modelJSON.railGeometry,
            spineGeometry: {
                vertices: float32ArrayToVec3Array(
                    spineObj.geometry.attributes.position.array as Float32Array
                ),
            },
            crossTieGeometry: {
                vertices: float32ArrayToVec3Array(
                    fixedCrossTieGeometry.attributes.position
                        .array as Float32Array
                ),
                indices: Array.from(fixedCrossTieGeometry.index!.array),
            },
        });
        models.set(filenameNoJson, model);
    }

    return models;
}

function float32ArrayToVec3Array(array: Float32Array): vec3[] {
    const result: vec3[] = [];
    for (let i = 0; i < array.length; i += 3) {
        result.push([array[i], array[i + 1], array[i + 2]]);
    }
    return result;
}
