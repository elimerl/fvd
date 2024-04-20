import { lucia } from "$lib/server/auth";
import type { Handle } from "@sveltejs/kit";
import { sequence } from "@sveltejs/kit/hooks";
import { db } from "$lib/server/db";
import { eq } from "drizzle-orm";
import { settingsTable } from "$lib/server/schema";
import { defaultSettings, type AppSettings } from "$lib/settings";

export const handle: Handle = async ({ event, resolve }) => {
    let settings: AppSettings;
    const sessionId = event.cookies.get(lucia.sessionCookieName);
    if (!sessionId) {
        settings = defaultSettings();
        event.locals.user = null;
        event.locals.session = null;
        event.locals.settings = settings;
        return resolve(event, {
            transformPageChunk({ html }) {
                return html.replace(
                    "%app.themeclass%",
                    settings.darkMode
                        ? "dark bg-background text-foreground"
                        : ""
                );
            },
        });
    }

    const { session, user } = await lucia.validateSession(sessionId);
    if (session && session.fresh) {
        const sessionCookie = lucia.createSessionCookie(session.id);
        event.cookies.set(sessionCookie.name, sessionCookie.value, {
            path: ".",
            ...sessionCookie.attributes,
        });
    }
    if (!session) {
        const sessionCookie = lucia.createBlankSessionCookie();
        event.cookies.set(sessionCookie.name, sessionCookie.value, {
            path: ".",
            ...sessionCookie.attributes,
        });
    }
    event.locals.user = user;
    event.locals.session = session;

    settings = JSON.parse(
        (
            await db.query.settingsTable.findFirst({
                where: eq(settingsTable.userId, event.locals.user!.id),
            })
        ).json
    ) as AppSettings;

    event.locals.settings = settings;

    return resolve(event, {
        transformPageChunk({ html }) {
            return html.replace(
                "%app.themeclass%",
                settings.darkMode ? "dark bg-background text-foreground" : ""
            );
        },
    });
};
