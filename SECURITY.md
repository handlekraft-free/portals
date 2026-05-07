# Security policy

## Reporting a vulnerability

**Please do not open a public GitHub issue for security vulnerabilities.**

Email **robert@handlekraft.ai** with:

- A description of the vulnerability
- Steps to reproduce
- Affected version (visible in the login footer or via `GET /api/public/version`)
- Your assessment of impact (data exposure, privilege escalation, DoS, etc.)
- Whether you've contacted anyone else about it

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
