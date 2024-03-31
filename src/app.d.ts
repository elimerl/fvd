declare namespace App {
    interface Platform {
        env: {
            DATABASE: D1Database;
        };
    }
    interface Locals {
        user: import("lucia").User | null;
        session: import("lucia").Session | null;
    }
}
