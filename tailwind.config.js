/** @type {import('tailwindcss').Config} */
export default {
    content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
    theme: {
        extend: {
            fontFamily: {
                sans: "Overpass Variable, sans-serif",
                mono: "Overpass Mono Variable, monospace",
            },
        },
    },
    plugins: [],
};
