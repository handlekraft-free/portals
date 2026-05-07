# Summary

<!-- 1–3 sentences: what does this PR change and why? Link any related issue. -->

Closes #

## Type of change

- [ ] Bug fix (non-breaking)
- [ ] New feature (non-breaking)
- [ ] Breaking change (schema, API, or config)
- [ ] Documentation only
- [ ] Refactor / internal cleanup

## Which portal(s)

- [ ] Employee
- [ ] Client
- [ ] Student
- [ ] Board
- [ ] Admin
- [ ] Shared / infrastructure
- [ ] N/A (infra / docs only)

## How was this tested

<!-- Describe the manual test path you walked. Include the user role(s)
     you logged in as and the screens you exercised. -->

Steps walked:

1.
2.
3.

## Checklist

- [ ] `npm run check` passes locally
- [ ] Database changes (if any) are in `shared/schema.ts` and `npm run db:push` was run
- [ ] No marketing, fundraising, application, or org-specific surfaces have been reintroduced
- [ ] Org-specific copy (if any) lives in `shared/branding.ts`, not hard-coded
- [ ] Interactive elements have `data-testid` attributes
- [ ] If this changes branding-related code, I confirmed it still reads from `shared/branding.ts`
- [ ] I updated `CHANGELOG.md` under `## [Unreleased]`
- [ ] If this is an upstream sync, I updated `UPSTREAM_REF` in `shared/version.ts`
