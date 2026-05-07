# Summary

<!-- 1–3 sentences: what does this PR change and why? -->

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

## How was this tested

<!-- Describe the manual test path you walked. Include the user role(s)
     you logged in as and the screens you exercised. -->

## Checklist

- [ ] `npm run check` passes
- [ ] If this changes the schema, I ran `npm run db:push` and updated
      relevant storage interfaces
- [ ] If this adds user-facing strings, I kept them in JSX (we don't have
      i18n yet) and noted any new strings in the PR description
- [ ] If this changes branding-related code, I confirmed it still reads
      from `shared/branding.ts`
- [ ] I updated `CHANGELOG.md` under `## [Unreleased]`
- [ ] If this is an upstream sync, I updated `UPSTREAM_REF` in
      `shared/version.ts`

## Related issues

<!-- e.g. "Closes #123" -->
