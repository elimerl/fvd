import type { HelpTopicId } from "./lib/help";

type HelpSection = {
    id: HelpTopicId;
    title: string;
    paragraphs: string[];
};

const sections: HelpSection[] = [];

export default function HelpPage() {
    return (
        <main className="min-h-screen bg-neutral-900 text-neutral-100">
            <div className="mx-auto max-w-4xl px-6 py-10">
                <h1 className="text-3xl font-semibold text-neutral-50">
                    Force-Vector Design Help
                </h1>
                <p className="mt-3 text-neutral-300">
                    This guide explains each editable control used in the
                    editor.
                </p>
                <div className="mt-6 rounded border border-neutral-700 bg-neutral-800 p-4 text-sm text-neutral-300">
                    Tip: links opened from the editor jump directly to a section
                    on this page.
                </div>

                <div className="mt-8 space-y-8">
                    {sections.map((section) => (
                        <section
                            id={section.id}
                            key={section.id}
                            className="scroll-mt-6 rounded border border-neutral-700 bg-neutral-800/60 p-5"
                        >
                            <h2 className="text-xl font-semibold text-neutral-100">
                                {section.title}
                            </h2>
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
