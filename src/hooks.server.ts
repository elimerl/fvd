import { lucia } from "$lib/server/auth";
import type { Handle } from "@sveltejs/kit";
import { sequence } from "@sveltejs/kit/hooks";
import { db } from "$lib/server/db";
import { eq } from "drizzle-orm";
import { settingsTable } from "$lib/server/schema";
import { defaultSettings, type AppSettings } from "$lib/settings";

export const handle: Handle = async ({ event, resolve }) => {
    const sessionId = event.cookies.get(lucia.sessionCookieName);
    if (!sessionId) {
        event.locals.user = null;
        event.locals.session = null;
        return resolve(event);
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

    const settings = event.locals.user
        ? (JSON.parse(
              (
                  await db.query.settingsTable.findFirst({
                      where: eq(settingsTable.userId, event.locals.user!.id),
                  })
              ).json
          ) as AppSettings)
        : defaultSettings();

    event.locals.settings = settings;

    return resolve(event);
};
