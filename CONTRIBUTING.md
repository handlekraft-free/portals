# Contributing

Thanks for your interest in contributing! This project is a community-maintained fork of the handləkraft.ai portal system.

## Ground rules

- Keep the code organization-agnostic. Anything specific to a deploying organization belongs in `shared/branding.ts` or a config table — not hard-coded in pages or routes.
- Don't reintroduce marketing or fundraising surfaces (application forms, donation flows, public-website pages). Those live in downstream forks.
- Database changes go in `shared/schema.ts`. Run `npm run db:push` and update any storage interfaces that reference the changed tables.

## Development

```bash
npm install
cp .env.example .env   # fill in DATABASE_URL + JWT_SECRET
npm run db:push
npm run dev
```

Type-check before opening a PR:

```bash
npm run check
```

## Pull requests

1. Fork the repo and create a topic branch (`git checkout -b fix/streak-rollover`).
2. Make focused commits with clear messages.
3. Manually exercise any portal you touched (Employee / Client / Student / Board).
4. Open a PR describing **what** changed and **why**, plus the manual test path you walked.

## Reporting issues

Please include:

- Open Portals version (login footer or `GET /api/public/version`)
- What you expected vs. what happened
- Steps to reproduce
- Browser + OS, Node version
- Relevant server logs (redact secrets)

GitHub issues are best-effort community support. If you need guaranteed response times, deployment help, custom features, or integration work, the maintainers offer paid support — see [SUPPORT.md](./SUPPORT.md) or email **robert@handlekraft.ai**.

## Reporting security vulnerabilities

Please **do not** open a public issue for security bugs. Email **robert@handlekraft.ai** and we'll acknowledge within 2 business days.

## Code style

- Follow the existing patterns in each layer (Drizzle in `shared/schema.ts`, thin Express handlers in `server/routes-*.ts`, shadcn + React Query in `client/src/`).
- Add `data-testid` attributes to interactive elements.
- Prefer small, composable components.

## License

By contributing, you agree your contributions will be licensed under the project's **AGPL-3.0-or-later** license. See [LICENSE](./LICENSE) and [NOTICE](./NOTICE) for details.

If you can't accept the AGPL terms (e.g. employer policy), please don't submit a PR — get in touch at **robert@handlekraft.ai** to discuss alternatives.
