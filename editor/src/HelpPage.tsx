import type { HelpTopicId } from "./lib/help";

type HelpSection = {
    id: HelpTopicId;
    title: string;
    paragraphs: string[];
};

const sections: HelpSection[] = [
    {
        id: "overview",
        title: "Force-Vector Design Editor Overview",
        paragraphs: [
            "This editor is a place where the line of steel and the feeling in the rider's body have to answer to one another, where each section you set is not only where the track goes but how time and force lean upon the train as it passes. You are not drawing a picture so much as setting a sequence of consequences.",
            "Build the path in sections, then shape the force transitions in the graph below, and keep checking the 3D view as if you were riding ahead of yourself. The work comes from moving back and forth between form and feeling until they agree.",
        ],
    },
    {
        id: "section-length",
        title: "Section Length",
        paragraphs: [
            "Section length is simply how much road you are giving the train before the next decision arrives. A longer stretch gives breath and timing; a shorter one brings the next event down upon you sooner.",
            "When the layout feels hurried, lengthen it and let the forces settle. When it drifts and loses intent, shorten it and bring the next element nearer.",
        ],
    },
    {
        id: "curve-radius",
        title: "Turn Radius",
        paragraphs: [
            "Turn radius is the size of the circle your curve belongs to, and the old rule still holds: the smaller the radius, the tighter the turn, the harder the body must answer it.",
            "Use large radii when you want grace and sustained flow. Use small radii only when the force profile is ready to carry that sharpness without punishing the rider.",
        ],
    },
    {
        id: "curve-total-angle",
        title: "Total Angle",
        paragraphs: [
            "Sweep angle is how far the train turns from beginning to end of that curve. It is the amount of direction you spend in one move.",
            "If the layout needs only a correction, keep it modest. If the layout must truly change course, increase it and then check whether the approach and exit still feel intentional.",
        ],
    },
    {
        id: "curve-direction-angle",
        title: "Direction",
        paragraphs: [
            "Turn heading points the curve in the world without changing its size or sweep. Think of it as picking up the same shape and setting it down facing a different compass.",
            "Use this when the curve is right in itself but wrong in where it leads.",
        ],
    },
    {
        id: "fixed-speed-toggle",
        title: "Use Fixed Speed",
        paragraphs: [
            "This switch decides whether speed is allowed to follow the simulation or held to a value you choose. In one mode the train obeys gravity and resistance; in the other it obeys your number.",
            "Lock speed when you are isolating geometry or calibrating force shape. Let it run free again when you want to see how the full system truly behaves.",
        ],
    },
    {
        id: "fixed-speed",
        title: "Target Speed",
        paragraphs: [
            "Target speed is the pace the section will hold when fixed speed is enabled. It is not a small detail, because nearly every force outcome downstream inherits from it.",
            "Set it to something credible for the moment of track you are modeling, then revisit your force peaks after any meaningful change.",
        ],
    },
    {
        id: "dynamic-length",
        title: "Dynamic Length",
        paragraphs: [
            "Auto Length lets the editor determine transition duration for you as other transition values move. It is useful when you are shaping behavior and do not yet care about exact timing.",
            "Turn it off when you need a precise duration and are ready to tune by the clock.",
        ],
    },
    {
        id: "transition-value",
        title: "Value",
        paragraphs: [
            "Force Delta is the amount that transition adds or subtracts over its span. It is the main lever for intensity on the selected channel.",
            "Move it in small steps and watch the graph and peak readouts. Near comfort limits, caution is design.",
        ],
    },
    {
        id: "transition-curve",
        title: "Curve",
        paragraphs: [
            "Curve profile is the shape of change across time, the way the force arrives and departs rather than just where it starts and ends.",
            "Two transitions with the same endpoints can feel entirely different if their profiles differ. Choose smooth shapes for gentler onset and plateau-like shapes when sustained force is deliberate.",
        ],
    },
    {
        id: "transition-center",
        title: "Center",
        paragraphs: [
            "Center bias shifts where the heart of the transition sits in its own time window. Duration remains the same, but the emphasis moves earlier or later.",
            "Move it earlier when you want force to gather quickly, later when you want the build to wait.",
        ],
    },
    {
        id: "transition-tension",
        title: "Tension",
        paragraphs: [
            "Tension controls how taut the transition feels. Higher tension can sharpen ramps; lower tension relaxes them.",
            "Begin moderate and only tighten when the design truly calls for a crisper, more immediate response.",
        ],
    },
    {
        id: "anchor-height",
        title: "Anchor Y",
        paragraphs: [
            "Base height moves the whole track's starting reference up or down. It is the elevation from which the rest of your geometry proceeds.",
            "Raise it for clearance and potential energy, lower it when the design should sit closer to the ground context.",
        ],
    },
    {
        id: "heartline-height",
        title: "Heartline Height",
        paragraphs: [
            "Rider axis height is the vertical offset used to approximate where the rider's body rides relative to the rail centerline.",
            "Because riders feel motion around that axis, this value influences perceived roll and force character. Set it to match your train assumptions, then verify by feel in the view and data.",
        ],
    },
    {
        id: "friction-parameter",
        title: "Friction",
        paragraphs: [
            "This factor governs how quickly speed is surrendered as the train moves, standing in for resistance in the model.",
            "More friction means stronger speed loss and gentler downstream behavior. Less friction preserves speed and can sharpen force outcomes later.",
        ],
    },
    {
        id: "track-model",
        title: "Model",
        paragraphs: [
            "Track style changes the rendered rail and spine geometry so the design can be reviewed in a form closer to the intended system.",
            "It is primarily visual context, but that context matters; after switching, inspect sightlines and clearances again.",
        ],
    },
    {
        id: "target-velocity",
        title: "Velocity",
        paragraphs: [
            "Desired launch speed is the velocity you need at launch exit. It is the destination the launch calculation is trying to reach.",
            "Set it from concept targets, then treat the resulting time and length as minimum practical references.",
        ],
    },
    {
        id: "launch-acceleration",
        title: "Launch Acceleration",
        paragraphs: [
            "Launch acceleration is how quickly the train is asked to gain speed. Higher values shorten the launch zone but raise intensity.",
            "Choose it within comfort and mechanical limits, then read the calculator outputs as a reality check for distance and timing.",
        ],
    },
];

export default function HelpPage() {
    return (
        <main className="min-h-screen bg-neutral-900 text-neutral-100">
            <div className="mx-auto max-w-4xl px-6 py-10">
                <h1 className="text-3xl font-semibold text-neutral-50">Force-Vector Design Help</h1>
                <p className="mt-3 text-neutral-300">
                    This guide explains each editable control used in the editor.
                </p>
                <div className="mt-6 rounded border border-neutral-700 bg-neutral-800 p-4 text-sm text-neutral-300">
                    Tip: links opened from the editor jump directly to a section on this page.
                </div>

                <div className="mt-8 space-y-8">
                    {sections.map((section) => (
                        <section
                            id={section.id}
                            key={section.id}
                            className="scroll-mt-6 rounded border border-neutral-700 bg-neutral-800/60 p-5"
                        >
                            <h2 className="text-xl font-semibold text-neutral-100">{section.title}</h2>
                            <div className="mt-3 space-y-3 text-neutral-200">
                                {section.paragraphs.map((paragraph, idx) => (
                                    <p key={idx}>{paragraph}</p>
                                ))}
                            </div>
                        </section>
                    ))}
                </div>
            </div>
        </main>
    );
}
