import { Trash2 } from "lucide-react";
import { useContext } from "react";
import { Track, type TrackSection } from "../lib/core/Track";
import { Transitions } from "../lib/core/Transitions";
import { UnitContext } from "../contexts/UnitContext";
import type { UnitSystem } from "../contexts/UnitContext";
import { getUnitLabel, toDisplay } from "../lib/unitConversions";
import { NumberScroll } from "./NumberScroll";
import { LabelWithHelp } from "./LabelWithHelp";

interface Props {
    track: Track;
    selectedSectionIdx: number;
    onSelectSection: (i: number) => void;
    onUpdateTrack: (fn: (t: Track) => void) => void;
}

export function SectionSidebar({
    track,
    selectedSectionIdx,
    onSelectSection,
    onUpdateTrack,
}: Props) {
    const { system } = useContext(UnitContext);
    const selectedSection = track.sections[selectedSectionIdx];

    return (
        <div className="w-64 min-w-48 max-w-64 m-4 flex flex-col flex-shrink-0 bg-neutral-900 border-r border-neutral-700 pr-3">
            <div className="flex flex-col flex-grow min-h-0">
                <p className="mb-2 font-semibold text-lg text-neutral-200">
                    Track sections
                </p>
                <div className="h-48 overflow-y-auto border border-neutral-700 bg-neutral-800 flex-shrink-0">
                    {track.sections.map((section, i) => (
                        <div
                            key={i}
                            className={
                                "w-full p-1 border border-neutral-700 flex items-center gap-1 " +
                                (i === selectedSectionIdx
                                    ? "bg-blue-600 text-white"
                                    : "bg-neutral-800 text-neutral-200")
                            }
                        >
                            <button
                                className="flex min-w-0 flex-1 items-center gap-1 text-left hover:opacity-90"
                                onClick={() => onSelectSection(i)}
                            >
                                <span className="truncate">{section.type}</span>
                                <span
                                    className={
                                        "ml-auto text-right text-xs font-mono " +
                                        (i === selectedSectionIdx
                                            ? "text-blue-100"
                                            : "text-neutral-400")
                                    }
                                >
                                    {sectionStat(section, system)}
                                </span>
                            </button>
                            <button
                                className="p-0.5 hover:opacity-70"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    if (track.sections.length > 1) {
                                        onUpdateTrack((t) => {
                                            t.sections.splice(i, 1);
                                        });
                                        onSelectSection(Math.max(0, i - 1));
                                    }
                                }}
                            >
                                <Trash2 size={14} />
                            </button>
                        </div>
                    ))}
                </div>
                <div className="flex gap-1 mt-1">
                    <button
                        className="button text-xs"
                        onClick={() =>
                            onUpdateTrack((t) => {
                                t.sections.splice(selectedSectionIdx + 1, 0, {
                                    type: "straight",
                                    fixedSpeed: 10,
                                    length: 10,
                                });
                            })
                        }
                    >
                        + straight
                    </button>
                    <button
                        className="button text-xs"
                        onClick={() =>
                            onUpdateTrack((t) => {
                                t.sections.splice(selectedSectionIdx + 1, 0, {
                                    type: "curved",
                                    fixedSpeed: 10,
                                    radius: 15,
                                    angle: 45,
                                    direction: 0,
                                });
                            })
                        }
                    >
                        + curved
                    </button>
                    <button
                        className="button text-xs"
                        onClick={() =>
                            onUpdateTrack((t) => {
                                t.sections.splice(selectedSectionIdx + 1, 0, {
                                    type: "force",
                                    fixedSpeed: undefined,
                                    transitions: new Transitions(),
                                });
                            })
                        }
                    >
                        + force
                    </button>
                </div>
                <div className="flex-1 p-2 overflow-y-auto mt-2 bg-neutral-900">
                    <SectionProperties
                        section={selectedSection}
                        onUpdate={(fn) =>
                            onUpdateTrack((t) =>
                                fn(t.sections[selectedSectionIdx] as any),
                            )
                        }
                    />
                </div>
            </div>
        </div>
    );
}

function sectionStat(section: TrackSection, system: UnitSystem): string {
    if (section.type === "straight") {
        const v = toDisplay(section.length, "m", system);
        return `${v.toFixed(1)} ${getUnitLabel("m", system)}`;
    }
    if (section.type === "curved") return `${section.angle.toFixed(0)}°`;
    if (section.type === "force")
        return `${section.transitions.length().toFixed(1)} s`;
    return "";
}

function SectionProperties({
    section,
    onUpdate,
}: {
    section: TrackSection;
    onUpdate: (fn: (s: any) => void) => void;
}) {
    if (section.type === "straight") {
        return (
            <div className="flex flex-col gap-1">
                <label className="flex items-center justify-between text-sm text-neutral-400">
                    <LabelWithHelp label="Length" topic="section-length" />
                    <NumberScroll
                        value={section.length}
                        onChange={(v) =>
                            onUpdate((s) => {
                                s.length = v;
                            })
                        }
                        min={0.1}
                        fractionalDigits={0}
                        unit="m"
                    />
                </label>
                <FixedSpeedField
                    fixedSpeed={section.fixedSpeed}
                    onUpdate={onUpdate}
                />
            </div>
        );
    }

    if (section.type === "curved") {
        return (
            <div className="flex flex-col gap-1">
                <label className="flex items-center justify-between text-sm text-neutral-400">
                    <LabelWithHelp label="Turn Radius" topic="curve-radius" />
                    <NumberScroll
                        value={section.radius}
                        onChange={(v) =>
                            onUpdate((s) => {
                                s.radius = v;
                            })
                        }
                        min={0.1}
                        fractionalDigits={0}
                        unit="m"
                    />
                </label>
                <label className="flex items-center justify-between text-sm text-neutral-400">
                    <LabelWithHelp
                        label="Total Angle"
                        topic="curve-total-angle"
                    />
                    <NumberScroll
                        value={section.angle}
                        onChange={(v) =>
                            onUpdate((s) => {
                                s.angle = v;
                            })
                        }
                        min={0.1}
                        fractionalDigits={0}
                        unit="°"
                    />
                </label>
                <label className="flex items-center justify-between text-sm text-neutral-400">
                    <LabelWithHelp
                        label="Direction"
                        topic="curve-direction-angle"
                    />
                    <NumberScroll
                        value={section.direction}
                        onChange={(v) =>
                            onUpdate((s) => {
                                s.direction = v;
                            })
                        }
                        min={-180}
                        max={180}
                        fractionalDigits={0}
                        unit="°"
                    />
                </label>
                <FixedSpeedField
                    fixedSpeed={section.fixedSpeed}
                    onUpdate={onUpdate}
                />
            </div>
        );
    }

    if (section.type === "force") {
        return (
            <div className="flex flex-col gap-1">
                <FixedSpeedField
                    fixedSpeed={section.fixedSpeed}
                    onUpdate={onUpdate}
                />
            </div>
        );
    }

    return null;
}

function FixedSpeedField({
    fixedSpeed,
    onUpdate,
}: {
    fixedSpeed: number | undefined;
    onUpdate: (fn: (s: any) => void) => void;
}) {
    const enabled = fixedSpeed !== undefined;
    return (
        <div className="flex items-center justify-between text-sm text-neutral-400">
            <label className="inline-flex items-center gap-1">
                <LabelWithHelp label="Fixed Speed" topic="fixed-speed-toggle" />
                <input
                    type="checkbox"
                    checked={enabled}
                    onChange={(e) =>
                        onUpdate((s) => {
                            s.fixedSpeed = e.target.checked ? 10 : undefined;
                        })
                    }
                />
            </label>
            <NumberScroll
                value={fixedSpeed ?? 10}
                onChange={(v) =>
                    onUpdate((s) => {
                        s.fixedSpeed = v;
                    })
                }
                min={0.1}
                fractionalDigits={0}
                unit="m/s"
                disabled={!enabled}
            />
        </div>
    );
}
