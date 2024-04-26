import { error } from "@sveltejs/kit";
import { pages } from "../pages.js";
export async function load({ params }) {
    if (!pages[params.slug]) {
        return error(404, "not found");
    }
    const content = pages[params.slug];

    return {
        content,
    };
}
