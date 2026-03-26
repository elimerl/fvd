import { vsub, type vec3, vec, qrotate, vadd, qslerp } from "../core/math";

import type { TrackPoint, TrackSpline } from "../core/TrackSpline";

export type Geometry = {
    positions: Float32Array;
    normals: Float32Array;
    indices: Uint32Array;
};

export type RailGeometry = {
    type: "cylinder";
    radius: number;
};

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

    makeSpineMesh(spline: TrackSpline, heartlineHeight: number): Geometry {
        const vertices: vec3[] = [];
        const indices: number[] = [];
        const indexArray: number[][] = [];

        const points =
            this.spineInterval !== null
                ? spline.intervalPoints(this.spineInterval)
                : spline.intervalPoints(0);

        for (let i = 0; i < points.length; i++) {
            const indexRow: number[] = [];
            const trackPoint = vsub(
                points[i].point.pos,
                qrotate(vec(0, heartlineHeight, 0), points[i].point.rot)
            );
            const heartlineSign = Math.sign(heartlineHeight) >= 0 ? 1 : -1;

            for (let j = 0; j < this.spineGeometry.vertices.length; j++) {
                let baseVertex = this.spineGeometry.vertices[j];
                baseVertex = vec(baseVertex[2], baseVertex[1], baseVertex[0]);
                const point = vadd(
                    trackPoint,
                    qrotate(
                        [
                            baseVertex[0] * heartlineSign,
                            baseVertex[1] * heartlineSign,
                            baseVertex[2],
                        ],
                        points[i].point.rot
                    )
                );

                vertices.push([point[0], point[1], point[2]]);
                indexRow.push(vertices.length - 1);
            }

            indexArray.push(indexRow);
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

        return finalizeGeometry(vertices, indices);
    }

    makeRailsMesh(
        spline: TrackSpline,
        heartlineHeight: number,
        vertexCount: number = 6
    ): Geometry {
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

        this.makeRail(
            baseVertices,
            vertices,
            indices,
            -1,
            points,
            heartlineHeight
        );

        this.makeRail(baseVertices, vertices, indices, 1, points, heartlineHeight);

        this.makeCrossTies(spline, vertices, indices, heartlineHeight);

        return finalizeGeometry(vertices, indices);
    }

    private makeCrossTies(
        spline: TrackSpline,
        vertices: vec3[],
        indices: number[],
        heartlineHeight: number
    ) {
        if (!this.crossTieGeometry) return;
        const interval = this.crossTieInterval ?? this.spineInterval;
        if (interval === null) throw new Error("no cross tie interval");

        const points = spline.intervalPoints(interval, false);

        for (let i = 0; i < points.length; i++) {
            const trackPointStart = vsub(
                points[i].point.pos,
                qrotate(vec(0, heartlineHeight, 0), points[i].point.rot)
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

                const heartlineSign = Math.sign(heartlineHeight) >= 0 ? 1 : -1;

                const point = vadd(
                    pos,
                    qrotate(
                        [
                            -baseVertex[0] * heartlineSign,
                            baseVertex[1] * heartlineSign,
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
        points: { point: TrackPoint; dist: number }[],
        heartlineHeight: number
    ) {
        const indexArray: number[][] = [];

        for (let i = 0; i < points.length; i++) {
            const trackPoint = vsub(
                points[i].point.pos,
                qrotate(
                    vec((this.railGauge / 2) * side, heartlineHeight, 0),
                    points[i].point.rot
                )
            );
            const indexRow: number[] = [];
            for (let j = 0; j < baseVertices.length; j++) {
                const baseVertex = baseVertices[j];
                const point = vadd(trackPoint, qrotate(baseVertex, points[i].point.rot));

                vertices.push([point[0], point[1], point[2]]);
                indexRow.push(vertices.length - 1);
            }

            indexArray.push(indexRow);
            if (1 < i && i < points.length - 1) {
                for (let j = 0; j < baseVertices.length; j++) {
                    const a = indexArray[i][j];
                    const b = indexArray[i - 1][j];
                    const c = indexArray[i - 1][(j + 1) % baseVertices.length];
                    const d = indexArray[i][(j + 1) % baseVertices.length];

                    indices.push(a, b, d);
                    indices.push(b, c, d);
                }
            }
        }
    }
}

export async function loadModels() {
    const modelsJSON = import.meta.glob("./*.json", { eager: true });
    const models = new Map<string, TrackModelType>();

    for (const [filename, json] of Object.entries(modelsJSON)) {
        const filenameNoJson = filename.slice(2, -5);
        const modelJSON = json as any;

        const spineText = await fetch(`/models/${filenameNoJson}/${modelJSON.spineObj}`).then((r) =>
            r.text()
        );
        const spineObj = parseObj(spineText);

        const crossTieText = await fetch(
            `/models/${filenameNoJson}/${modelJSON.crossTieObj}`
        ).then((r) => r.text());
        const crossTieObj = parseObj(crossTieText);
        const fixedCrossTieGeometry = mergeVertices(
            crossTieObj.vertices,
            crossTieObj.indices,
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
                vertices: spineObj.vertices,
            },
            crossTieGeometry: {
                vertices: fixedCrossTieGeometry.vertices,
                indices: fixedCrossTieGeometry.indices,
            },
        });
        models.set(filenameNoJson, model);
    }

    return models;
}

type ParsedObj = {
    vertices: vec3[];
    indices: number[];
};

function parseObj(source: string): ParsedObj {
    const vertices: vec3[] = [];
    const indices: number[] = [];

    const lines = source.split(/\r?\n/);
    for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) {
            continue;
        }

        if (trimmed.startsWith("v ")) {
            const [, xs, ys, zs] = trimmed.split(/\s+/);
            const x = Number(xs);
            const y = Number(ys);
            const z = Number(zs);
            if (Number.isFinite(x) && Number.isFinite(y) && Number.isFinite(z)) {
                vertices.push([x, y, z]);
            }
            continue;
        }

        if (!trimmed.startsWith("f ")) {
            continue;
        }

        const parts = trimmed.split(/\s+/).slice(1);
        if (parts.length < 3) continue;

        const faceIndices: number[] = [];
        for (const part of parts) {
            const [vertexIdxRaw] = part.split("/");
            const vertexIdx = Number(vertexIdxRaw);
            if (!Number.isInteger(vertexIdx) || vertexIdx === 0) continue;

            // OBJ indices are 1-based. Negative values are relative to the end.
            const normalized = vertexIdx > 0 ? vertexIdx - 1 : vertices.length + vertexIdx;
            if (normalized < 0 || normalized >= vertices.length) continue;
            faceIndices.push(normalized);
        }

        if (faceIndices.length < 3) continue;
        for (let i = 1; i < faceIndices.length - 1; i++) {
            indices.push(faceIndices[0], faceIndices[i], faceIndices[i + 1]);
        }
    }

    return { vertices, indices };
}

function mergeVertices(
    vertices: vec3[],
    indices: number[],
    epsilon: number
): { vertices: vec3[]; indices: number[] } {
    const mergedVertices: vec3[] = [];
    const mergedIndices: number[] = [];
    const map = new Map<string, number>();
    const inv = 1 / epsilon;

    const getKey = (v: vec3) => {
        const x = Math.round(v[0] * inv);
        const y = Math.round(v[1] * inv);
        const z = Math.round(v[2] * inv);
        return `${x},${y},${z}`;
    };

    for (const idx of indices) {
        const vertex = vertices[idx];
        const key = getKey(vertex);
        let mergedIdx = map.get(key);
        if (mergedIdx === undefined) {
            mergedIdx = mergedVertices.length;
            mergedVertices.push(vertex);
            map.set(key, mergedIdx);
        }
        mergedIndices.push(mergedIdx);
    }

    return { vertices: mergedVertices, indices: mergedIndices };
}

function finalizeGeometry(vertices: vec3[], indices: number[]): Geometry {
    const positions = new Float32Array(vertices.length * 3);
    for (let i = 0; i < vertices.length; i++) {
        const v = vertices[i];
        positions[i * 3 + 0] = v[0];
        positions[i * 3 + 1] = v[1];
        positions[i * 3 + 2] = v[2];
    }

    const indexArray = new Uint32Array(indices);
    const normals = computeVertexNormals(positions, indexArray);

    return {
        positions,
        normals,
        indices: indexArray,
    };
}

function computeVertexNormals(
    positions: Float32Array,
    indices: Uint32Array
): Float32Array {
    const normals = new Float32Array(positions.length);

    for (let i = 0; i < indices.length; i += 3) {
        const ia = indices[i] * 3;
        const ib = indices[i + 1] * 3;
        const ic = indices[i + 2] * 3;

        const ax = positions[ia];
        const ay = positions[ia + 1];
        const az = positions[ia + 2];
        const bx = positions[ib];
        const by = positions[ib + 1];
        const bz = positions[ib + 2];
        const cx = positions[ic];
        const cy = positions[ic + 1];
        const cz = positions[ic + 2];

        const abx = bx - ax;
        const aby = by - ay;
        const abz = bz - az;
        const acx = cx - ax;
        const acy = cy - ay;
        const acz = cz - az;

        const nx = aby * acz - abz * acy;
        const ny = abz * acx - abx * acz;
        const nz = abx * acy - aby * acx;

        normals[ia] += nx;
        normals[ia + 1] += ny;
        normals[ia + 2] += nz;
        normals[ib] += nx;
        normals[ib + 1] += ny;
        normals[ib + 2] += nz;
        normals[ic] += nx;
        normals[ic + 1] += ny;
        normals[ic + 2] += nz;
    }

    for (let i = 0; i < normals.length; i += 3) {
        const x = normals[i];
        const y = normals[i + 1];
        const z = normals[i + 2];
        const len = Math.hypot(x, y, z);
        if (len > 1e-6) {
            normals[i] = x / len;
            normals[i + 1] = y / len;
            normals[i + 2] = z / len;
        } else {
            normals[i] = 0;
            normals[i + 1] = 1;
            normals[i + 2] = 0;
        }
    }

    return normals;
}
