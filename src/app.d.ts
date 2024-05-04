declare namespace App {
    interface Locals {
        user: import("lucia").User | null;
        session: import("lucia").Session | null;
        settings: import("$lib/settings").AppSettings;
    }
    interface Error {
        message: string;
        stack: string;
    }
}
