import type { UnitSystem } from "$lib/core/units.js";
import { db } from "$lib/server/db.js";
import { settingsTable } from "$lib/server/schema.js";
import type { AppSettings } from "$lib/settings.js";
import { redirect } from "@sveltejs/kit";
import { eq } from "drizzle-orm";

export async function load(event) {
    if (!event.locals.user) {
        return redirect(302, "/login");
    }
    const query = new URLSearchParams(event.url.search);

    return {
        user: event.locals.user,
        settings: event.locals.settings,
        redirectUrl: query.get("redirect") || "/",
    };
}

export const actions = {
    default: async ({ request, locals }) => {
        const data = await request.formData();
        const settings: AppSettings = {
            unitSystem: data.get("unitSystem") as UnitSystem,
            darkMode: data.get("darkMode") === "true",
            fov: parseInt(data.get("fov") as string),
        };

        await db
            .update(settingsTable)
            .set({ json: JSON.stringify(settings) })
            .where(eq(settingsTable.userId, locals.user.id));

        return redirect(302, (data.get("redirect") as string) || "/");
    },
};
