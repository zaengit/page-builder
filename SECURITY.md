# Security Policy

## Supported versions

Security fixes are applied to the latest released version unless a release note explicitly states otherwise.

## Reporting a vulnerability

Please report suspected vulnerabilities privately through GitHub's security advisory reporting flow for this repository. Do not open a public issue with exploit details, credentials, private data, or a proof of concept that could put deployed applications at risk.

Include the affected version or commit, the relevant Page Builder surface, reproduction steps, impact, and any suggested mitigation if known.

## Host application responsibilities

Page Builder is a rendering/editor package, not an authentication or authorization system. The host Laravel application is responsible for protecting editor, preview, render, media, persistence, and data-provider access according to its own trust model. See `docs/production.md` before deploying the package.
