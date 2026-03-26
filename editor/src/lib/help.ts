export type HelpTopicId =
    | "section-length"
    | "curve-radius"
    | "curve-total-angle"
    | "curve-direction-angle"
    | "fixed-speed"
    | "fixed-speed-toggle"
    | "dynamic-length"
    | "transition-value"
    | "transition-curve"
    | "transition-center"
    | "transition-tension"
    | "anchor-height"
    | "heartline-height"
    | "friction-parameter"
    | "track-model"
    | "target-velocity"
    | "launch-acceleration"
    | "overview";

export function getHelpUrl(topic: HelpTopicId = "overview"): string {
    return `/help#${topic}`;
}

export function openHelpTopic(topic: HelpTopicId = "overview") {
    window.open(getHelpUrl(topic), "_blank", "noopener,noreferrer");
}
