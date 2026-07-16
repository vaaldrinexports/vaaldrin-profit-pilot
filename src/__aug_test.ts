import "@tanstack/react-start";
import { createFileRoute } from "@tanstack/react-router";
import type { FilebaseRouteOptionsInterface } from "@tanstack/router-core";
type X = FilebaseRouteOptionsInterface<any, any, any, any, any, any, any, any, any, any, any, any, any, any, any>;
const t: X = { server: { handlers: { GET: async () => new Response("hi") } } };
