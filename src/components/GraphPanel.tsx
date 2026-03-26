import { Graph } from "./Graph";
import { TransitionEditor } from "./TransitionEditor";
import { Transitions } from "../lib/core/Transitions";
import type { Forces } from "../lib/core/Track";

interface Props {
    transitions: Transitions | undefined;
    selected: { i: number; arr: "vert" | "lat" | "roll" } | undefined;
    onSelectedChange: (s: { i: number; arr: "vert" | "lat" | "roll" } | undefined) => void;
    onTransitionsChange: (t: Transitions) => void;
    startForces: Forces | undefined;
    markerTime: number;
    trackRollAngleAtTime?: (t: number) => number | undefined;
    solveRollEndValue?: (transitionIndex: number) => number | undefined;
}

export function GraphPanel({
    transitions,
    selected,
    onSelectedChange,
    onTransitionsChange,
    startForces,
    markerTime,
    trackRollAngleAtTime,
    solveRollEndValue,
}: Props) {
    if (!transitions || !startForces) {
        return (
            <div className="h-full w-full flex items-center justify-center text-neutral-500 text-sm bg-neutral-900">
                select a section with a graph
            </div>
        );
    }

    return (
        <div className="h-full flex flex-row">
            <TransitionEditor
                selected={selected}
                transitions={transitions}
                startForces={startForces}
                onTransitionsChange={onTransitionsChange}
                trackRollAngleAtTime={trackRollAngleAtTime}
                solveRollEndValue={solveRollEndValue}
            />
            <div className="flex-1 h-full pb-8">
                <Graph
                    transitions={transitions}
                    selected={selected}
                    onSelectedChange={onSelectedChange}
                    onTransitionsChange={onTransitionsChange}
                    startForces={startForces}
                    markerTime={markerTime}
                    trackRollAngleAtTime={trackRollAngleAtTime}
                />
            </div>
        </div>
    );
}
