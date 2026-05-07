# Security policy

Thanks for helping keep Open Portals and the people who use it safe.

## Reporting a vulnerability

**Please do not open a public GitHub issue for security vulnerabilities.**

Email **robert@handlekraft.ai** with:

- A description of the vulnerability
- Steps to reproduce (proof-of-concept code, requests, or screenshots are welcome)
- Affected version (visible in the login footer or via `GET /api/public/version`)
- Your assessment of impact (data exposure, privilege escalation, DoS, etc.)
- Whether you've contacted anyone else about it
- Your name / handle if you'd like to be credited in the release notes

We acknowledge reports within **2 business days** and aim to ship a fix or
mitigation within **14 days** for high/critical issues.

## Supported versions

This project is at v0.x and the API surface is still stabilizing. Only the
latest released version receives security fixes. Once we reach v1.0,
we'll publish a longer-term support policy here.

| Version | Supported           |
| ------- | ------------------- |
| 0.1.x   | :white_check_mark:  |
| < 0.1   | :x:                 |

## Scope

In scope:

- The code in this repository (server, client, shared, build scripts)
- Default configuration shipped in `.env.example` and `.replit`

Out of scope:

- Vulnerabilities in third-party dependencies (please report those upstream;
  we monitor Dependabot alerts and will pick up patched versions)
- Issues that require an already-compromised admin account
- Self-XSS, clickjacking on pages with no sensitive actions, missing best-practice
  headers without a demonstrated impact
- Denial-of-service via expensive but legitimate API usage

## Disclosure

Once a fix is available we will:

1. Release a patched version (`0.x.y` → `0.x.(y+1)`)
2. Add a `## [Security]` entry to `CHANGELOG.md`
3. Credit the reporter (unless they ask to remain anonymous)
4. Publish a brief advisory describing the issue and recommended action

## Hardening recommendations for operators

- Always set `JWT_SECRET` to a long, random value in production. The dev
  fallback string is intentionally insecure and the server should never
  reach production without `JWT_SECRET` set.
- Run behind HTTPS (handled automatically on Replit Deployments and most
  managed platforms).
- Restrict `ENABLED_PORTALS` to only the portals you actually use —
  unmounted routes return 404 and reduce attack surface.
- Rotate the seeded `admin` password on first login.
- Keep dependencies current; run `npm audit` periodically.

## Commercial security support

Organizations running Open Portals in production who want a defined SLA, hardening
review, or managed patching can contract paid support from the maintainers
(handləkraft.ai). See [SUPPORT.md](./SUPPORT.md) or email
**robert@handlekraft.ai**.
