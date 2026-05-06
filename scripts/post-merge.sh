#!/bin/bash
set -e
npm install
# drizzle-kit push can become interactive when it detects an ambiguous
# table change (create vs rename). Feed it the default "create" answer
# (the first highlighted option) by piping a stream of newlines, and
# pass --force so it accepts data-changing operations non-interactively.
yes "" | npm run db:push -- --force
