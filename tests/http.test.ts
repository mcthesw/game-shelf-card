import { test } from 'node:test';
import assert from 'node:assert/strict';
import { requestBytes, requestJson } from '../src/http.js';

const url = new URL('https://api.steampowered.com/test?key=SUPERSECRET');

test('transient failure retries with bounded backoff and succeeds', async () => {
  let count = 0;
  const waits: number[] = [];
  const result = await requestBytes(url, 'Steam test', async (_url, options) => {
    assert.equal(options?.redirect, 'error');
    count++;
    return count < 3 ? new Response('', { status: 429, headers: { 'retry-after': '10000' } }) : new Response('ok');
  }, async delay => { waits.push(delay); });
  assert.equal(result.bytes.toString(), 'ok');
  assert.deepEqual(waits, [5000, 5000]);
});

test('HTTP and network errors do not include keys or response bodies', async () => {
  await assert.rejects(requestBytes(url, 'Steam test', async () => new Response('SUPERSECRET', { status: 403 })),
    error => error instanceof Error && error.message === 'Steam test: HTTP 403.');
  await assert.rejects(requestBytes(url, 'Steam test', async () => { throw new Error(url.href); }, async () => {}),
    error => error instanceof Error && !error.message.includes('SUPERSECRET'));
  await assert.rejects(requestJson(url, 'Steam test', async () => new Response('invalid SUPERSECRET')),
    error => error instanceof Error && error.message === 'Steam test: invalid JSON response.');
});

test('response size is enforced even without a content-length header', async () => {
  await assert.rejects(requestBytes(url, 'Steam test', async () => new Response('too much data'), async () => {}, 3), /too large/);
});
