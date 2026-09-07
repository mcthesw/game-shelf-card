import { readFile } from 'node:fs/promises';
import { parseDocument } from 'yaml';
import { z } from 'zod';

const appid = z.number().int().positive().max(4294967295);
const section = (limit: number, enabled = true) => z.object({
  enabled: z.boolean().default(enabled),
  limit: z.number().int().min(1).max(12).default(limit),
}).strict().prefault({});

export const configSchema = z.object({
  steam_id: z.string().regex(/^7656119\d{10}$/, 'Use a quoted 17-digit SteamID64, not a profile URL.'),
  language: z.enum(['en', 'zh-CN']).default('en'),
  theme: z.enum(['dark', 'light']).default('dark'),
  display_name: z.string().trim().min(1).max(80).optional(),
  sections: z.object({
    overview: z.object({ enabled: z.boolean().default(false) }).strict().prefault({}),
    favorites: z.object({
      enabled: z.boolean().default(true),
      limit: z.number().int().min(1).max(12).default(3),
      games: z.array(z.object({
        appid,
        note: z.string().trim().max(160).optional(),
        // Optional override for unavailable/delisted Store entries.
        name: z.string().trim().min(1).max(120).optional(),
      }).strict()).max(100).default([]).refine(
        games => new Set(games.map(game => game.appid)).size === games.length,
        'Each favorite App ID must be unique.',
      ),
    }).strict().prefault({}),
    recent: section(6),
    most_played: section(3, false),
  }).strict().prefault({}),
  exclude_games: z.array(appid).max(1000).default([]),
}).strict();

export type Config = z.infer<typeof configSchema>;

export function parseConfig(text: string): Config {
  const document = parseDocument(text, { uniqueKeys: true });
  if (document.errors.length) throw new Error('Invalid YAML configuration. Check indentation and duplicate keys.');
  let value: unknown;
  try { value = document.toJS({ maxAliasCount: 20 }); }
  catch { throw new Error('Invalid YAML configuration: excessive aliases.'); }
  const result = configSchema.safeParse(value);
  if (!result.success) {
    throw new Error(`Invalid configuration:\n${result.error.issues.map(issue =>
      `  ${issue.path.join('.') || 'config'}: ${issue.message}`).join('\n')}`);
  }
  return result.data;
}

export async function loadConfig(path: string): Promise<Config> {
  const bytes = await readFile(path);
  if (bytes.length > 128 * 1024) throw new Error('Configuration exceeds 128 KiB.');
  return parseConfig(bytes.toString('utf8'));
}
