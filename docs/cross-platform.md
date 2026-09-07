# Cross-platform favorites

Each favorite uses one source: a Steam `appid`, an `igdb_id`, or your own `id`.
List entries in the order you want them displayed.

## Steam

Use the number from the game's Steam store URL:

```yaml
sections:
  favorites:
    games:
      - appid: 753640
        note: Knowledge is progress
```

## Custom games and covers

Add a local cover and a title for games from any platform:

```yaml
sections:
  favorites:
    games:
      - id: majoras-mask
        name: "The Legend of Zelda: Majora's Mask"
        image: assets/majoras-mask.jpg
```

Local PNG/JPEG paths resolve relative to the configuration file and must stay
within its directory. Images can be up to 4 MiB. HTTPS covers are also supported
from Steam CDNs, `images.igdb.com`, `raw.githubusercontent.com`, and
`upload.wikimedia.org`. Save images from other hosts locally.

`name`, `image`, and `note` can also override Steam or IGDB entries. Names accept
up to 120 characters and notes up to 160. Manual IDs use lowercase letters, numbers,
and hyphens; manual entries require both `name` and `image`.

## IGDB

1. Register an application using [IGDB's setup guide](https://api-docs.igdb.com/#account-creation).
2. Set `IGDB_CLIENT_ID` and `IGDB_CLIENT_SECRET` in your environment.
3. Run `pnpm run search -- "Majora's Mask"` from this repository.
4. Choose the release from the results and add its ID as an `igdb_id` entry.

For GitHub Actions, add the credentials as repository secrets and pass them to the reusable workflow:

```yaml
secrets:
  steam-api-key: ${{ secrets.STEAM_API_KEY }}
  igdb-client-id: ${{ secrets.IGDB_CLIENT_ID }}
  igdb-client-secret: ${{ secrets.IGDB_CLIENT_SECRET }}
```

IGDB supplies game titles and covers. Recent activity and playtime come from Steam.

## Localized names

Set a title for each card language:

```yaml
- appid: 753640
  names:
    en: Outer Wilds
    zh-CN: 星际拓荒
```

The selected-language title applies wherever that game appears. It falls back to
`name`, then the source title. Game names without overrides use the source's spelling.
