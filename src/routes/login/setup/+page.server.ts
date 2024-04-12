import { db } from "$lib/server/db.js";
import { userTable } from "$lib/server/schema.js";
import { redirect } from "@sveltejs/kit";
import { eq } from "drizzle-orm";

const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export async function load(event) {
    const user = event.locals.user;
    if (!user || !uuidRegex.test(user.username)) {
        return redirect(302, "/");
    }
    return {};
}

export const actions = {
    default: async (event) => {
        const data = await event.request.formData();
        const username = data.get("username");

        if (
            await db.query.userTable.findFirst({
                where: eq(userTable.username, username.toString()),
            })
        ) {
            return {
                status: 400,
                body: "Username already taken",
            };
        }

        const user = event.locals.user;
        await db
            .update(userTable)
            .set({ username: username.toString() })
            .where(eq(userTable.id, user.id));

        return redirect(302, "/");
    },
};
