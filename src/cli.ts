import { parseArgs } from 'node:util';
import { generate } from './generate.js';
import { safeError } from './errors.js';

const help = `Steam Stats — a Steam profile card for GitHub READMEs

Usage: pnpm run generate --config config.yml --output generated/steam-card.png

  --config PATH      YAML configuration (default: config.yml)
  --output PATH      PNG destination (default: generated/steam-card.png)
  --cache PATH       Artwork cache (default: .cache/artwork)
  --demo             Use built-in fictional statistics; no API key or network
  --online-art       Fetch public Steam covers in demo mode
  --no-art           Use styled placeholders instead of downloading images
  --help             Show this message

Live mode reads STEAM_API_KEY from the environment. Never put it in the config.
Output is 2x resolution; display at width 480 or less in your README.
`;

try {
  const { values } = parseArgs({ options: {
    config: { type: 'string', default: 'config.yml' },
    output: { type: 'string', default: 'generated/steam-card.png' },
    cache: { type: 'string', default: '.cache/artwork' },
    demo: { type: 'boolean', default: false },
    'online-art': { type: 'boolean', default: false },
    'no-art': { type: 'boolean', default: false },
    help: { type: 'boolean', default: false },
  }, strict: true, allowPositionals: false });
  if (values.help) process.stdout.write(help);
  else {
    if (values['online-art'] && !values.demo) throw new Error('--online-art is only needed with --demo.');
    const result = await generate({
      configPath: values.config, outputPath: values.output, cachePath: values.cache,
      apiKey: process.env.STEAM_API_KEY,
      igdbClientId: process.env.IGDB_CLIENT_ID, igdbClientSecret: process.env.IGDB_CLIENT_SECRET, demo: values.demo,
      onlineArt: values['online-art'], noArt: values['no-art'],
      warn: message => process.stderr.write(`Warning: ${message}\n`),
    });
    process.stdout.write(`${result.changed ? 'Generated' : 'Unchanged'} ${result.output} (${result.width * 2}×${result.height * 2})${result.demo ? ' — SAMPLE DATA' : ''}\n`);
  }
} catch (error) {
  process.stderr.write(`Steam Stats: ${safeError(error, process.env.STEAM_API_KEY)}\n`);
  process.exitCode = 1;
}
