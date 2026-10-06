# wmd-bff

The mobile API for WMD Shop, part of the Wardby mobile demo. The app talks
only to this service.

| Route | Auth | Purpose |
|---|---|---|
| `POST /v1/session` | — | Sign in; returns `{ token, user }` |
| `GET /v1/catalog/products?q=` | — | Products from catalog-service, including catalog-provided `lowStock` and `restockDate` |
| `POST /v1/orders` | Bearer | Place an order for the signed-in user, optionally with a gift message and delivery window (`morning`, `afternoon`, or `evening`) |
| `GET /v1/orders` | Bearer | The user's orders |
| `GET /v1/orders/{id}` | Bearer | One of the user's orders |
| `GET /v1/notifications` | Bearer | The user's notifications |
| `GET /` | — | What this service is and its routes |
| `GET /healthz`, `/readyz`, `/metrics` | — | Health, readiness, metrics |

Configuration: `CATALOG_URL`, `ORDER_URL`, `NOTIFICATION_URL`, `AUTH_SECRET`,
`DEMO_USER_PASSWORD` (required); `DEMO_USER_EMAIL` (default `demo@wmd.shop`),
`DEMO_USER_NAME`, `PORT` (default 8080).
