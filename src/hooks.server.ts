import { lucia } from "$lib/server/auth";
import { redirect, type Handle } from "@sveltejs/kit";
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

    const settingsJson = user
        ? (
              await db.query.settingsTable.findFirst({
                  where: eq(settingsTable.userId, event.locals.user!.id),
              })
          ).json
        : "{}";
    // use default settings if not in original
    settings = {
        ...defaultSettings(),
        ...(JSON.parse(settingsJson) as AppSettings),
    };

    // update settings if changed
    if (event.locals.settings && settingsJson !== JSON.stringify(settings)) {
        await db
            .update(settingsTable)
            .set({
                json: JSON.stringify(settings),
            })
            .where(eq(settingsTable.userId, event.locals.user!.id))
            .execute();
    }

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

export async function handleError({ error, event, status, message }) {
    return {
        message: "Internal Error",
        stack: (error as any).stack ?? "",
    };
}
