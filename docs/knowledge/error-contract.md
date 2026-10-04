---
type: convention
title: 'Errors are {"error": {"code", "message"}} with stable codes'
description: Every API error uses this shape, and codes are stable identifiers clients branch on, so they are never renamed.
tags: [core, api, errors]
status: stable
generated:
  by: wmd-bff-builder/gpt-5.6-terra
  at: 2026-10-04T15:29:43Z
sources:
  - id: app
    url: https://github.com/chfields/wmd-bff/blob/239d56c1510422908d2b196226d7cc654c6c36a4/src/app.ts#L90-L241
  - id: tests
    url: https://github.com/chfields/wmd-bff/blob/239d56c1510422908d2b196226d7cc654c6c36a4/test/bff.test.ts#L64-L133
  - id: canonical
    url: https://github.com/chfields/wmd-deploy/blob/main/docs/knowledge/core/error-contract.md
wardby:
  schema: 1
  roles: [builder, reviewer, planner]
  affects: [src/app.ts, test/bff.test.ts]
  citations:
    - id: error-handler
      repo: github:chfields/wmd-bff
      path: src/app.ts
      lines: [90, 106]
      symbol: setErrorHandler
      sha: 239d56c1510422908d2b196226d7cc654c6c36a4
      spanHash: sha256:d4e9f717c6c55ff6549ed319ffe6f0ba62e8711541a7a243f59ef59a9f096766
    - id: session-error
      repo: github:chfields/wmd-bff
      path: src/app.ts
      lines: [161, 180]
      symbol: POST /v1/session
      sha: 239d56c1510422908d2b196226d7cc654c6c36a4
      spanHash: sha256:f90c668736974fbdf75e344d3bdd8b990f7987ea73355b30771055bc45220401
    - id: service-errors
      repo: github:chfields/wmd-bff
      path: src/app.ts
      lines: [108, 130]
      symbol: call
      sha: 239d56c1510422908d2b196226d7cc654c6c36a4
      spanHash: sha256:2f5125615249f889bcc2893973bb9e13498c366c5de0cddf88b33998b6a53df4
    - id: order-access
      repo: github:chfields/wmd-bff
      path: src/app.ts
      lines: [234, 241]
      symbol: GET /v1/orders/:id
      sha: 239d56c1510422908d2b196226d7cc654c6c36a4
      spanHash: sha256:ea8e59633a4ea9f8d8ff35a979bd116e22d351a1dd3462996262225334ffc143
    - id: stable-code-tests
      repo: github:chfields/wmd-bff
      path: test/bff.test.ts
      lines: [64, 73]
      symbol: session
      sha: 239d56c1510422908d2b196226d7cc654c6c36a4
      spanHash: sha256:b2ad6e1e8a6085b5be2aa049519a61ee0b5e67e55847f882af60f16e3298b383
    - id: service-error-test
      repo: github:chfields/wmd-bff
      path: test/bff.test.ts
      lines: [121, 133]
      symbol: orders
      sha: 239d56c1510422908d2b196226d7cc654c6c36a4
      spanHash: sha256:39ea849d93e31a4136e6199b30f403ee352adbd245f11988125f985f123dc458
  confidence: high
---

Every BFF error, its own or a service's passed through, has the shape {"error": {"code", "message"}}. wmd-app branches on the codes (invalid_request, unauthenticated, invalid_credentials, unknown_order, upstream_unavailable, internal, plus service codes such as unavailable), so they must never be renamed.[^error-handler][^session-error][^service-errors][^order-access][^stable-code-tests][^service-error-test]

What to do: preserve both the envelope and existing code strings whenever adding or changing an error path.

[^error-handler]: Source `error-handler`.
[^session-error]: Source `session-error`.
[^service-errors]: Source `service-errors`.
[^order-access]: Source `order-access`.
[^stable-code-tests]: Source `stable-code-tests`.
[^service-error-test]: Source `service-error-test`.
