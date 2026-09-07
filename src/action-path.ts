import { isAbsolute, relative, resolve, sep } from 'node:path';
import { lstat } from 'node:fs/promises';

export async function workspacePath(workspace: string, input: string): Promise<string> {
  if (!input || /[\r\n\0]/.test(input) || isAbsolute(input)) throw new Error('Action paths must be relative to the checked-out repository.');
  const root = resolve(workspace);
  const path = resolve(root, input);
  const rel = relative(root, path);
  if (!rel || rel.startsWith(`..${sep}`) || rel === '..' || isAbsolute(rel)
    || rel.split(sep).some(part => part.toLowerCase() === '.git')) {
    throw new Error('Action paths must stay inside the repository and outside .git.');
  }
  let current = root;
  for (const part of rel.split(sep)) {
    current = resolve(current, part);
    try {
      if ((await lstat(current)).isSymbolicLink()) throw new Error('Action paths must not contain symbolic links.');
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
    }
  }
  return path;
}
