# Cross-platform favorites

Existing `{ appid: ... }` entries remain valid. Each favorite must specify exactly
one identity: `appid` (Steam), `igdb_id` (IGDB), or `id` (manual, lowercase letters,
numbers and hyphens). Steam and IGDB numeric IDs occupy separate namespaces.
Name, image and note overrides are supported for all sources. Duplicate identities
are rejected within favorites; the same game can still appear in recent activity.

```yaml
sections:
  favorites:
    limit: 6
    games:
      - appid: 753640
        note: Knowledge is progress
      - igdb_id: 1234 # Example only: replace with the ID returned by search.
      - id: majoras-mask
        name: "The Legend of Zelda: Majora's Mask"
        image: assets/majoras-mask.png
        note: Your own short review
```

Manual entries require a name and image. Local PNG/JPEG paths resolve relative to
the configuration file; they must stay below that directory and cannot traverse
symlinks or `.git`. Images are limited to 4 MiB. HTTPS images support Steam CDN,
images.igdb.com, raw.githubusercontent.com and upload.wikimedia.org (exact host
allowlist in `src/artwork.ts`). Redirects and URLs containing credentials are rejected.
Use local files for other image sources. Network failures use cache/placeholders;
missing or invalid local files fail generation and preserve the previous card.
Image rights remain with their owners; a public URL does not grant redistribution rights.

## IGDB setup and search

Follow [IGDB's official setup](https://api-docs.igdb.com/#account-creation) to register
a Twitch developer application. Set `IGDB_CLIENT_ID` and `IGDB_CLIENT_SECRET` in the
environment. Do not put either secret in game configuration or source control.

```sh
pnpm run search -- "Majora's Mask"
```

Results show ID, title, release year and platforms, plus a cover URL when available.
Choose the intended release (original/remake), then copy its `igdb_id` into config.
Search requires credentials and does not silently choose a result. It returns up to
10 matches. Search text is escaped before querying IGDB.

Generate normally with `pnpm run generate --config config.local.yml`.
IGDB is contacted only for selected, enabled IGDB favorites. Metadata is cached for
30 days under the configured cache directory; a stale valid entry may be reused on
request failure. The cache stores game data, never credentials/access tokens. Artwork
uses the existing 7-day cache. Tokens are refreshed in memory when expired. Requests
are serialized with at least 300 ms between game queries and bounded retry/timeout.

The GitHub Action accepts optional `igdb-client-id` and `igdb-client-secret` inputs:

```yaml
with:
  steam-api-key: ${{ secrets.STEAM_API_KEY }}
  igdb-client-id: ${{ secrets.IGDB_CLIENT_ID }}
  igdb-client-secret: ${{ secrets.IGDB_CLIENT_SECRET }}
  config: steam-stats.yml
```

Steam/manual users do not need IGDB credentials. With all Steam statistics disabled
and no selected Steam favorites, Steam is not queried and STEAM_API_KEY is unnecessary.
`steam_id` remains a required config field for backwards compatibility, even in this
mode. Cached metadata in Actions' temporary directory is not persisted across runs;
local cache is persistent. No account/player activity is fetched from IGDB.

## Six-favorite preview

`examples/personal-demo.yml` contains the six discussed games, keeps the user's
category labels as provisional notes, and displays three fictional recent games.
Majora's Mask uses original text-only placeholder artwork in `examples/assets/`;
it is not an IGDB search result or an official cover. Replace its image with your
chosen cover or switch the entry to an IGDB ID after searching.

```sh
pnpm run demo:all --online-art --config examples/personal-demo.yml --output-dir docs/previews-personal
```

Preview: `docs/previews-personal/index.html`. Size: 480 x 490 logical pixels, transparent.
No personal credentials are required for this demo. Live authentication/search and
GitHub-hosted Actions remain unverified until credentials and a remote are available.
