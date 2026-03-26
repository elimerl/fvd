import type { ReactNode } from "react";
import type { HelpTopicId } from "../lib/help";
import { getHelpUrl } from "../lib/help";

interface Props {
    label: ReactNode;
    topic: HelpTopicId;
    className?: string;
}

export function LabelWithHelp({ label, topic, className = "" }: Props) {
    return (
        <span className={`inline-flex items-center gap-1 ${className}`.trim()}>
            <span>{label}</span>
            <a
                href={getHelpUrl(topic)}
                target="_blank"
                rel="noopener noreferrer"
                className="help-link"
                aria-label={`Help: ${typeof label === "string" ? label : "field details"}`}
                title="Open help in a new tab"
            >
                ?
            </a>
        </span>
    );
}
