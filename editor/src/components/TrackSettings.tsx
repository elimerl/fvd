import * as Dialog from "@radix-ui/react-dialog";
import { NumberScroll } from "./NumberScroll";
import type { Track, TrackConfig } from "../lib/core/Track";
import type { TrackModelType } from "../lib/coaster_types/model";
import { LabelWithHelp } from "./LabelWithHelp";

interface Props {
    open: boolean;
    onOpenChange: (v: boolean) => void;
    track: Track;
    onUpdateTrack: (fn: (t: Track) => void) => void;
    models: Map<string, TrackModelType>;
}

export function TrackSettings({ open, onOpenChange, track, onUpdateTrack, models }: Props) {
    return (
        <Dialog.Root open={open} onOpenChange={onOpenChange}>
            <Dialog.Portal>
                <Dialog.Overlay className="fixed inset-0 z-50 bg-black/60" />
                <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-[490px] -translate-x-1/2 -translate-y-1/2 border border-neutral-700 bg-neutral-800 p-5 shadow-lg outline-none text-neutral-200">
                    <Dialog.Title className="flex w-full items-center justify-center text-lg font-semibold mb-1 text-neutral-100">
                        Track Settings
                    </Dialog.Title>
                    <Dialog.Description className="text-sm text-neutral-400 text-center mb-3">
                        Configuration for the current track.
                    </Dialog.Description>
                    <div className="flex flex-col gap-2 py-2">
                        <label className="flex items-center justify-between text-sm text-neutral-400">
                            <LabelWithHelp label="Anchor Y" topic="anchor-height" />
                            <NumberScroll
                                value={track.anchor.pos[1]}
                                onChange={(v) =>
                                    onUpdateTrack((t) => {
                                        t.anchor.pos[1] = v;
                                    })
                                }
                                unit="m"
                            />
                        </label>

                        <label className="flex items-center justify-between text-sm text-neutral-400">
                            <LabelWithHelp label="Heartline Height" topic="heartline-height" />
                            <NumberScroll
                                value={track.config.heartlineHeight}
                                onChange={(v) =>
                                    onUpdateTrack((t) => {
                                        t.config.heartlineHeight = v;
                                    })
                                }
                                unit="m"
                            />
                        </label>

                        <label className="flex items-center justify-between text-sm text-neutral-400">
                            <LabelWithHelp label="Friction" topic="friction-parameter" />
                            <NumberScroll
                                value={track.config.parameter}
                                onChange={(v) =>
                                    onUpdateTrack((t) => {
                                        t.config.parameter = v;
                                    })
                                }
                                fractionalDigits={2}
                            />
                        </label>

                        <label className="flex items-center justify-between text-sm text-neutral-400">
                            <LabelWithHelp label="Model" topic="track-model" />
                            <select
                                className="px-1 py-0.5 rounded border border-neutral-600 bg-neutral-700 text-neutral-100 text-sm"
                                value={track.config.modelId}
                                onChange={(e) =>
                                    onUpdateTrack((t) => {
                                        t.config.modelId = e.target.value;
                                    })
                                }
                            >
                                {Array.from(models.entries()).map(([id, model]) => (
                                    <option key={id} value={id}>
                                        {model.name}
                                    </option>
                                ))}
                            </select>
                        </label>

                        <Dialog.Close className="button w-min ml-auto mt-2">
                            Close
                        </Dialog.Close>
                    </div>
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    );
}
