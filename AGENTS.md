# Working in wmd-bff

TypeScript (Node 24), Fastify. The mobile backend-for-frontend: the only API
wmd-app calls. It signs users in and composes catalog-service, order-service
and notification-service. It has no database.

## Architecture knowledge

See [docs/knowledge/index.md](docs/knowledge/index.md) for architecture knowledge.

## Run the checks

```bash
npm ci
npm run typecheck
npm test
npm run build
```

Tests replace the services with a fake `fetch` (`test/bff.test.ts`); no
network or database is needed.

## Rules

- The app never talks to a service directly, and services never see the
  app's token: the BFF passes the signed-in user's id (`request.user.id`).
  Never trust a user id from the request body.
- Every service call goes through `call()`, which forwards
  `x-correlation-id` and maps service errors to `{"error": {"code", "message"}}`.
  Keep codes stable; the app shows messages by code.
- Every route has a JSON schema for its body or query. Unknown fields are
  refused (400), not dropped.
- A route that changes what the app sees updates `README.md`'s route table
  and comes with a test.
