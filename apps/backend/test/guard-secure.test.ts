import { afterEach, describe, expect, it } from "vitest";
import { secure } from "../functions/guard.secure.mjs";

function createResCollector() {
  const headers: Record<string, string> = {};
  let statusCode = 200;
  let jsonBody: unknown;
  let ended = false;

  return {
    headers,
    get statusCode() {
      return statusCode;
    },
    get jsonBody() {
      return jsonBody;
    },
    get ended() {
      return ended;
    },
    setHeader(name: string, value: string) {
      headers[name] = value;
    },
    status(code: number) {
      statusCode = code;
      return this;
    },
    json(payload: unknown) {
      jsonBody = payload;
      return this;
    },
    end() {
      ended = true;
      return this;
    }
  };
}

describe("secure guard", () => {
  const envSnapshot = { ...process.env };

  afterEach(() => {
    process.env = { ...envSnapshot };
  });

  it("sets security headers and handles preflight", () => {
    process.env.NODE_ENV = "development";
    process.env.REQUIRE_HTTPS = "false";
    const res = createResCollector();
    let calledNext = false;

    const req = {
      method: "OPTIONS",
      headers: {
        origin: "http://localhost:3000",
        "x-forwarded-proto": "http"
      }
    };

    secure.onGuard(req as never, res as never, () => {
      calledNext = true;
    });

    expect(calledNext).toBe(false);
    expect(res.statusCode).toBe(204);
    expect(res.ended).toBe(true);
    expect(res.headers["X-Content-Type-Options"]).toBe("nosniff");
    expect(res.headers["X-Frame-Options"]).toBe("DENY");
    expect(res.headers["x-trace-id"]).toBeTruthy();
  });

  it("blocks non-https traffic in production when requireHttps is true", () => {
    process.env.NODE_ENV = "production";
    process.env.REQUIRE_HTTPS = "true";
    process.env.JWT_SECRET = "a".repeat(40);
    const res = createResCollector();

    secure.onGuard(
      { method: "GET", headers: { origin: "https://example.com", "x-forwarded-proto": "http" } } as never,
      res as never,
      () => {
        throw new Error("should not call next");
      }
    );

    expect(res.statusCode).toBe(403);
    expect(res.jsonBody).toEqual({ code: "HTTPS_REQUIRED" });
  });
});
