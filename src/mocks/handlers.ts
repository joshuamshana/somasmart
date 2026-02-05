import { http, HttpResponse } from "msw";

export const handlers = [
  http.get("/__health", () => HttpResponse.json({ ok: true }))
];

