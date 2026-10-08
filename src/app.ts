/**
 * The mobile BFF: the only backend wmd-app talks to. It signs users in, then
 * composes catalog-service, order-service and notification-service for the
 * app. Every upstream call carries the request's x-correlation-id.
 */
import { randomUUID } from "node:crypto";
import Fastify, { type FastifyInstance, type FastifyReply, type FastifyRequest } from "fastify";
import { sameSecret, signToken, verifyToken, type User } from "./auth.js";

export interface BffConfig {
  catalogUrl: string;
  orderUrl: string;
  notificationUrl: string;
  authSecret: string;
  demoUser: User & { password: string };
  logger?: boolean;
  fetch?: typeof fetch;
}

const CORRELATION_HEADER = "x-correlation-id";
const VALID_CORRELATION = /^[A-Za-z0-9._-]{1,128}$/;

class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

declare module "fastify" {
  interface FastifyRequest {
    user?: User;
  }
}

export function configFromEnv(env: NodeJS.ProcessEnv = process.env): BffConfig {
  const required = (name: string): string => {
    const value = env[name];
    if (!value) throw new Error(`${name} is required`);
    return value;
  };
  return {
    catalogUrl: required("CATALOG_URL"),
    orderUrl: required("ORDER_URL"),
    notificationUrl: required("NOTIFICATION_URL"),
    authSecret: required("AUTH_SECRET"),
    demoUser: {
      id: "user-demo",
      email: env.DEMO_USER_EMAIL ?? "demo@wmd.shop",
      name: env.DEMO_USER_NAME ?? "Demo Customer",
      password: required("DEMO_USER_PASSWORD"),
    },
    logger: true,
  };
}

export function buildApp(config: BffConfig): FastifyInstance {
  const doFetch = config.fetch ?? fetch;
  const requests = new Map<string, number>();
  const app = Fastify({
    logger: config.logger ? { level: "info", base: { service: "bff" } } : false,
    requestIdHeader: false,
    // Refuse unknown fields (such as a userId in an order) instead of silently dropping them.
    ajv: { customOptions: { removeAdditional: false } },
    requestIdLogLabel: "correlationId",
    genReqId: (request) => {
      const incoming = request.headers[CORRELATION_HEADER];
      return typeof incoming === "string" && VALID_CORRELATION.test(incoming) ? incoming : randomUUID();
    },
  });

  // CORS: the Expo web build calls from another origin. Tokens travel in a header, never cookies.
  app.addHook("onRequest", async (request, reply) => {
    reply.header(CORRELATION_HEADER, request.id);
    reply.header("access-control-allow-origin", "*");
    reply.header("access-control-allow-headers", "authorization, content-type, x-correlation-id");
    reply.header("access-control-allow-methods", "GET, POST, OPTIONS");
    reply.header("access-control-expose-headers", CORRELATION_HEADER);
    if (request.method === "OPTIONS") return reply.code(204).send();
  });

  app.addHook("onResponse", async (request, reply) => {
    const key = `${request.method} ${request.routeOptions.url ?? "unmatched"} ${reply.statusCode}`;
    requests.set(key, (requests.get(key) ?? 0) + 1);
  });

  app.setErrorHandler((error: Error & { statusCode?: number; validation?: unknown }, request, reply) => {
    if (error instanceof ApiError) {
      return reply.code(error.status).send({ error: { code: error.code, message: error.message } });
    }
    if (error.validation) {
      return reply.code(400).send({ error: { code: "invalid_request", message: error.message } });
    }
    request.log.error({ err: error }, "unhandled error");
    return reply.code(500).send({ error: { code: "internal", message: "Something went wrong." } });
  });

  async function authenticate(request: FastifyRequest): Promise<void> {
    const header = request.headers.authorization ?? "";
    const user = header.startsWith("Bearer ") ? verifyToken(config.authSecret, header.slice(7)) : null;
    if (!user) throw new ApiError(401, "unauthenticated", "Sign in again.");
    request.user = user;
  }

  /** Calls a service, passing its error through when it sent one in our shape. */
  async function call(request: FastifyRequest, base: string, path: string, init: RequestInit = {}) {
    let response: Response;
    try {
      response = await doFetch(new URL(path, base), {
        ...init,
        headers: { "content-type": "application/json", [CORRELATION_HEADER]: request.id, ...init.headers },
        signal: AbortSignal.timeout(5000),
      });
    } catch (err) {
      request.log.warn({ err, base, path }, "upstream unreachable");
      throw new ApiError(502, "upstream_unavailable", "A service is unavailable. Try again.");
    }
    const body = (await response.json().catch(() => null)) as
      | { error?: { code?: string; message?: string } }
      | null;
    if (!response.ok) {
      if (response.status < 500 && body?.error?.code) {
        throw new ApiError(response.status, body.error.code, body.error.message ?? "Request failed.");
      }
      throw new ApiError(502, "upstream_unavailable", "A service is unavailable. Try again.");
    }
    return body as unknown;
  }

  const userOf = (request: FastifyRequest): User => request.user as User;

  app.get("/", async () => ({
    service: "wmd-bff",
    description: "WMD Shop mobile API. The app talks only to this service.",
    routes: [
      "POST /v1/session",
      "GET /v1/catalog/products?q=&sort=",
      "POST /v1/orders",
      "GET /v1/orders",
      "GET /v1/orders/{id}",
      "GET /v1/notifications",
      "GET /healthz",
      "GET /readyz",
      "GET /metrics",
    ],
  }));
  app.get("/healthz", async () => ({ status: "ok" }));
  app.get("/readyz", async () => ({ status: "ready" }));
  app.get("/metrics", async (_request, reply) => {
    const lines = ["# TYPE http_requests_total counter"];
    for (const [key, count] of [...requests.entries()].sort()) {
      const [method, path, status] = key.split(" ");
      lines.push(`http_requests_total{method="${method}",path="${path}",status="${status}"} ${count}`);
    }
    return reply.type("text/plain").send(`${lines.join("\n")}\n`);
  });

  app.post(
    "/v1/session",
    {
      schema: {
        body: {
          type: "object",
          required: ["email", "password"],
          additionalProperties: false,
          properties: { email: { type: "string", maxLength: 254 }, password: { type: "string", maxLength: 256 } },
        },
      },
    },
    async (request) => {
      const { email, password } = request.body as { email: string; password: string };
      const { password: expected, ...user } = config.demoUser;
      if (email.trim().toLowerCase() !== user.email.toLowerCase() || !sameSecret(password, expected)) {
        throw new ApiError(401, "invalid_credentials", "That email and password don't match.");
      }
      return { token: signToken(config.authSecret, user), user };
    },
  );

  app.get(
    "/v1/catalog/products",
    {
      schema: {
        querystring: {
          type: "object",
          additionalProperties: false,
          properties: {
            q: { type: "string", maxLength: 100 },
            sort: { type: "string", enum: ["featured", "price_asc", "price_desc", "name_asc"] },
          },
        },
      },
    },
    async (request) => {
      const { q, sort } = request.query as { q?: string; sort?: string };
      const query = [q ? `q=${encodeURIComponent(q)}` : "", sort ? `sort=${encodeURIComponent(sort)}` : ""]
        .filter(Boolean)
        .join("&");
      return call(request, config.catalogUrl, query ? `/v1/products?${query}` : "/v1/products");
    },
  );

  app.post(
    "/v1/orders",
    {
      preHandler: authenticate,
      preValidation: async (request) => {
        const body = request.body as { giftMessage?: unknown } | null;
        if (body && typeof body === "object" && "giftMessage" in body && typeof body.giftMessage !== "string") {
          throw new ApiError(400, "invalid_request", "giftMessage must be a string.");
        }
      },
      schema: {
        body: {
          type: "object",
          required: ["items"],
          additionalProperties: false,
          properties: {
            items: {
              type: "array",
              minItems: 1,
              maxItems: 50,
              items: {
                type: "object",
                required: ["productId", "quantity"],
                additionalProperties: false,
                properties: {
                  productId: { type: "string", minLength: 1, maxLength: 64 },
                  quantity: { type: "integer", minimum: 1, maximum: 100 },
                },
              },
            },
            giftMessage: { type: "string", maxLength: 200 },
            deliveryWindow: { type: "string", enum: ["morning", "afternoon", "evening"] },
          },
        },
      },
    },
    async (request, reply: FastifyReply) => {
      const { items, giftMessage, deliveryWindow } = request.body as {
        items: unknown[];
        giftMessage?: string;
        deliveryWindow?: "morning" | "afternoon" | "evening";
      };
      const order = await call(request, config.orderUrl, "/v1/orders", {
        method: "POST",
        body: JSON.stringify({
          userId: userOf(request).id,
          items,
          ...(giftMessage === undefined ? {} : { giftMessage }),
          ...(deliveryWindow === undefined ? {} : { deliveryWindow }),
        }),
      });
      return reply.code(201).send(order);
    },
  );

  app.get("/v1/orders", { preHandler: authenticate }, async (request) =>
    call(request, config.orderUrl, `/v1/orders?userId=${encodeURIComponent(userOf(request).id)}`),
  );

  app.get("/v1/orders/:id", { preHandler: authenticate }, async (request) => {
    const { id } = request.params as { id: string };
    const order = (await call(request, config.orderUrl, `/v1/orders/${encodeURIComponent(id)}`)) as {
      userId?: string;
    };
    // Someone else's order looks exactly like one that doesn't exist.
    if (order.userId !== userOf(request).id) throw new ApiError(404, "unknown_order", `No order ${id}.`);
    return order;
  });

  app.get("/v1/notifications", { preHandler: authenticate }, async (request) =>
    call(request, config.notificationUrl, `/v1/notifications?userId=${encodeURIComponent(userOf(request).id)}`),
  );

  return app;
}
