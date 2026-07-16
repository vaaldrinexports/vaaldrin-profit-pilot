/// <reference path="../node_modules/@tanstack/start-client-core/dist/esm/serverRoute.d.ts" />
import type { FilebaseRouteOptionsInterface } from "@tanstack/router-core";
type X = FilebaseRouteOptionsInterface<any, any, any, any, any, any, any, any, any, any, any, any, any, any, any>;
const t: X = { server: { handlers: { GET: async () => new Response("hi") } } };
export {};
