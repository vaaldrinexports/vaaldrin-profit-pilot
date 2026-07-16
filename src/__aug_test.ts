import "@tanstack/start-client-core/dist/esm/serverRoute.js";
import type { FilebaseRouteOptionsInterface } from "@tanstack/router-core";
type X = FilebaseRouteOptionsInterface<any, any, any, any, any, any, any, any, any, any, any, any, any, any, any>;
const t: X = { server: { handlers: { GET: async () => new Response("hi") } } };
export {};
