import { OAuth2RequestError } from "arctic";
import { generateId } from "lucia";
import { parseJWT } from "oslo/jwt";

import type { RequestEvent } from "@sveltejs/kit";

import { googleOauth, lucia } from "$lib/server/auth";
import { settingsTable, userTable } from "$lib/server/schema";
import { eq } from "drizzle-orm";
import { db } from "$lib/server/db";
import { defaultSettings } from "$lib/settings";

export async function GET(event: RequestEvent): Promise<Response> {
    const code = event.url.searchParams.get("code");
    const state = event.url.searchParams.get("state");

    const storedState = event.cookies.get("google_oauth_state") ?? null;
    const storedCodeVerifier =
        event.cookies.get("google_oauth_code_verifier") ?? null;

    if (
        !code ||
        !state ||
        !storedState ||
        !storedCodeVerifier ||
        state !== storedState
    ) {
        return new Response("Invalid request", {
            status: 400,
        });
    }

    try {
        const tokens = await googleOauth.validateAuthorizationCode(
            code,
            storedCodeVerifier
        );

        const googleUser = (await fetch(
            "https://www.googleapis.com/oauth2/v3/userinfo",
            {
                headers: {
                    Authorization: `Bearer ${tokens.accessToken}`,
                },
            }
        ).then((res) => res.json())) as GoogleUser;

        const existingUser = await db.query.userTable.findFirst({
            where: eq(userTable.google_id, googleUser.sub),
        });

        if (existingUser) {
            const session = await lucia.createSession(existingUser.id, {});
            const sessionCookie = lucia.createSessionCookie(session.id);
            event.cookies.set(sessionCookie.name, sessionCookie.value, {
                path: ".",
                ...sessionCookie.attributes,
            });
        } else {
            const user = await db
                .insert(userTable)
                .values({
                    google_id: googleUser.sub,
                    username: crypto.randomUUID(),
                })
                .returning()
                .get();

            const session = await lucia.createSession(user.id, {});
            const sessionCookie = lucia.createSessionCookie(session.id);
            event.cookies.set(sessionCookie.name, sessionCookie.value, {
                path: ".",
                ...sessionCookie.attributes,
            });

            await db.insert(settingsTable).values({
                userId: user.id,
                json: JSON.stringify(defaultSettings()),
            });

            return new Response(null, {
                status: 302,
                headers: {
                    Location: "/login/setup",
                },
            });
        }

        return new Response(null, {
            status: 302,
            headers: {
                Location: "/",
            },
        });
    } catch (e) {
        // the specific error message depends on the provider
        if (e instanceof OAuth2RequestError) {
            console.error(e);
            // invalid code
            return new Response(e.stack ?? e.message, {
                status: 400,
            });
        }
        return new Response(e.stack ?? e.message, {
            status: 500,
        });
    }
}

interface GoogleUser {
    sub: string;
}
