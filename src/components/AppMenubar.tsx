import { useContext, useRef, useState } from "react";
import { Track } from "../lib/core/Track";
import { UnitContext } from "../contexts/UnitContext";

interface Props {
    track: Track;
    onNewTrack: () => void;
    onImportTrack: (t: Track) => void;
    onExportTrack: () => void;
    onTrackSettingsOpen: () => void;
    onCalculatorsOpen: () => void;
    onHelpOpen: () => void;
}

export function AppMenubar({
    track,
    onNewTrack,
    onImportTrack,
    onExportTrack,
    onTrackSettingsOpen,
    onCalculatorsOpen,
    onHelpOpen,
}: Props) {
    const { system, setSystem } = useContext(UnitContext);
    const [fileMenuOpen, setFileMenuOpen] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const fileItems = [
        {
            label: "New",
            action: () => {
                onNewTrack();
                setFileMenuOpen(false);
            },
        },
        {
            label: "Import track JSON",
            action: () => {
                fileInputRef.current?.click();
                setFileMenuOpen(false);
            },
        },
        {
            label: "Export track JSON",
            action: () => {
                onExportTrack();
                setFileMenuOpen(false);
            },
        },
        {
            label: "Track settings",
            action: () => {
                onTrackSettingsOpen();
                setFileMenuOpen(false);
            },
        },
        {
            label: "Calculators",
            action: () => {
                onCalculatorsOpen();
                setFileMenuOpen(false);
            },
        },
        {
            label: "Help / Onboarding",
            action: () => {
                onHelpOpen();
                setFileMenuOpen(false);
            },
        },
    ];

    const handleFileImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const contents = await file.text();
        const json = JSON.parse(contents);
        if (confirm("Importing a track replaces the current track. Are you sure?")) {
            onImportTrack(Track.fromJSON(json));
        }
        e.target.value = "";
    };

    return (
        <div className="flex h-10 items-center gap-1 border-b border-neutral-700 bg-neutral-900 px-2 flex-shrink-0 relative z-10 text-neutral-100">
            <span className="font-semibold mr-2 text-neutral-200">forcevector.app</span>

            <div className="relative">
                <button
                    className={
                        "px-2 py-1 rounded text-sm text-neutral-200 hover:bg-neutral-800 " +
                        (fileMenuOpen ? "bg-neutral-800" : "")
                    }
                    onClick={() => setFileMenuOpen((o) => !o)}
                    onBlur={() => setTimeout(() => setFileMenuOpen(false), 150)}
                >
                    File
                </button>
                {fileMenuOpen && (
                    <div className="absolute top-full left-0 mt-0.5 w-48 bg-neutral-800 border border-neutral-700 shadow-md z-50">
                        {fileItems.map((item) => (
                            <button
                                key={item.label}
                                className="w-full text-left px-3 py-1.5 text-sm hover:bg-neutral-700 text-neutral-200"
                                onClick={item.action}
                            >
                                {item.label}
                            </button>
                        ))}
                    </div>
                )}
            </div>
            <button
                className="px-2 py-0.5 rounded text-xs font-mono bg-neutral-700 border border-neutral-600 hover:bg-neutral-600 text-neutral-300 ml-2"
                onClick={() => setSystem(system === "metric" ? "imperial" : "metric")}
                title="Toggle unit system"
            >
                {system === "metric" ? "m/s" : "mph"}
            </button>

            <input
                ref={fileInputRef}
                type="file"
                accept="application/json"
                className="hidden"
                onChange={handleFileImport}
            />
        </div>
    );
}
