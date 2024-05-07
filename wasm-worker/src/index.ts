import init, { get_spline } from "@elimerl/fvd-rs";
//@ts-expect-error
import mod from "@elimerl/fvd-rs/fvd_rs_bg.wasm";

await init(mod);

export default {
    async fetch(request: Request): Promise<Response> {
        if (request.method === "POST") {
            const track = await request.text();

            return new Response(get_spline(track));
        }
        return new Response("", {
            status: 400,
            headers: {
                "content-type": "text/plain",
            },
        });
    },
};
