import { BufferAttribute, BufferGeometry } from "three";
import { vsub, type vec3, vec, qrotate, vadd } from "../core/math";

import modelsJSON from "./models.json";
import type { TrackSpline } from "../core/TrackSpline";

export type Geometry = {
    vertices: vec3[];
    indices: number[];
};

export function toBufferGeometry(geometry: Geometry): BufferGeometry {
    const threeGeometry = new BufferGeometry();
    threeGeometry.setIndex(geometry.indices);
    threeGeometry.setAttribute(
        "position",
        new BufferAttribute(new Float32Array(geometry.vertices.flat()), 3)
    );

    return threeGeometry;
}

export type RailGeometry = {
    type: "cylinder";
    radius: number;
};

// model info: gauge is from center of rail to center of other rail
// all distances in meters

export class TrackModelType {
    name: string;
    railGauge: number;
    railGeometry: RailGeometry;

    constructor(info: {
        name: string;
        railGauge: number;
        railGeometry: RailGeometry;
    }) {
        this.name = info.name;
        this.railGauge = info.railGauge;
        this.railGeometry = info.railGeometry;
    }

    static fromJSON(json: any): TrackModelType {
        return new TrackModelType({
            name: json.name,
            railGauge: json.railGauge,
            railGeometry: json.railGeometry,
        });
    }

    makeRailMeshes(
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

        this.makeRail(
            spline,
            heartlineHeight,
            baseVertices,
            vertices,
            indices,
            -1
        );

        this.makeRail(
            spline,
            heartlineHeight,
            baseVertices,
            vertices,
            indices,
            1
        );

        return { vertices, indices };
    }

    private makeRail(
        spline: TrackSpline,
        heartlineHeight: number,
        baseVertices: vec3[],
        vertices: vec3[],
        indices: number[],
        side: -1 | 1
    ) {
        const indexArray = [];

        for (let i = 0; i < spline.points.length; i++) {
            {
                const trackPoint = vsub(
                    spline.points[i].pos,
                    qrotate(
                        vec((this.railGauge / 2) * side, heartlineHeight, 0),
                        spline.points[i].rot
                    )
                );
                const indexRow = [];
                for (let j = 0; j < baseVertices.length; j++) {
                    const baseVertex = baseVertices[j];
                    const point = vadd(
                        trackPoint,
                        qrotate(baseVertex, spline.points[i].rot)
                    );

                    const vertex: vec3 = [point[0], point[1], point[2]];
                    vertices.push(vertex);

                    indexRow.push(vertices.length - 1);
                }

                indexArray.push(indexRow);
                if (1 < i && i < spline.points.length - 1) {
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
            }
        }
    }
}

const modelsArray = modelsJSON.map((model) => TrackModelType.fromJSON(model));

export const models = new Map<string, TrackModelType>();

for (const model of modelsArray) {
    models.set(model.name, model);
}
