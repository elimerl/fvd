const markdown = import.meta.glob("./*.md", { eager: true, query: "?raw" });

export const pages = Object.fromEntries(
    Object.entries(markdown).map(([path, exports]) => {
        const slug = path.slice(2, -3);
        const content = (exports as any).default as string;
        return [slug, content];
    })
);
