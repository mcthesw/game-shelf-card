# Technical decisions and evidence

Checked 2026-09-07. These are implementation decisions, not additional product scope.

## Steam data

- [Web API overview](https://partner.steamgames.com/doc/webapi_overview): public
  requests use HTTPS `api.steampowered.com`, not the publisher-only partner host.
  Service arguments are sent in `input_json`; the API key remains a separate
  parameter and is never included in application error messages.
- [ISteamUser](https://partner.steamgames.com/doc/webapi/ISteamUser):
  `GetPlayerSummaries/v2` provides nickname, ID and avatar. The configured ID must
  be found in the returned players array.
- [IPlayerService](https://partner.steamgames.com/doc/webapi/IPlayerService):
  `GetOwnedGames/v1` uses `include_appinfo` and `include_played_free_games`.
  Game data must be visible to the requester. `GetRecentlyPlayedGames/v1` uses
  count 0 (all), so exclusions and sorting happen before the display limit.
- Library entries supply lifetime minutes; recent entries supply two-week
  minutes. Counts must match returned array lengths and IDs must be unique.
  An absent response is not treated as a valid empty list.
- Unowned favorites use the public Store `api/appdetails` endpoint for names.
  This endpoint and the `steam/apps/{appid}/header.jpg` CDN convention are
  **undocumented dependencies**, not guaranteed Steamworks contracts. The Store
  metadata path and cover downloads are independently checked without a personal
  key. Users can set a favorite name override; cover failures degrade gracefully.
- All-achievements counts are deferred: they require additional per-game queries
  and a policy for unsupported, hidden and incomplete achievement data.

Library and two-week totals are independent complete sums before exclusions.
Lifetime totals can include idling or overlapping sessions. Owned-library counts
can differ from the Steam UI, licensing totals, family sharing and unplayed free
games. This renderer does not claim to distinguish every privacy-zero response
from genuine zero playtime when Steam itself supplies identical values.

## Rendering

TypeScript on Node.js, YAML + Zod configuration, fontkit text measurement,
SVG composition internally and resvg PNG output. All fonts and images are local
to the render. No `foreignObject`, external-font dependency, or browser runtime.
The unmodified OFL Noto CJK font is bundled for reproducible English/Chinese output.

The single card is 480 logical pixels wide and rendered to a 960-pixel PNG.
Favorites form a three-column grid; recent activity a two-column list; lifetime
ranking a compact full-width list. Long text is measured and wrapped/ellipsized.

[GitHub's formatting documentation](https://docs.github.com/en/get-started/writing-on-github/getting-started-with-writing-and-formatting-on-github/basic-writing-and-formatting-syntax)
documents image embedding and repository-relative image paths. PNG is the public
artifact to avoid dependencies on SVG image/font handling in README sanitization.
Local browser testing does not prove a live GitHub CDN/cache round trip; the latter
requires publishing a real repository and remains a separate final check.

## Failures and publication

Network requests have 15-second per-attempt timeouts, a maximum of three attempts,
bounded retry delays for network/429/5xx errors, response-size limits, and no
redirect following. Image hosts are restricted to known Steam HTTPS CDNs.
Steam data is required for enabled statistics; decorative artwork is best-effort.
Rendering completes before a temporary file is flushed and atomically renamed
over the destination. There is no delete-before-write step. Identical PNG bytes
are not rewritten. Output is a single file to avoid partially published bundles.

The action generates only. The example workflow stages only its designated card,
uses workflow concurrency, skips empty commits, and never force-pushes. Built-in
third-party actions are pinned to observed commit SHAs. GitHub execution has not
been claimed until the repository is published and CI actually runs.

## Source layout

- `config.ts`: schema, defaults and YAML loading.
- `http.ts`, `steam.ts`: bounded transport and API normalization.
- `model.ts`: pure selection, sorting and totals with explicit configuration.
- `artwork.ts`: optional image hydration/cache.
- `text.ts`, `render.ts`: font measurement, layout and PNG rendering.
- `generate.ts`: application composition with explicit key/options.
- `output.ts`: single-file atomic publication.
- `cli.ts`, `action-entry.ts`: environment/argument adapters.
- `demo.ts`: visibly fictional offline data, never a live-account fallback.
