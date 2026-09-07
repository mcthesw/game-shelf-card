# Validation record

Date: 2026-09-07. Local environment: Windows, Node.js 24.19.0.

## Passed

- Clean dependency install: `npm ci --ignore-scripts`, zero reported audit vulnerabilities.
- `npm run verify`: strict TypeScript checking, 19 passing automated tests, compiled output.
- Tests cover config defaults/types/unknown keys, favorites order, duplicates,
  exclusions before limits, overview totals, private/malformed/incomplete Steam
  data, zero activity, disabled endpoint requests, unowned favorites, image URL
  restrictions, retry limits, secret redaction, response limits, bilingual text
  layout, XML escaping, empty/disabled sections and preservation of old output.
- Offline demo generation and repeat-run byte stability.
- Compiled action entry executed with GitHub-style environment variables:
  first run `changed=true`, second run `changed=false` with the same PNG path.
- actionlint 1.7.12: CI and example update workflow pass.
- Live public Store metadata query for App ID 250900 resolves successfully.
- Live public Steam cover downloads used in the four visual previews.
- Font file checksum and OFL license captured with the bundled original file.
- In-app browser: all four preview images load with natural dimensions
  1680 × 2480; dark/light and English/Chinese cards inspected visually.
- Long mixed Chinese/English titles and notes inspected in an additional
  one-favorite/one-recent preview; wrapping and ellipsis stay within the cards.
- GitHub Markdown API accepts the linked image embed and preserves width 840
  with responsive max-width styling.

## Not yet verified

- Authenticated live Steam profile/library/recent requests: no STEAM_API_KEY in
  the current environment. Transport and response normalization use mocked
  endpoint fixtures in tests, not a claim of personal-account verification.
- GitHub-hosted CI, scheduling and commit/push steps: no remote repository has
  been created or published. CI definitions include Windows / Ubuntu, Node.js
  22 / 24, and an action smoke test. Only local Windows Node.js 24 was executed.
- Actual published README image delivery and cache refresh. The Markdown API
  check and local browser previews do not establish CDN behavior.

## Visual artifacts

`docs/previews/` contains dark/light English and Chinese PNGs plus a local HTML
gallery. All use visibly labeled fictional statistics. Run `npm run preview`
to view the gallery at http://127.0.0.1:4178.

Game art fetching is optional. `npm run demo` is reproducible and offline;
`npm run demo:all -- --online-art` refreshes the preview gallery with Steam covers.
