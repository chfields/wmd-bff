---
type: invariant
title: The BFF is the only API the app and the outside world reach
description: wmd-app calls only wmd-bff; services stay internal and trust the user id the BFF passes, never one taken from a request body.
tags: [core, security, auth]
status: stable
generated:
  by: wmd-bff-builder/gpt-5.6-terra
  at: 2026-10-04T15:29:43Z
sources:
  - id: app
    url: https://github.com/chfields/wmd-bff/blob/239d56c1510422908d2b196226d7cc654c6c36a4/src/app.ts#L63-L225
  - id: auth
    url: https://github.com/chfields/wmd-bff/blob/239d56c1510422908d2b196226d7cc654c6c36a4/src/auth.ts#L27-L43
  - id: tests
    url: https://github.com/chfields/wmd-bff/blob/239d56c1510422908d2b196226d7cc654c6c36a4/test/bff.test.ts#L95-L119
  - id: canonical
    url: https://github.com/chfields/wmd-deploy/blob/main/docs/knowledge/core/bff-only-public-api.md
wardby:
  schema: 1
  roles: [builder, reviewer, planner]
  affects: [src/app.ts, src/auth.ts, test/bff.test.ts]
  citations:
    - id: authenticate
      repo: github:chfields/wmd-bff
      path: src/app.ts
      lines: [101, 106]
      symbol: authenticate
      sha: 239d56c1510422908d2b196226d7cc654c6c36a4
      spanHash: sha256:7d96dc768970a1086e4e3064225bb420a1f34d6b0e4308f8c870332f8e6e5d3a
    - id: order-creation
      repo: github:chfields/wmd-bff
      path: src/app.ts
      lines: [192, 225]
      symbol: POST /v1/orders
      sha: 239d56c1510422908d2b196226d7cc654c6c36a4
      spanHash: sha256:a86b17079412561a0e4139b61064dfec022a1ad9befb3777c53137c906712244
    - id: ajv
      repo: github:chfields/wmd-bff
      path: src/app.ts
      lines: [63, 72]
      symbol: buildApp
      sha: 239d56c1510422908d2b196226d7cc654c6c36a4
      spanHash: sha256:57f8bb6e0588521b710fef4568aa2b82dc69c316acda935b5eb4d6431741625d
    - id: verify-token
      repo: github:chfields/wmd-bff
      path: src/auth.ts
      lines: [27, 43]
      symbol: verifyToken
      sha: 239d56c1510422908d2b196226d7cc654c6c36a4
      spanHash: sha256:d4963fd5d24d158d895d7ceef3b39176353abac89ef7db43fbbbab4ad7868736
    - id: order-tests
      repo: github:chfields/wmd-bff
      path: test/bff.test.ts
      lines: [95, 119]
      symbol: orders
      sha: 239d56c1510422908d2b196226d7cc654c6c36a4
      spanHash: sha256:43fab4aef5ffd912d2fcb6cf35674fba6a711eba2d08d77e3cf2fd6f67c9818a
  confidence: high
---

The BFF is the public API: it verifies the app's token and passes services only the signed-in user's id (request.user.id), never the token. A userId in a request body gets a 400 rather than being dropped or forwarded.[^authenticate][^order-creation][^ajv][^verify-token][^order-tests]

Why: keeping app authentication and service identity at the BFF boundary prevents callers from impersonating another user.

[^authenticate]: Source `authenticate`.
[^order-creation]: Source `order-creation`.
[^ajv]: Source `ajv`.
[^verify-token]: Source `verify-token`.
[^order-tests]: Source `order-tests`.
