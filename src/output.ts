import { mkdir, open, readFile, rename, rm } from 'node:fs/promises';
import { dirname, basename, join } from 'node:path';
import { randomUUID } from 'node:crypto';

export async function atomicWrite(path: string, bytes: Buffer): Promise<boolean> {
  try { if ((await readFile(path)).equals(bytes)) return false; }
  catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
  await mkdir(dirname(path), { recursive: true });
  const temporary = join(dirname(path), `.${basename(path)}.${randomUUID()}.tmp`);
  try {
    const file = await open(temporary, 'wx');
    try { await file.writeFile(bytes); await file.sync(); }
    finally { await file.close(); }
    // Same-directory rename publishes one complete PNG. Never remove the old file first.
    await rename(temporary, path);
  } finally { await rm(temporary, { force: true }); }
  return true;
}
