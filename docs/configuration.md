# Configuration

Configuration is YAML. Unknown fields, duplicate keys, invalid types and invalid
counts fail before network requests. SteamID64 must be a quoted 17-digit string;
App IDs are positive integers (the number in a Steam store URL).

| Key | Default | Meaning |
| --- | --- | --- |
| `steam_id` | Required | Your SteamID64, not a vanity name or profile URL |
| `display_name` | Steam nickname | Optional accessible image title override, 1–80 characters |
| `language` | `en` | `en` or `zh-CN`; labels and number formatting |
| `theme` | `dark` | `dark` or `light` |
| `sections.overview.enabled` | `false` | Library count, total hours, two-week hours |
| `sections.favorites.enabled` | `true` | Handpicked favorites |
| `sections.favorites.limit` | `3` | First 1–12 configured favorites |
| `sections.favorites.games` | `[]` | Ordered list of `{ appid, note?, name? }` |
| `sections.recent.enabled` | `true` | Games with nonzero reported two-week time |
| `sections.recent.limit` | `6` | 1–12 games, sorted by two-week time |
| `sections.most_played.enabled` | `false` | Optional lifetime ranking |
| `sections.most_played.limit` | `3` | 1–12 games, sorted by lifetime time |
| `exclude_games` | `[]` | App IDs excluded from the two automatic lists only |

Disabled sections disappear entirely. A small Steam heading remains; avatar, nickname,
update time and source footer are not displayed. The default 3 favorites and 6 recent
games fit 480 x 480 logical pixels. Favorites use three columns with two-line titles
and an optional one-line note; recent activity and the optional lifetime list use
one column. Higher limits add rows and grow the card.

Favorite entries must have unique App IDs. `note` is optional, up to 160
characters. `name` is an optional title override, up to 120 characters, useful for
delisted or region-restricted games. A favorite need not be in the owned library.
Without a known title or override, Store metadata must resolve successfully;
otherwise generation fails with the App ID to fix.

Exclusions are applied **before** limiting automatic lists. They never change
the overview totals or handpicked favorites. Games may appear in multiple
sections. Equal-playtime entries are ordered by App ID for stable output.

Long titles and notes are wrapped or ellipsized by measured font width. The full
configuration is retained. Game titles generally follow Steam's API response;
`zh-CN` does not guarantee every game name is translated. CJK and Latin text are
supported; glyphs absent from the bundled font are replaced by `?`.

## CLI

| Flag | Default | Meaning |
| --- | --- | --- |
| `--config` | `config.yml` | YAML path |
| `--output` | `generated/steam-card.png` | PNG destination |
| `--cache` | `.cache/artwork` | Optional artwork cache directory |
| `--demo` | Off | Fixed fictional data, labeled, offline |
| `--online-art` | Off | Fetch Steam covers in demo mode |
| `--no-art` | Off | Force artwork placeholders; takes precedence |

Live mode reads `STEAM_API_KEY` only from the environment. `--demo` ignores the
key and never fetches private profile data. CLI paths are relative to the current
working directory, not the configuration file's directory.

## GitHub Action

Inputs: `config` (default `steam-stats.yml`), `output` (default
`assets/steam-card.png`), `steam-api-key`, and optional `demo: 'true'` for an
offline smoke test. Paths must be relative to the checked-out repository, cannot
traverse outside it, contain symlinks, or target `.git`.

Outputs: `path` (repository-relative PNG path) and `changed` (`true` / `false`).
The action does not commit or push. It receives the Steam key only in the
generation step, after dependency installation. `examples/update-card.yml`
adds daily scheduling and a narrowly scoped card commit.

Identical PNG bytes skip replacement and produce `changed=false`. A later
successful refresh normally changes the visible update timestamp even when
playtime is unchanged; same-minute reruns with identical data and art are stable.

## Missing data

- Empty library / recent lists require explicit zero counts from Steam.
- Missing counts, hidden/missing playtime, duplicate or partial game lists fail
  the run. No old card is deleted before a replacement is ready.
- An empty recent list shows a quiet-fortnight message; empty favorite and
  lifetime sections have their own empty states.
- If overview and lifetime ranking are off, the library endpoint is not queried.
  If overview and recent activity are off, the recent endpoint is not queried.
- Public covers and avatar downloads are best-effort. A seven-day local cache
  reduces requests; stale cached images can be reused during an outage, otherwise
  styled placeholders are shown. No remote image URLs remain in the PNG.
