import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { workspacePath } from '../src/action-path.js';
import { safeError } from '../src/errors.js';

test('action paths reject traversal, metadata paths, absolute paths and output-file injection', async () => {
  const root = await mkdtemp(join(tmpdir(), 'steam-path-test-'));
  try {
    assert.equal(await workspacePath(root, 'assets/card.png'), join(root, 'assets/card.png'));
    for (const input of ['../card.png', '.git/card.png', 'a/../../card.png', root, 'assets/card.png\nchanged=true']) {
      await assert.rejects(workspacePath(root, input), /paths/);
    }
  } finally { await rm(root, { recursive: true, force: true }); }
});

test('top-level errors redact plain and URL-encoded secrets', () => {
  const secret = 'key+with/slash';
  const result = safeError(new Error(`${secret}: ${encodeURIComponent(secret)}`), secret);
  assert.equal(result, '[redacted]: [redacted]');
});
