# Configuration

Start with [config.example.yml](../config.example.yml). Save it as `steam-stats.yml`
for the Action or `config.local.yml` for local use.

## Card options

| Key | Default | Values / purpose |
| --- | --- | --- |
| `steam_id` | Required | Quoted 17-digit SteamID64 |
| `language` | `en` | `en`, `zh-CN` |
| `theme` | `dark` | `neutral` for a shared image; `dark` or `light` for a specific background |
| `min_height` | `0` | Minimum logical height, 0–2000 pixels; shorter content is centered |
| `display_name` | Steam nickname | Accessible image title, up to 80 characters |
| `exclude_games` | `[]` | Steam App IDs to omit from recent activity and lifetime ranking |

The example selects `neutral`. Output is a transparent PNG at 2× resolution;
display it at 480 pixels wide or smaller. Each image can link to one destination.

## Sections

| Section | Enabled by default | Default limit | Order |
| --- | --- | --- | --- |
| `favorites` | Yes | 3 | Configuration order |
| `recent` | Yes | 6 | Two-week playtime |
| `most_played` | No | 3 | Lifetime playtime |
| `overview` | No | — | Library count, lifetime hours, two-week hours |

```yaml
sections:
  favorites:
    limit: 3
    games:
      - appid: 250900
        note: Always worth another run
      - appid: 1145360
      - appid: 1245620
  recent:
    limit: 4
  most_played:
    enabled: true
    limit: 3
  overview:
    enabled: false
```

Limits accept 1–12. Set `enabled: false` to hide a section. Games can appear in
multiple sections. Exclusions apply before automatic list limits; overview totals
include all games returned by Steam.

Favorites accept `appid`, `igdb_id`, or a manual `id`, plus optional names, covers,
and notes. See [favorite entries](cross-platform.md). Titles wrap to two lines;
notes use one line, with long text shortened to fit.

## Reusable workflow

Use [the caller example](../examples/update-card.yml) to generate, upload, and commit
cards. It follows `@main`; replace that ref with a commit SHA to pin a version.
The caller controls the schedule and grants `contents: write`.

Optional `with` inputs: `config` (default `steam-stats.yml`), `output` (default
`assets/steam-card.png`), `commit` (default `true`), and `demo` (default `false`).
Pass `steam-api-key`, `igdb-client-id`, and `igdb-client-secret` under `secrets`.
Use `commit: false` to generate an artifact for review. Pull request runs always
produce an artifact without committing.

## Standalone Action

| Input | Default / purpose |
| --- | --- |
| `steam-api-key` | Steam Web API key from a repository secret |
| `config` | `steam-stats.yml` |
| `output` | `assets/steam-card.png` |
| `igdb-client-id` | Optional IGDB application ID |
| `igdb-client-secret` | Optional IGDB application secret |
| `demo` | `false`; `true` generates sample data |

Paths are relative to the checked-out repository. Outputs are `path` and `changed`
(`true` or `false`). The [example workflow](../examples/update-card.yml) schedules
generation and commits updated images. Repositories with protected default branches
need a publishing workflow that follows their branch rules.

## CLI

| Flag | Default / purpose |
| --- | --- |
| `--config` | `config.yml` |
| `--output` | `generated/steam-card.png` |
| `--cache` | `.cache/artwork` |
| `--demo` | Generate offline sample data |
| `--online-art` | Download covers for sample data |
| `--no-art` | Render artwork placeholders |

CLI paths are relative to the working directory. Set `STEAM_API_KEY` in the
environment for Steam data; IGDB uses `IGDB_CLIENT_ID` and `IGDB_CLIENT_SECRET`.

## When a refresh fails

Check the workflow log and Steam Game details visibility. Failed statistics
requests preserve the previous image. Unavailable covers use cached artwork or a
placeholder; local cover paths must point to valid image files.
