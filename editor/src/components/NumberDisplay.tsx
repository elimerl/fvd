interface Props {
    label: string;
    value: number;
    unit?: string;
    parentheses?: boolean;
    plusPositive?: boolean;
    fractionalDigits?: number;
}

export function NumberDisplay({
    label,
    value,
    unit = "",
    parentheses = false,
    plusPositive = false,
    fractionalDigits = 2,
}: Props) {
    const formatted =
        (!plusPositive || value <= 0 ? "" : "+") +
        (value !== undefined && value !== null
            ? value.toFixed(fractionalDigits)
            : "none") +
        unit;

    return (
        <div className="inline-flex m-0">
            {parentheses && "("}
            <span>{label ? label + ": " : "\u00A0"}</span>
            <div className="min-w-24 text-right font-mono">{formatted}</div>
            {parentheses && ")"}
        </div>
    );
}
