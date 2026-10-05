import { describe, expect, it } from "vitest";
import { buildApp, type BffConfig } from "../src/app.js";
import { signToken } from "../src/auth.js";

interface Call {
  url: string;
  method: string;
  body: unknown;
  correlationId: string | null;
}

/** Fake services: route "<METHOD> <origin><path>" to a [status, body] answer. */
function fakeServices(routes: Record<string, [number, unknown] | Error>) {
  const calls: Call[] = [];
  const fakeFetch = (async (input: URL | RequestInfo, init?: RequestInit) => {
    const url = String(input);
    const method = init?.method ?? "GET";
    const headers = new Headers(init?.headers);
    calls.push({
      url,
      method,
      body: init?.body ? JSON.parse(String(init.body)) : undefined,
      correlationId: headers.get("x-correlation-id"),
    });
    const answer = routes[`${method} ${url}`];
    if (!answer) return new Response(JSON.stringify({ error: { code: "not_found", message: url } }), { status: 404 });
    if (answer instanceof Error) throw answer;
    return new Response(JSON.stringify(answer[1]), { status: answer[0] });
  }) as typeof fetch;
  return { fakeFetch, calls };
}

const SECRET = "test-secret";
const DEMO = { id: "user-demo", email: "demo@wmd.shop", name: "Demo Customer" };

function app(routes: Record<string, [number, unknown] | Error> = {}) {
  const services = fakeServices(routes);
  const config: BffConfig = {
    catalogUrl: "http://catalog",
    orderUrl: "http://orders",
    notificationUrl: "http://notifications",
    authSecret: SECRET,
    demoUser: { ...DEMO, password: "letmein" },
    fetch: services.fakeFetch,
  };
  return { app: buildApp(config), calls: services.calls };
}

const auth = { authorization: `Bearer ${signToken(SECRET, DEMO)}` };
const ORDER = { id: "o-1", userId: "user-demo", status: "confirmed", totalCents: 899, lines: [], giftMessage: null };

describe("session", () => {
  it("signs the demo user in, case-insensitively by email", async () => {
    const { app: bff } = app();
    const response = await bff.inject({
      method: "POST",
      url: "/v1/session",
      payload: { email: "Demo@WMD.shop ", password: "letmein" },
    });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({ user: DEMO, token: expect.any(String) });
  });

  it("refuses a wrong password with a stable code", async () => {
    const { app: bff } = app();
    const response = await bff.inject({
      method: "POST",
      url: "/v1/session",
      payload: { email: "demo@wmd.shop", password: "nope" },
    });
    expect(response.statusCode).toBe(401);
    expect(response.json().error.code).toBe("invalid_credentials");
  });

  it("requires a valid token for orders and notifications", async () => {
    const { app: bff, calls } = app();
    for (const url of ["/v1/orders", "/v1/notifications"]) {
      const response = await bff.inject({ method: "GET", url, headers: { authorization: "Bearer forged.token.x" } });
      expect(response.statusCode).toBe(401);
      expect(response.json().error.code).toBe("unauthenticated");
    }
    expect(calls).toEqual([]);
  });
});

describe("catalog", () => {
  it("lists products without signing in, passing the filter on", async () => {
    const { app: bff, calls } = app({ "GET http://catalog/v1/products?q=cold%20brew": [200, [{ id: "sku-coffee" }]] });
    const response = await bff.inject({ method: "GET", url: "/v1/catalog/products?q=cold%20brew" });
    expect(response.json()).toEqual([{ id: "sku-coffee" }]);
    expect(calls).toHaveLength(1);
  });
});

describe("orders", () => {
  it("places an order for the signed-in user, never one the app names", async () => {
    const { app: bff, calls } = app({ "POST http://orders/v1/orders": [201, ORDER] });
    const response = await bff.inject({
      method: "POST",
      url: "/v1/orders",
      headers: auth,
      payload: { items: [{ productId: "sku-coffee", quantity: 1 }] },
    });
    expect(response.statusCode).toBe(201);
    expect(response.json()).toEqual(ORDER);
    expect(calls[0]?.body).toEqual({ userId: "user-demo", items: [{ productId: "sku-coffee", quantity: 1 }] });
  });

  it("forwards an optional gift message with the signed-in user's id", async () => {
    const order = { ...ORDER, giftMessage: "Happy birthday!" };
    const { app: bff, calls } = app({ "POST http://orders/v1/orders": [201, order] });
    const response = await bff.inject({
      method: "POST",
      url: "/v1/orders",
      headers: auth,
      payload: { items: [{ productId: "sku-coffee", quantity: 1 }], giftMessage: "Happy birthday!" },
    });
    expect(response.statusCode).toBe(201);
    expect(response.json()).toEqual(order);
    expect(calls[0]?.body).toEqual({
      userId: "user-demo",
      items: [{ productId: "sku-coffee", quantity: 1 }],
      giftMessage: "Happy birthday!",
    });
  });

  it.each([
    ["a message longer than 200 characters", "x".repeat(201)],
    ["a non-string message", 123],
  ])("refuses %s", async (_description, giftMessage) => {
    const { app: bff, calls } = app();
    const response = await bff.inject({
      method: "POST",
      url: "/v1/orders",
      headers: auth,
      payload: { items: [{ productId: "sku-coffee", quantity: 1 }], giftMessage },
    });
    expect(response.statusCode).toBe(400);
    expect(response.json().error.code).toBe("invalid_request");
    expect(calls).toEqual([]);
  });

  it("refuses a userId in the body", async () => {
    const { app: bff, calls } = app();
    const response = await bff.inject({
      method: "POST",
      url: "/v1/orders",
      headers: auth,
      payload: { userId: "someone-else", items: [{ productId: "sku-coffee", quantity: 1 }] },
    });
    expect(response.statusCode).toBe(400);
    expect(calls).toEqual([]);
  });

  it("passes on a service's own error, such as out of stock", async () => {
    const { app: bff } = app({
      "POST http://orders/v1/orders": [409, { error: { code: "unavailable", message: "Not enough sku-eggs in stock." } }],
    });
    const response = await bff.inject({
      method: "POST",
      url: "/v1/orders",
      headers: auth,
      payload: { items: [{ productId: "sku-eggs", quantity: 1 }] },
    });
    expect(response.statusCode).toBe(409);
    expect(response.json()).toEqual({ error: { code: "unavailable", message: "Not enough sku-eggs in stock." } });
  });

  it("passes on invalid_gift_message from order-service", async () => {
    const { app: bff } = app({
      "POST http://orders/v1/orders": [
        422,
        { error: { code: "invalid_gift_message", message: "Gift messages can be at most 200 characters." } },
      ],
    });
    const response = await bff.inject({
      method: "POST",
      url: "/v1/orders",
      headers: auth,
      payload: { items: [{ productId: "sku-coffee", quantity: 1 }], giftMessage: "Happy birthday!" },
    });
    expect(response.statusCode).toBe(422);
    expect(response.json()).toEqual({
      error: { code: "invalid_gift_message", message: "Gift messages can be at most 200 characters." },
    });
  });

  it("passes giftMessage through when retrieving an order", async () => {
    const order = { ...ORDER, giftMessage: "Happy birthday!" };
    const { app: bff } = app({ "GET http://orders/v1/orders/o-1": [200, order] });
    const response = await bff.inject({ method: "GET", url: "/v1/orders/o-1", headers: auth });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual(order);
  });

  it("hides another user's order behind a 404", async () => {
    const { app: bff } = app({ "GET http://orders/v1/orders/o-2": [200, { ...ORDER, id: "o-2", userId: "user-other" }] });
    const response = await bff.inject({ method: "GET", url: "/v1/orders/o-2", headers: auth });
    expect(response.statusCode).toBe(404);
    expect(response.json().error.code).toBe("unknown_order");
  });

  it("reports an unreachable service as 502", async () => {
    const { app: bff } = app({ "GET http://orders/v1/orders?userId=user-demo": new TypeError("fetch failed") });
    const response = await bff.inject({ method: "GET", url: "/v1/orders", headers: auth });
    expect(response.statusCode).toBe(502);
    expect(response.json().error.code).toBe("upstream_unavailable");
  });
});

describe("notifications", () => {
  it("lists the signed-in user's notifications", async () => {
    const { app: bff, calls } = app({
      "GET http://notifications/v1/notifications?userId=user-demo": [200, [{ id: "n-1" }]],
    });
    const response = await bff.inject({ method: "GET", url: "/v1/notifications", headers: auth });
    expect(response.json()).toEqual([{ id: "n-1" }]);
    expect(calls[0]?.url).toBe("http://notifications/v1/notifications?userId=user-demo");
  });
});

describe("platform", () => {
  it("forwards the caller's correlation id to services and echoes it", async () => {
    const { app: bff, calls } = app({ "GET http://catalog/v1/products": [200, []] });
    const response = await bff.inject({
      method: "GET",
      url: "/v1/catalog/products",
      headers: { "x-correlation-id": "journey-7" },
    });
    expect(response.headers["x-correlation-id"]).toBe("journey-7");
    expect(calls[0]?.correlationId).toBe("journey-7");
  });

  it("answers CORS preflight for the web app", async () => {
    const { app: bff } = app();
    const response = await bff.inject({ method: "OPTIONS", url: "/v1/orders" });
    expect(response.statusCode).toBe(204);
    expect(response.headers["access-control-allow-origin"]).toBe("*");
    expect(response.headers["access-control-allow-headers"]).toContain("authorization");
  });

  it("describes itself at the root instead of a bare 404", async () => {
    const { app: bff } = app();
    const response = await bff.inject({ method: "GET", url: "/" });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({ service: "wmd-bff", routes: expect.arrayContaining(["POST /v1/session"]) });
  });

  it("serves health and request metrics", async () => {
    const { app: bff } = app({ "GET http://catalog/v1/products": [200, []] });
    expect((await bff.inject({ method: "GET", url: "/healthz" })).json()).toEqual({ status: "ok" });
    await bff.inject({ method: "GET", url: "/v1/catalog/products" });
    const metrics = (await bff.inject({ method: "GET", url: "/metrics" })).body;
    expect(metrics).toContain('http_requests_total{method="GET",path="/v1/catalog/products",status="200"} 1');
  });
});
