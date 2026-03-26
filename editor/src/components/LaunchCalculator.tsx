import { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { NumberScroll } from "./NumberScroll";
import { NumberDisplay } from "./NumberDisplay";
import { G } from "../lib/core/constants";
import { LabelWithHelp } from "./LabelWithHelp";

interface Props {
    open: boolean;
    onOpenChange: (v: boolean) => void;
}

export function LaunchCalculator({ open, onOpenChange }: Props) {
    const [launchVelocity, setLaunchVelocity] = useState(10);
    const [launchAccel, setLaunchAccel] = useState(1);

    const launchTime = launchVelocity / (launchAccel * G);
    const launchLength = 0.5 * (launchAccel * G) * (launchTime * launchTime);

    return (
        <Dialog.Root open={open} onOpenChange={onOpenChange}>
            <Dialog.Portal>
                <Dialog.Overlay className="fixed inset-0 z-50 bg-black/60" />
                <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-[490px] -translate-x-1/2 -translate-y-1/2 border border-neutral-700 bg-neutral-800 p-5 shadow-lg outline-none text-neutral-200">
                    <Dialog.Title className="flex w-full items-center justify-center text-lg font-semibold text-neutral-100">
                        Launch track calculator
                    </Dialog.Title>
                    <Dialog.Description className="text-sm text-neutral-400 text-center mb-4">
                        Calculates launch time, and launch track length given an acceleration and a desired velocity.
                    </Dialog.Description>
                    <div className="flex flex-col gap-2 py-2">
                        <label className="flex items-center justify-between">
                            <span className="mr-2 text-sm text-neutral-400">
                                <LabelWithHelp label="Velocity" topic="target-velocity" />
                            </span>
                            <NumberScroll
                                value={launchVelocity}
                                onChange={setLaunchVelocity}
                                fractionalDigits={0}
                                min={0.1}
                            />
                        </label>
                        <label className="flex items-center justify-between">
                            <span className="mr-2 text-sm text-neutral-400">
                                <LabelWithHelp label="Launch Acceleration" topic="launch-acceleration" />
                            </span>
                            <NumberScroll
                                value={launchAccel}
                                onChange={setLaunchAccel}
                                min={0.1}
                            />
                        </label>
                        <NumberDisplay unit="m" value={Math.ceil(launchLength)} label="Min Launch Length" />
                        <NumberDisplay unit="s" value={launchTime} label="Min Launch Time" />
                        <Dialog.Close className="button w-min ml-auto mt-2">
                            Close
                        </Dialog.Close>
                    </div>
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    );
}
