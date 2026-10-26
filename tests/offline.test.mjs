import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFile } from 'node:fs/promises';

const source = await readFile(new URL('../sw.js', import.meta.url), 'utf8');

function worker(scopePath = '/weektable/', failFile = '') {
  const scope = `https://example.test${scopePath}`;
  const listeners = {}, stores = new Map();
  let offline = false, activated = false;
  const network = async input => {
    const url = String(typeof input === 'string' ? input : input.url);
    if (offline || (failFile && url.endsWith(failFile))) throw new TypeError('Network unavailable');
    if (url.endsWith('offline-assets.json')) return new Response(JSON.stringify({ assets: ['./assets/plate.svg'] }));
    return new Response(`saved:${new URL(url).pathname}`);
  };
  function createCache() {
    const entries = new Map();
    const key = input => String(typeof input === 'string' ? input : input.url);
    return {
      async add(input) { entries.set(key(input), await network(input)); },
      async addAll(inputs) { await Promise.all(inputs.map(async item => entries.set(key(item), await network(item)))); },
      async match(input, options = {}) {
        const value = key(input);
        const normalized = options.ignoreSearch ? value.split('?')[0] : value;
        for (const [stored, response] of entries) {
          if ((options.ignoreSearch ? stored.split('?')[0] : stored) === normalized) return response.clone();
        }
      },
      async put(input, response) { entries.set(key(input), response); }
    };
  }
  const caches = {
    async open(name) { if (!stores.has(name)) stores.set(name, createCache()); return stores.get(name); },
    async keys() { return [...stores.keys()]; },
    async delete(name) { return stores.delete(name); }
  };
  const self = { registration: { scope }, clients: { claim: async () => {} },
    skipWaiting: async () => { activated = true; }, addEventListener: (name, callback) => { listeners[name] = callback; } };
  vm.runInNewContext(source, { self, caches, fetch: network, URL, Promise, encodeURIComponent });
  return {
    stores, caches, get activated() { return activated; }, setOffline() { offline = true; },
    async run(name) { let pending; listeners[name]({ waitUntil(value) { pending = value; } }); await pending; },
    async fetch(path, mode = 'cors', method = 'GET') {
      let response;
      listeners.fetch({ request: { url: new URL(path, scope).href, method, mode }, respondWith(value) { response = value; } });
      return response;
    }
  };
}

test('a complete shell is available offline beneath a GitHub project subpath', async () => {
  const w = worker('/my-recipes/');
  await w.run('install');
  assert.equal(w.activated, true);
  w.setOffline();
  assert.equal(await (await w.fetch('./', 'navigate')).text(), 'saved:/my-recipes/index.html');
  for (const path of ['src/app.js', 'src/core.js', 'src/storage.js', 'src/styles.css', 'data/recipes.json', 'manifest.webmanifest']) {
    assert.equal(await (await w.fetch(path)).text(), `saved:/my-recipes/${path}`);
  }
});

test('cache cleanup preserves other apps and other repositories on the same origin', async () => {
  const w = worker('/my-recipes/');
  await w.caches.open('another-app-v1');
  await w.caches.open('weektable:%2Fother-repository%2F:old');
  await w.caches.open('weektable:%2Fmy-recipes%2F:old');
  await w.run('install');
  await w.run('activate');
  const keys = await w.caches.keys();
  assert(keys.includes('another-app-v1'));
  assert(keys.includes('weektable:%2Fother-repository%2F:old'));
  assert(!keys.includes('weektable:%2Fmy-recipes%2F:old'));
});

test('a failed required file prevents the new worker from activating', async () => {
  const w = worker('/weektable/', 'src/core.js');
  await assert.rejects(w.run('install'), /Network unavailable/);
  assert.equal(w.activated, false);
});

test('external photos, sibling repositories, and non-GET requests are not intercepted', async () => {
  const w = worker();
  await w.run('install');
  assert.equal(await w.fetch('https://images.example.test/dinner.jpg'), undefined);
  assert.equal(await w.fetch('/other-app/data.json'), undefined);
  assert.equal(await w.fetch('./data/recipes.json', 'cors', 'POST'), undefined);
});
