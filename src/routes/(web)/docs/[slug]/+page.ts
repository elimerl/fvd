const mdFiles = import.meta.glob("$lib/docs/*.md", {
    import: "default",
    query: "?raw",
    eager: true,
});

const docs = {};
for (const [path, raw] of Object.entries(mdFiles)) {
    const split = path.split("/");
    const slug = split[split.length - 1].replace(".md", "");
    docs[slug] = raw as string;
}

export const load = async (req) => {
    return {
        content: req.params.slug in docs ? docs[req.params.slug] : null,
    };
};
