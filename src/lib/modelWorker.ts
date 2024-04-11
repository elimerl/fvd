import { TrackModelType } from "./coaster_types/model";
import { TrackSpline } from "./core/TrackSpline";
import { vec, vadd } from "./core/math";

let modelType: TrackModelType;
onmessage = (e) => {
    if (e.data.type === "load") {
        modelType = new TrackModelType(e.data.modelType);
    } else if (e.data.type === "geometry") {
        const spline = new TrackSpline();
        spline.points = e.data.points;
        const railsMesh = modelType.makeRailsMesh(spline);
        const spineMesh = modelType.makeSpineMesh(spline);

        postMessage({ railsMesh, spineMesh });
    }
};
