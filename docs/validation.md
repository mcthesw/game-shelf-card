# Validation record

Date: 2026-09-07. Local environment: Windows, Node.js 24.19.0.

## Passed

- Clean dependency install: `pnpm install --frozen-lockfile --ignore-scripts`, locked dependencies installed successfully.
- `pnpm run verify`: strict TypeScript checking, 19 passing automated tests, compiled output.
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
  960 × 1204; dark/light and English/Chinese cards inspected visually.
- Long mixed Chinese/English titles and notes inspected in an additional
  one-favorite/one-recent preview; wrapping and ellipsis stay within the cards.
- GitHub Markdown API accepts the linked image embed and preserves width 840 (original layout)
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
gallery. All use visibly labeled fictional statistics. Run `pnpm run preview`
to view the gallery at http://127.0.0.1:4178.

Game art fetching is optional. `pnpm run demo` is reproducible and offline;
`pnpm run demo:all --online-art` refreshes the preview gallery with Steam covers.

## Compact README revision

- Compared with the current mcthesw profile: 49% column, original Steam asset 480 x 495.
- New default is 480 x 602 logical pixels for 12 game rows plus overview.
- Removed the large heading, decorative panels and source/update footer. Recent rows include two-week and lifetime hours. Genres and achievement counts from the existing card remain outside this implementation.
- Migrated local scripts, lockfile, documentation and Actions to pnpm 11.1.2.

## Transparent background revision

- Removed the full-canvas background; theme now controls foreground colors only.
- All 19 tests pass via pnpm, including pixel-alpha checks at the corner and side gutter with visible content retained.
- README samples and preview gallery use picture sources for light/dark selection. Hosted theme switching is not yet live-tested.

## Square profile revision

- Default overview and lifetime ranking are disabled. Three favorites in a horizontal row and six recent games in a vertical list render at 480 x 480 (960 x 960 PNG).
- Removed visible avatar/nickname in favor of a small Steam heading.
- pnpm verification: 19 tests, type checking and build pass. Four theme/language previews regenerated.
- Earlier 480 x 602 and 960 x 1204 measurements above describe the previous revision.
