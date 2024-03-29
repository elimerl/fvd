/** @type {import('tailwindcss').Config} */
export default {
    content: ["./src/app.html", "./src/**/*.{js,ts,svelte}"],
    theme: {
        extend: {
            fontFamily: {
                sans: "Overpass Variable, sans-serif",
                mono: "Overpass Mono Variable, monospace",
            },
            colors: {
                border: {
                    DEFAULT: "hsl(var(--border-card))",
                    input: "hsl(var(--border-input))",
                    "input-hover": "hsl(var(--border-input-hover))",
                },
                background: {
                    DEFAULT: "hsl(var(--background) / <alpha-value>)",
                    alt: "hsl(var(--background-alt) / <alpha-value>)",
                },
                foreground: {
                    DEFAULT: "hsl(var(--foreground) / <alpha-value>)",
                    alt: "hsl(var(--foreground-alt) / <alpha-value>)",
                },
                muted: {
                    DEFAULT: "hsl(var(--muted) / <alpha-value>)",
                    foreground: "hsl(var(--muted-foreground))",
                },
                dark: {
                    DEFAULT: "hsl(var(--dark) / <alpha-value>)",
                    4: "hsl(var(--dark-04))",
                    10: "hsl(var(--dark-10))",
                    40: "hsl(var(--dark-40))",
                },
                accent: {
                    DEFAULT: "hsl(var(--accent) / <alpha-value>)",
                    foreground: "hsl(var(--accent-foreground) / <alpha-value>)",
                },
                destructive: {
                    DEFAULT: "hsl(var(--destructive) / <alpha-value>)",
                },
                contrast: {
                    DEFAULT: "hsl(var(--contrast) / <alpha-value>)",
                },
            },
        },
    },
    darkMode: "selector",
    plugins: [require("@tailwindcss/typography")],
};
