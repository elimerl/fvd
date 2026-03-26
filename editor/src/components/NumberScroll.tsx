import { useContext, useEffect, useMemo, useRef, useState } from "react";
import * as _ from "lodash-es";
import { UnitContext } from "../contexts/UnitContext";
import { fromDisplay, getUnitLabel, toDisplay } from "../lib/unitConversions";

interface Props {
    value: number;
    onChange: (v: number) => void;
    fractionalDigits?: number;
    min?: number;
    max?: number;
    unit?: string;
    disabled?: boolean;
}

export function NumberScroll({
    value,
    onChange,
    fractionalDigits = 1,
    min = -100000,
    max = 100000,
    unit = "",
    disabled = false,
}: Props) {
    const { system } = useContext(UnitContext);
    const [mode, setMode] = useState<"idle" | "editing">("idle");
    const [draft, setDraft] = useState("");

    const outerRef = useRef<HTMLDivElement>(null);
    const dragAccumRef = useRef(0);
    const pointerIdRef = useRef<number | null>(null);
    const displayStartRef = useRef(0);

    const digits = fractionalDigits + 1;
    const step = Math.pow(10, -fractionalDigits);

    const displayValue = useMemo(() => toDisplay(value, unit, system), [value, unit, system]);
    const displayUnit = getUnitLabel(unit, system);

    const clampRoundInternal = (v: number) => {
        let next = _.round(v, digits);
        next = _.clamp(next, min, max);
        return next;
    };

    const adjustByStep = (sourceValue: number, deltaSign: number, shift: boolean, ctrl: boolean) => {
        const amount = step * (ctrl ? 0.1 : 1) * (shift ? 10 : 1);
        const nextDisplay = sourceValue + deltaSign * amount;
        const nextInternal = fromDisplay(nextDisplay, unit, system);
        const clampedInternal = clampRoundInternal(nextInternal);
        onChange(clampedInternal);
        return toDisplay(clampedInternal, unit, system);
    };

    useEffect(() => {
        const el = outerRef.current;
        if (!el) return;

        const handler = (ev: WheelEvent) => {
            if (disabled) return;
            ev.preventDefault();
            const dy = Math.sign(ev.deltaY === 0 ? ev.deltaX : ev.deltaY);
            adjustByStep(displayValue, -dy, ev.shiftKey, ev.ctrlKey);
        };

        el.addEventListener("wheel", handler, { passive: false });
        return () => el.removeEventListener("wheel", handler);
    }, [disabled, displayValue, unit, system, step, min, max, digits]);

    const onPointerDown = (ev: React.PointerEvent<HTMLDivElement>) => {
        if (disabled || ev.button !== 0) return;
        pointerIdRef.current = ev.pointerId;
        dragAccumRef.current = 0;
        displayStartRef.current = displayValue;
        ev.currentTarget.setPointerCapture(ev.pointerId);
    };

    const onPointerMove = (ev: React.PointerEvent<HTMLDivElement>) => {
        if (disabled || pointerIdRef.current !== ev.pointerId) return;
        dragAccumRef.current += ev.movementX;

        const rangeScale = Math.max(1, Math.abs(displayStartRef.current) / 10);
        const nextDisplay =
            displayStartRef.current + (dragAccumRef.current / 28) * step * rangeScale;
        const nextInternal = fromDisplay(nextDisplay, unit, system);
        onChange(clampRoundInternal(nextInternal));
    };

    const onPointerUp = (ev: React.PointerEvent<HTMLDivElement>) => {
        if (disabled || pointerIdRef.current !== ev.pointerId) return;
        if (ev.currentTarget.hasPointerCapture(ev.pointerId)) {
            ev.currentTarget.releasePointerCapture(ev.pointerId);
        }

        const wasClick = Math.abs(dragAccumRef.current) < 4;
        pointerIdRef.current = null;

        if (wasClick) {
            setDraft(displayValue.toFixed(fractionalDigits));
            setMode("editing");
        }
    };

    const commit = (raw: string) => {
        const parsed = parseFloat(raw);
        if (!Number.isFinite(parsed)) {
            setMode("idle");
            return;
        }
        const nextInternal = fromDisplay(parsed, unit, system);
        onChange(clampRoundInternal(nextInternal));
        setMode("idle");
    };

    const handleInputKeyDown = (ev: React.KeyboardEvent<HTMLInputElement>) => {
        if (ev.key === "Enter") {
            ev.preventDefault();
            commit(draft);
            return;
        }
        if (ev.key === "Escape") {
            ev.preventDefault();
            setMode("idle");
            return;
        }
        if (ev.key === "ArrowUp") {
            ev.preventDefault();
            const parsed = parseFloat(draft);
            const next = adjustByStep(Number.isFinite(parsed) ? parsed : displayValue, 1, ev.shiftKey, ev.ctrlKey);
            setDraft(next.toFixed(fractionalDigits));
            return;
        }
        if (ev.key === "ArrowDown") {
            ev.preventDefault();
            const parsed = parseFloat(draft);
            const next = adjustByStep(Number.isFinite(parsed) ? parsed : displayValue, -1, ev.shiftKey, ev.ctrlKey);
            setDraft(next.toFixed(fractionalDigits));
        }
    };

    const showValue = _.clamp(displayValue, toDisplay(min, unit, system), toDisplay(max, unit, system));

    if (mode === "editing" && !disabled) {
        return (
            <div ref={outerRef} className="relative min-w-[5.5rem]">
                <input
                    autoFocus
                    type="text"
                    value={draft}
                    onChange={(ev) => setDraft(ev.target.value)}
                    className="bg-neutral-700 border border-blue-500 rounded font-mono text-sm text-right pr-8 pl-1.5 py-0.5 w-full outline-none"
                    onBlur={() => commit(draft)}
                    onKeyDown={handleInputKeyDown}
                    onFocus={(ev) => ev.currentTarget.select()}
                    onClick={(ev) => ev.currentTarget.select()}
                />
                <span className="absolute right-1.5 top-1/2 -translate-y-1/2 text-xs text-neutral-400 pointer-events-none">
                    {displayUnit}
                </span>
            </div>
        );
    }

    return (
        <div
            ref={outerRef}
            className={
                "cursor-ew-resize bg-neutral-800 border border-neutral-600 rounded font-mono text-sm text-right px-1.5 py-0.5 min-w-[5.5rem] select-none flex items-center justify-end gap-1 " +
                (disabled ? "opacity-50 cursor-not-allowed" : "")
            }
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            title={displayUnit}
        >
            <span>{showValue.toFixed(fractionalDigits)}</span>
            <span className="text-xs text-neutral-500">{displayUnit}</span>
        </div>
    );
}
