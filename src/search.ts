import { parseArgs } from 'node:util';
import { createIgdb, coverUrl } from './igdb.js';

try {
  const { values, positionals } = parseArgs({ allowPositionals: true, options: { help: { type: 'boolean' } } });
  if (values.help) console.log('Usage: pnpm run search -- "Majora\'s Mask"\nRequires IGDB_CLIENT_ID and IGDB_CLIENT_SECRET.');
  else {
    const results = await createIgdb({ clientId: process.env.IGDB_CLIENT_ID, clientSecret: process.env.IGDB_CLIENT_SECRET }).search(positionals.join(' '));
    if (!results.length) console.log('No matching games.');
    for (const game of results) {
      const year = game.first_release_date ? new Date(game.first_release_date * 1000).getUTCFullYear() : '?';
      console.log(`${game.id}\t${game.name.replace(/[\r\n\t\x1b]/g, ' ')} (${year})\t${game.platforms?.map(platform => platform.name).join(', ') ?? ''}`);
      console.log(`  igdb_id: ${game.id}${coverUrl(game) ? `\n  cover: ${coverUrl(game)}` : ''}`);
    }
  }
} catch (error) {
  // HTTP helpers never expose request bodies, headers, or upstream error payloads.
  console.error(error instanceof Error ? error.message : 'IGDB search failed.');
  process.exitCode = 1;
}
