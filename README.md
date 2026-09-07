# Game Shelf Card

A game card for your GitHub README: handpicked favorites, recent Steam activity,
and optional playtime rankings. Supports Steam, IGDB, and your own game entries.

[中文](docs/README.zh-CN.md) · [Configuration](docs/configuration.md) · [Cross-platform favorites](docs/cross-platform.md)

<img src="docs/previews/neutral-en.png" width="480" alt="Sample game card with favorites and recent activity">

## Add it to your profile

1. Copy [config.example.yml](config.example.yml) into your profile repository as
   `steam-stats.yml`. Enter your quoted 17-digit SteamID64 and favorite game IDs
   (the numbers in Steam store URLs).
2. Set your Steam **Game details** to public and allow playtime visibility.
   Get a [Steam Web API key](https://steamcommunity.com/dev/apikey) and save it in
   your repository under **Settings → Secrets and variables → Actions** as `STEAM_API_KEY`.
3. Add the short [workflow caller](examples/update-card.yml) as
   `.github/workflows/steam-stats.yml`. Commit both files to your default branch,
   then open **Actions → Update Steam card → Run workflow**.
4. Add the generated card to your README. Set the link to your Steam profile or games page:

```html
<a href="https://steamcommunity.com/profiles/YOUR_STEAM_ID/">
  <img src="assets/steam-card.png" width="480" alt="My favorite games and recent Steam activity">
</a>
```

The caller schedules daily updates; the shared workflow generates and commits the card. The example uses one transparent image
with neutral text colors for light and dark backgrounds.

## Customize

Choose the number of favorites and recent games, add short notes, or enable a
lifetime ranking. Cards are 480 pixels wide with a height that follows the content.
Use `language: zh-CN` for Chinese and `min_height` to align with a neighboring card.

See the [configuration reference](docs/configuration.md) for all options and
[cross-platform favorites](docs/cross-platform.md) for IGDB, custom covers, and localized names.

## Run locally

Use Node.js 22 or 24 and pnpm 11.1.2:

```sh
git clone https://github.com/mcthesw/game-shelf-card.git
cd game-shelf-card
pnpm install --frozen-lockfile --ignore-scripts
pnpm run demo
```

Open `generated/steam-card.png` to see the sample. For your own account, copy
`config.example.yml` to `config.local.yml`, fill in your Steam ID, and set the
`STEAM_API_KEY` environment variable. Then run:

```sh
pnpm run generate --config config.local.yml --output generated/steam-card.png
```

For development, run `pnpm run verify` to check types, run tests, and build.

## License

[MIT](LICENSE). The bundled [Noto font](assets/fonts/README.md) uses the SIL OFL.
Game artwork belongs to its respective owners. Preview statistics are sample data.
