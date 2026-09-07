import { z } from 'zod';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { requestBytes, type Fetch } from './http.js';

const entrySchema = z.object({
  id: z.number().int().positive(), name: z.string().min(1),
  first_release_date: z.number().optional(),
  platforms: z.array(z.object({ name: z.string() })).optional(),
  cover: z.object({ image_id: z.string().regex(/^[a-zA-Z0-9_]+$/) }).optional(),
});
export type IgdbEntry = z.infer<typeof entrySchema>;
export interface IgdbOptions { clientId?: string; clientSecret?: string; cache?: string; fetcher?: Fetch }

export function coverUrl(entry: IgdbEntry): string | undefined {
  return entry.cover && `https://images.igdb.com/igdb/image/upload/t_cover_big/${entry.cover.image_id}.jpg`;
}

export function createIgdb(options: IgdbOptions) {
  let token: string | undefined;
  let expiresAt = 0;
  let lastRequest = 0;
  let queue: Promise<unknown> = Promise.resolve();
  const post = async (url: string, body: string, headers: Record<string, string>) => {
    const { bytes } = await requestBytes(new URL(url), 'IGDB', options.fetcher, undefined, 5 * 1024 * 1024,
      { method: 'POST', body, headers });
    try { return JSON.parse(bytes.toString('utf8')) as unknown; }
    catch { throw new Error('IGDB returned invalid JSON.'); }
  };
  const query = (body: string): Promise<IgdbEntry[]> => {
    const task = queue.then(async () => {
      if (!options.clientId || !options.clientSecret) throw new Error('Set IGDB_CLIENT_ID and IGDB_CLIENT_SECRET, or use a manual game entry.');
      if (!token || Date.now() >= expiresAt) {
        const credentials = new URLSearchParams({ client_id: options.clientId, client_secret: options.clientSecret, grant_type: 'client_credentials' });
        const auth = z.object({ access_token: z.string().min(1), expires_in: z.number().positive() }).safeParse(
          await post('https://id.twitch.tv/oauth2/token', credentials.toString(), { 'Content-Type': 'application/x-www-form-urlencoded' }));
        if (!auth.success) throw new Error('IGDB authentication returned an invalid response.');
        token = auth.data.access_token;
        expiresAt = Date.now() + Math.max(0, auth.data.expires_in - 60) * 1000;
      }
      await new Promise(resolve => setTimeout(resolve, Math.max(0, 300 - (Date.now() - lastRequest))));
      lastRequest = Date.now();
      const result = z.array(entrySchema).safeParse(await post('https://api.igdb.com/v4/games', body,
        { 'Client-ID': options.clientId, Authorization: `Bearer ${token}`, 'Content-Type': 'text/plain' }));
      if (!result.success) throw new Error('IGDB returned invalid game metadata.');
      return result.data;
    });
    queue = task.catch(() => {});
    return task;
  };
  const fields = 'fields id,name,first_release_date,platforms.name,cover.image_id;';
  return {
    async search(name: string) {
      const clean = name.trim();
      if (!clean || clean.length > 120 || /[\x00-\x1f]/.test(clean)) throw new Error('Search requires 1–120 characters without control characters.');
      return query(`search ${JSON.stringify(clean)}; ${fields} limit 10;`);
    },
    async get(id: number): Promise<IgdbEntry> {
      if (!Number.isSafeInteger(id) || id < 1) throw new Error('Invalid IGDB ID.');
      const path = options.cache && join(options.cache, `igdb-${id}.json`);
      let cached: IgdbEntry | undefined;
      if (path) try {
        const record = z.object({ date: z.number(), game: entrySchema }).parse(JSON.parse(await readFile(path, 'utf8')));
        if (record.game.id === id) {
          cached = record.game;
          if (Date.now() - record.date < 30 * 86400_000) return cached;
        }
      } catch { /* Optional cache. */ }
      let entries: IgdbEntry[];
      try { entries = await query(`${fields} where id = ${id}; limit 1;`); }
      catch (error) { if (cached) return cached; throw error; }
      const game = entries.find(entry => entry.id === id);
      if (!game) throw new Error(`IGDB game ${id} was not found.`);
      if (path) try {
        await mkdir(options.cache!, { recursive: true });
        await writeFile(path, JSON.stringify({ date: Date.now(), game }));
      } catch { /* Metadata cache is optional; tokens are never persisted. */ }
      return game;
    },
  };
}
