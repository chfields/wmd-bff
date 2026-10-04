---
type: convention
title: Only a service's 4xx error passes through; everything else becomes 502 upstream_unavailable
description: call() passes on a service error only when its status is under 500 and its body has error.code; network failures, 5s timeouts, 5xx responses and malformed error bodies all become 502 upstream_unavailable.
tags: [api, errors, resilience]
status: stable
generated:
  by: wmd-bff-builder/gpt-5.6-terra
  at: 2026-10-04T15:29:43Z
sources:
  - id: app
    url: https://github.com/chfields/wmd-bff/blob/239d56c1510422908d2b196226d7cc654c6c36a4/src/app.ts#L108-L130
  - id: tests
    url: https://github.com/chfields/wmd-bff/blob/239d56c1510422908d2b196226d7cc654c6c36a4/test/bff.test.ts#L121-L146
wardby:
  schema: 1
  roles: [builder, reviewer]
  affects: [src/app.ts, test/bff.test.ts]
  citations:
    - id: upstream-mapping
      repo: github:chfields/wmd-bff
      path: src/app.ts
      lines: [108, 130]
      symbol: call
      sha: 239d56c1510422908d2b196226d7cc654c6c36a4
      spanHash: sha256:2f5125615249f889bcc2893973bb9e13498c366c5de0cddf88b33998b6a53df4
    - id: upstream-tests
      repo: github:chfields/wmd-bff
      path: test/bff.test.ts
      lines: [121, 146]
      symbol: orders
      sha: 239d56c1510422908d2b196226d7cc654c6c36a4
      spanHash: sha256:c03b0a0fb0ecf02afda641c99c17476b8eeb7e3cdd96943eee689c58865419b4
  confidence: high
---

Service 5xx details never reach the app. Only well-formed 4xx errors keep their status and code. A service that wants the app to see a specific error must return it as a 4xx with an error.code.[^upstream-mapping][^upstream-tests]

What to do: send untrusted, unavailable, malformed, or 5xx upstream failures through the stable 502 upstream_unavailable path.

[^upstream-mapping]: Source `upstream-mapping`.
[^upstream-tests]: Source `upstream-tests`.
