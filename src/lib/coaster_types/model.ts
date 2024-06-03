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
import * as _ from "lodash-es";

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

// trackGeometry must face in the positive X direction in blender and start at x=0
// the blender obj settings should be set to how the screenshot is
// all distances in meters

const RAIL_INTERVAL = 0.1;

export class TrackModelType {
    name: string;
    author: string;

    /// note: not used for track model
    heartlineHeight: number;

    readonly trackGeometry: { vertices: vec3[]; indices: number[] };

    constructor(info: {
        name: string;
        author: string;
        heartlineHeight: number;
        trackGeometry: { vertices: vec3[]; indices: number[] };
    }) {
        this.name = info.name;
        this.author = info.author;
        this.heartlineHeight = info.heartlineHeight;
        this.trackGeometry = info.trackGeometry;
    }

    makeMesh(spline: TrackSpline, heartlineHeight: number): Geometry {
        const geometryLength = _.maxBy(
            this.trackGeometry.vertices,
            (v) => v[0]
        )[0];
        const splineLength = spline.getLength();
        const instances = Math.ceil(splineLength / geometryLength);
        const geometry: { vertices: vec3[]; indices: number[] } = {
            vertices: [],
            indices: [],
        };
        // array
        let offset = 0;
        for (let i = 0; i < instances; i++) {
            geometry.vertices.push(
                ...this.trackGeometry.vertices.map((v) =>
                    vec(v[0] + offset, v[1], v[2])
                )
            );
            geometry.indices.push(
                ...this.trackGeometry.indices.map(
                    (v) => v + this.trackGeometry.vertices.length * i
                )
            );
            offset += geometryLength;
        }
        // curve
        for (let i = 0; i < geometry.vertices.length; i++) {
            const d = geometry.vertices[i][0];
            const point = spline.evaluate(_.clamp(d, 0, splineLength));
            const heartlineSign = Math.sign(heartlineHeight) >= 0 ? 1 : -1;

            const transformed: vec3 = vadd(
                qrotate(
                    [
                        -geometry.vertices[i][2] * heartlineSign,
                        geometry.vertices[i][1] * heartlineSign -
                            heartlineHeight,
                        0,
                    ],
                    point.rot
                ),
                point.pos
            );
            geometry.vertices[i] = transformed;
        }
        return {
            vertices: new Float32Array(geometry.vertices.flat()),
            indices: geometry.indices,
        };
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
        const trackText = await fetch(
            `/models/${filenameNoJson}/${modelJSON.trackObj}`
        ).then((r) => r.text());
        const trackObj = findMeshChild(new OBJLoader().parse(trackText));
        const fixedTrackGeometry = BufferGeometryUtils.mergeVertices(
            trackObj.geometry
        );
        const model = new TrackModelType({
            name: modelJSON.name,
            author: modelJSON.author,
            heartlineHeight: modelJSON.heartlineHeight,
            trackGeometry: {
                vertices: float32ArrayToVec3Array(
                    fixedTrackGeometry.attributes.position.array as Float32Array
                ),
                indices: Array.from(fixedTrackGeometry.index!.array),
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
