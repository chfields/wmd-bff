---
type: decision
title: Only merged main reaches staging
description: deploy.sh builds every service from its origin/main in a clean checkout, so staging never runs unreviewed code.
tags: [core, deploy, ci]
status: stable
generated:
  by: wmd-bff-builder/gpt-5.6-terra
  at: 2026-10-04T15:29:43Z
sources:
  - id: dockerfile
    url: https://github.com/chfields/wmd-bff/blob/239d56c1510422908d2b196226d7cc654c6c36a4/Dockerfile#L1-L17
  - id: workflow
    url: https://github.com/chfields/wmd-bff/blob/239d56c1510422908d2b196226d7cc654c6c36a4/.github/workflows/test.yml#L1-L18
  - id: canonical
    url: https://github.com/chfields/wmd-deploy/blob/main/docs/knowledge/core/only-merged-code-reaches-staging.md
wardby:
  schema: 1
  roles: [reviewer, planner]
  affects: [Dockerfile, .github/workflows/test.yml, package.json]
  citations:
    - id: image-build
      repo: github:chfields/wmd-bff
      path: Dockerfile
      lines: [1, 17]
      symbol: Dockerfile
      sha: 239d56c1510422908d2b196226d7cc654c6c36a4
      spanHash: sha256:f49279b5c25cd5afd8c3d0cb06732be59b5af1c3b343e3f7d10f4c5a78bf46c5
    - id: workflow-checks
      repo: github:chfields/wmd-bff
      path: .github/workflows/test.yml
      lines: [1, 18]
      symbol: test workflow
      sha: 239d56c1510422908d2b196226d7cc654c6c36a4
      spanHash: sha256:ade69bf344ad211bf3ebab87f6337f23e42047cda5f2b02b1e0afe6d83ab0c4c
  confidence: medium
---

The staging image of wmd-bff is built by wmd-deploy's deploy.sh from this repository's origin/main using this Dockerfile, so a change reaches staging only after it is merged, and the workflow checks it before merge. Local or unmerged branches never deploy.[^image-build][^workflow-checks]

Why: staging must run reviewed, checked source rather than a developer's local branch.

[^image-build]: Source `image-build`.
[^workflow-checks]: Source `workflow-checks`.
