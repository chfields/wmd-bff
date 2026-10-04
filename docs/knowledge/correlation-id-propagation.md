---
type: convention
title: Every request carries one x-correlation-id end to end
description: Each service accepts x-correlation-id (or makes one), logs it, returns it, and forwards it on every outbound call.
tags: [core, observability]
status: stable
generated:
  by: wmd-bff-builder/gpt-5.6-terra
  at: 2026-10-04T15:29:43Z
sources:
  - id: app
    url: https://github.com/chfields/wmd-bff/blob/239d56c1510422908d2b196226d7cc654c6c36a4/src/app.ts#L20-L130
  - id: tests
    url: https://github.com/chfields/wmd-bff/blob/239d56c1510422908d2b196226d7cc654c6c36a4/test/bff.test.ts#L161-L171
  - id: canonical
    url: https://github.com/chfields/wmd-deploy/blob/main/docs/knowledge/core/correlation-id-propagation.md
wardby:
  schema: 1
  roles: [builder, reviewer]
  affects: [src/app.ts, test/bff.test.ts]
  citations:
    - id: correlation-header
      repo: github:chfields/wmd-bff
      path: src/app.ts
      lines: [20, 21]
      symbol: CORRELATION_HEADER
      sha: 239d56c1510422908d2b196226d7cc654c6c36a4
      spanHash: sha256:96d23d989a7f04b3913576c2ec3d5bcaca1ef6bfecdbfeeeb63caf68b12b03f0
    - id: request-id
      repo: github:chfields/wmd-bff
      path: src/app.ts
      lines: [63, 72]
      symbol: buildApp
      sha: 239d56c1510422908d2b196226d7cc654c6c36a4
      spanHash: sha256:57f8bb6e0588521b710fef4568aa2b82dc69c316acda935b5eb4d6431741625d
    - id: response-header
      repo: github:chfields/wmd-bff
      path: src/app.ts
      lines: [75, 83]
      symbol: onRequest
      sha: 239d56c1510422908d2b196226d7cc654c6c36a4
      spanHash: sha256:f83a6ac6e8c470fe6336b57e561a6783536d862d0720260fc17014139472e704
    - id: service-call
      repo: github:chfields/wmd-bff
      path: src/app.ts
      lines: [108, 130]
      symbol: call
      sha: 239d56c1510422908d2b196226d7cc654c6c36a4
      spanHash: sha256:2f5125615249f889bcc2893973bb9e13498c366c5de0cddf88b33998b6a53df4
    - id: correlation-test
      repo: github:chfields/wmd-bff
      path: test/bff.test.ts
      lines: [161, 171]
      symbol: platform
      sha: 239d56c1510422908d2b196226d7cc654c6c36a4
      spanHash: sha256:8e279d4303655d443fc78634e1520812f89368a76bca628a310d5d71c279609b
  confidence: high
---

The BFF uses an incoming x-correlation-id as its request id when it matches /^[A-Za-z0-9._-]{1,128}$/, otherwise it makes a UUID. It logs the id as correlationId, returns it (and exposes it to CORS), and `call()` forwards it on every service call.[^correlation-header][^request-id][^response-header][^service-call][^correlation-test]

What to do: preserve the same request id on every BFF response and outbound service call.

[^correlation-header]: Source `correlation-header`.
[^request-id]: Source `request-id`.
[^response-header]: Source `response-header`.
[^service-call]: Source `service-call`.
[^correlation-test]: Source `correlation-test`.
