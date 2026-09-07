import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const root = new URL('../docs/previews/', import.meta.url);
const files = new Set(['index.html', 'dark-en.png', 'light-en.png', 'dark-zh-CN.png', 'light-zh-CN.png']);
const server = createServer(async (request, response) => {
  const name = (request.url ?? '/').split('?')[0].slice(1) || 'index.html';
  if (!files.has(name)) { response.writeHead(404).end(); return; }
  try {
    const bytes = await readFile(fileURLToPath(new URL(name, root)));
    response.writeHead(200, { 'Content-Type': name.endsWith('.png') ? 'image/png' : 'text/html; charset=utf-8',
      'Cache-Control': 'no-store' });
    response.end(bytes);
  } catch { response.writeHead(404).end('Run npm run demo:all first.'); }
});
server.listen(4178, '127.0.0.1', () => console.log('Preview: http://127.0.0.1:4178'));
