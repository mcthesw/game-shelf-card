import { appendFile } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { generate } from './generate.js';
import { workspacePath } from './action-path.js';
import { safeError } from './errors.js';

try {
  const workspace = process.env.GITHUB_WORKSPACE;
  if (!workspace) throw new Error('GITHUB_WORKSPACE is required for the action entry point.');
  const config = await workspacePath(workspace, process.env.CARD_CONFIG ?? 'steam-stats.yml');
  const output = await workspacePath(workspace, process.env.CARD_OUTPUT ?? 'assets/steam-card.png');
  const result = await generate({
    configPath: config, outputPath: output,
    apiKey: process.env.STEAM_API_KEY,
    demo: process.env.CARD_DEMO === 'true',
    cachePath: join(process.env.RUNNER_TEMP ?? workspace, 'steam-stats-artwork'),
    warn: message => process.stderr.write(`Warning: ${message}\n`),
  });
  if (process.env.GITHUB_OUTPUT) {
    await appendFile(process.env.GITHUB_OUTPUT,
      `changed=${result.changed}\npath=${relative(workspace, output).replaceAll('\\', '/')}\n`);
  }
  process.stdout.write(`${result.changed ? 'Generated' : 'Unchanged'} Steam card${result.demo ? ' (sample data)' : ''}.\n`);
} catch (error) {
  process.stderr.write(`Steam Stats: ${safeError(error, process.env.STEAM_API_KEY)}\n`);
  process.exitCode = 1;
}
