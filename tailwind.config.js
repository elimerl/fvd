/** @type {import('tailwindcss').Config} */
export default {
    content: ["./src/app.html", "./src/**/*.{js,ts,svelte}"],
    theme: {
        extend: {
            fontFamily: {
                sans: "Overpass Variable, sans-serif",
                mono: "Overpass Mono Variable, monospace",
            },
        },
    },
    darkMode: "selector",
    plugins: [require("@tailwindcss/typography")],
};
