#!/bin/bash
set -e

# Install/refresh dependencies (idempotent, fast on no-op).
npm install --no-audit --no-fund

# Push any schema changes from shared/schema.ts to the database.
# `--force` accepts data-changing operations non-interactively. Stdin is
# already closed by the post-merge runner; if drizzle-kit ever asks an
# ambiguous create-vs-rename question it will fail fast with EOF rather
# than hang. If that happens, resolve the schema ambiguity in
# shared/schema.ts (e.g. add a migration step) and re-merge.
npm run db:push -- --force < /dev/null
