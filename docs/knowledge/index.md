# Architecture knowledge

## Core

- [The BFF is the only API the app and the outside world reach](bff-only-public-api.md) — wmd-app calls only wmd-bff; services stay internal and trust the user id the BFF passes, never one taken from a request body.
- [Every request carries one x-correlation-id end to end](correlation-id-propagation.md) — Each service accepts x-correlation-id (or makes one), logs it, returns it, and forwards it on every outbound call.
- [Errors are {"error": {"code", "message"}} with stable codes](error-contract.md) — Every API error uses this shape, and codes are stable identifiers clients branch on, so they are never renamed.
- [Only merged main reaches staging](only-merged-code-reaches-staging.md) — deploy.sh builds every service from its origin/main in a clean checkout, so staging never runs unreviewed code.

## This repository

- [Another user's order is answered as unknown_order 404](order-access-hidden-as-not-found.md) — GET /v1/orders/{id} fetches the order from order-service and returns 404 unknown_order unless its userId is the signed-in user's, so an order's existence never leaks.
- [Only a service's 4xx error passes through; everything else becomes 502 upstream_unavailable](upstream-error-mapping.md) — call() passes on a service error only when its status is under 500 and its body has error.code; network failures, 5s timeouts, 5xx responses and malformed error bodies all become 502 upstream_unavailable.
