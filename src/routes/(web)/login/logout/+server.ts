import { redirect } from "@sveltejs/kit";
import { generateCodeVerifier, generateState } from "arctic";
import { lucia } from "$lib/server/auth";

import type { RequestEvent } from "@sveltejs/kit";

export async function POST(event: RequestEvent): Promise<Response> {
    if (event.locals.session) {
        await lucia.invalidateSession(event.locals.session.id);
        event.cookies.delete(lucia.sessionCookieName, { path: "/" });
    }
    return redirect(302, "/");
}
