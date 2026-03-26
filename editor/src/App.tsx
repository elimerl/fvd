import { useState, useEffect, useRef, useCallback } from "react";
import { PanelGroup, Panel, PanelResizeHandle } from "react-resizable-panels";
import { Track, forces } from "./lib/core/Track";
import { TrackSpline } from "./lib/core/TrackSpline";
import { Transitions } from "./lib/core/Transitions";
import { loadModels, type TrackModelType } from "./lib/coaster_types/model";
import { keydownHandler, keyupHandler, keyState } from "./lib/input";
import { useTrack } from "./hooks/useTrack";

import { AppMenubar } from "./components/AppMenubar";
import { SectionSidebar } from "./components/SectionSidebar";
import { Renderer } from "./components/Renderer";
import { PointInfo } from "./components/PointInfo";
import { GraphPanel } from "./components/GraphPanel";
import { LaunchCalculator } from "./components/LaunchCalculator";
import { TrackSettings } from "./components/TrackSettings";
import { UnitContext, type UnitSystem } from "./contexts/UnitContext";
import { openHelpTopic } from "./lib/help";

export default function App() {
    const { track, updateTrack, replaceTrack } = useTrack(new Track());
    const [spline, setSpline] = useState<TrackSpline>(() => new Track().getSpline().spline);
    const [sectionStartPos, setSectionStartPos] = useState<number[]>([0]);
    const [selectedSectionIdx, setSelectedSectionIdx] = useState(0);
    const [selected, setSelected] = useState<{ i: number; arr: "vert" | "lat" | "roll" } | undefined>(undefined);
    const [mode, setMode] = useState<"fly" | "pov">("pov");
    const [models, setModels] = useState<Map<string, TrackModelType>>(new Map());
    const [modelsLoaded, setModelsLoaded] = useState(false);
    const [calculatorsOpen, setCalculatorsOpen] = useState(false);
    const [trackSettingsOpen, setTrackSettingsOpen] = useState(false);
    const [unitSystem, setUnitSystem] = useState<UnitSystem>("metric");

    // POV pos as a ref (mutated in animation frame) + synced state for PointInfo display (~10fps)
    const povRef = useRef({ pos: 0 });
    const [povPos, setPovPos] = useState(0);
    const onPovTick = useCallback(() => setPovPos(povRef.current.pos), []);

    // Load 3D models once on mount
    useEffect(() => {
        loadModels().then((m) => {
            setModels(m);
            setModelsLoaded(true);
        });
    }, []);

    // Recompute spline when track changes
    useEffect(() => {
        let id: number;
        const handle = requestIdleCallback(
            () => {
                const result = track.getSpline();
                setSpline(result.spline);
                setSectionStartPos(result.sectionStartPos);
            },
            { timeout: 100 }
        );
        return () => cancelIdleCallback(handle);
    }, [track]);

    // Global keyboard shortcuts
    useEffect(() => {
        const onKeyDown = (ev: KeyboardEvent) => {
            keydownHandler(ev);
            if (ev.code === "Tab") {
                ev.preventDefault();
                ev.stopPropagation();
                setMode((m) => (m === "pov" ? "fly" : "pov"));
            }
        };
        const onKeyUp = (ev: KeyboardEvent) => keyupHandler(ev);
        const onBlur = () => {
            keyState.down.clear();
            keyState.ctrl = false;
            keyState.shift = false;
            keyState.alt = false;
        };
        window.addEventListener("keydown", onKeyDown);
        window.addEventListener("keyup", onKeyUp);
        window.addEventListener("blur", onBlur);
        return () => {
            window.removeEventListener("keydown", onKeyDown);
            window.removeEventListener("keyup", onKeyUp);
            window.removeEventListener("blur", onBlur);
        };
    }, []);

    // Keep selected transition valid when section changes
    const selectedSection = track.sections[selectedSectionIdx];
    const transitions =
        selectedSection?.type === "force" ? selectedSection.transitions : undefined;

    const handleTransitionsChange = useCallback(
        (t: Transitions) => {
            t.updateDynamicLengths();
            updateTrack(() => {
                // transitions are mutated in place; just trigger re-render
            });
        },
        [updateTrack]
    );

    const handleExportTrack = () => {
        const blob = new Blob([JSON.stringify(track)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "track.json";
        a.click();
        URL.revokeObjectURL(url);
    };

    // Compute marker time for graph (uses povPos state which updates at ~10fps)
    const markerTime = (() => {
        if (!transitions) return 0;
        const atSection = spline.evaluate(sectionStartPos[selectedSectionIdx] ?? 0);
        const atPov = spline.evaluate(povPos);
        if (atPov && atSection) {
            return Math.max(0, atPov.time - atSection.time);
        }
        return 0;
    })();

    const startForces =
        sectionStartPos[selectedSectionIdx] !== undefined
            ? forces(spline, sectionStartPos[selectedSectionIdx]) ?? { vert: 0, lat: 0, roll: 0 }
            : undefined;

    return (
        <UnitContext.Provider value={{ system: unitSystem, setSystem: setUnitSystem }}>
            <div className="w-screen h-screen overflow-hidden flex flex-col bg-neutral-900 text-neutral-100">
                <AppMenubar
                    track={track}
                    onNewTrack={() => {
                        replaceTrack(new Track());
                        setSelectedSectionIdx(0);
                        setSelected(undefined);
                        povRef.current.pos = 0;
                    }}
                    onImportTrack={(t) => {
                        replaceTrack(t);
                        setSelectedSectionIdx(0);
                        setSelected(undefined);
                        povRef.current.pos = 0;
                    }}
                    onExportTrack={handleExportTrack}
                    onTrackSettingsOpen={() => setTrackSettingsOpen(true)}
                    onCalculatorsOpen={() => setCalculatorsOpen(true)}
                    onHelpOpen={() => openHelpTopic("overview")}
                />

                <div className="flex flex-row flex-1 min-h-0">
                    <SectionSidebar
                        track={track}
                        selectedSectionIdx={selectedSectionIdx}
                        onSelectSection={(i) => {
                            setSelectedSectionIdx(i);
                            setSelected(undefined);
                        }}
                        onUpdateTrack={updateTrack}
                    />

                    <div className="flex-1 min-w-0 flex flex-col py-4">
                        <PanelGroup direction="vertical" className="flex-1 min-h-0">
                            <Panel minSize={20} className="flex flex-col overflow-hidden">
                                <div className="flex-1 min-h-0 overflow-hidden">
                                    {modelsLoaded ? (
                                        <Renderer
                                            spline={spline}
                                            models={models}
                                            config={track.config}
                                            fov={70}
                                            mode={mode}
                                            onModeChange={setMode}
                                            povRef={povRef}
                                            onPovTick={onPovTick}
                                        />
                                    ) : (
                                        <div className="flex items-center justify-center h-full text-gray-400">
                                            models loading...
                                        </div>
                                    )}
                                </div>
                                <div className="flex-shrink-0 border-t border-neutral-700 bg-neutral-900">
                                    <PointInfo
                                        spline={spline}
                                        povPos={povPos}
                                        mode={mode === "fly" ? "atEnd" : "pov"}
                                        unitSystem={unitSystem}
                                    />
                                </div>
                            </Panel>

                            <PanelResizeHandle className="py-1">
                                <div className="h-px bg-neutral-700 mx-4" />
                            </PanelResizeHandle>

                            <Panel className="overflow-hidden">
                                <GraphPanel
                                    transitions={transitions}
                                    selected={selected}
                                    onSelectedChange={setSelected}
                                    onTransitionsChange={handleTransitionsChange}
                                    startForces={startForces}
                                    markerTime={markerTime}
                                />
                            </Panel>
                        </PanelGroup>
                    </div>
                </div>

                <LaunchCalculator
                    open={calculatorsOpen}
                    onOpenChange={setCalculatorsOpen}
                />

                <TrackSettings
                    open={trackSettingsOpen}
                    onOpenChange={setTrackSettingsOpen}
                    track={track}
                    onUpdateTrack={updateTrack}
                    models={models}
                />
            </div>
        </UnitContext.Provider>
    );
}
