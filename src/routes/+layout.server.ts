export async function load(event) {
    return { settings: event.locals.settings, user: event.locals.user };
}
