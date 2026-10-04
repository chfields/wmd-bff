---
type: invariant
title: Another user's order is answered as unknown_order 404
description: GET /v1/orders/{id} fetches the order from order-service and returns 404 unknown_order unless its userId is the signed-in user's, so an order's existence never leaks.
tags: [security, orders]
status: stable
generated:
  by: wmd-bff-builder/gpt-5.6-terra
  at: 2026-10-04T15:29:43Z
sources:
  - id: app
    url: https://github.com/chfields/wmd-bff/blob/239d56c1510422908d2b196226d7cc654c6c36a4/src/app.ts#L234-L241
  - id: tests
    url: https://github.com/chfields/wmd-bff/blob/239d56c1510422908d2b196226d7cc654c6c36a4/test/bff.test.ts#L135-L140
wardby:
  schema: 1
  roles: [builder, reviewer]
  affects: [src/app.ts, test/bff.test.ts]
  citations:
    - id: order-ownership
      repo: github:chfields/wmd-bff
      path: src/app.ts
      lines: [234, 241]
      symbol: GET /v1/orders/:id
      sha: 239d56c1510422908d2b196226d7cc654c6c36a4
      spanHash: sha256:ea8e59633a4ea9f8d8ff35a979bd116e22d351a1dd3462996262225334ffc143
    - id: ownership-test
      repo: github:chfields/wmd-bff
      path: test/bff.test.ts
      lines: [135, 140]
      symbol: orders
      sha: 239d56c1510422908d2b196226d7cc654c6c36a4
      spanHash: sha256:ddf2e133674fa7bb1352ed6339982adf12be0e5062dae719db81ab0a81ed5521
  confidence: high
---

order-service does not check ownership when an order is looked up by id, so the BFF must. A mismatch gets the same 404 unknown_order as a missing order, never a 403. Any new route that returns a single resource by id needs the same check.[^order-ownership][^ownership-test]

What to do: compare every returned resource owner's userId with the signed-in user's id before returning it.

[^order-ownership]: Source `order-ownership`.
[^ownership-test]: Source `ownership-test`.
