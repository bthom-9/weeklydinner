/** Large, device-local snapshots. Each deployed repository gets its own store. */
const scope = new URL('../', import.meta.url).pathname;
const DATABASE = `weektable:${scope}:v1`;
const STORE = 'snapshots';
const FALLBACK_KEY = `${DATABASE}:fallback`;
let databasePromise;
let queue = Promise.resolve();
let knownRevision = 0;

function openDatabase() {
  if (!('indexedDB' in globalThis)) return Promise.resolve(null);
  if (!databasePromise) databasePromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE);
    request.onsuccess = () => {
      const db = request.result;
      db.onversionchange = () => { db.close(); databasePromise = undefined; };
      resolve(db);
    };
    request.onerror = () => reject(new Error('Device storage is unavailable. Export a backup before leaving this page.'));
    request.onblocked = () => reject(new Error('Close other Weektable tabs and retry saving.'));
  });
  return databasePromise;
}

export async function readState() {
  const db = await openDatabase();
  if (!db) {
    const content = localStorage.getItem(FALLBACK_KEY);
    return content ? JSON.parse(content) : null;
  }
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE, 'readonly');
    const store = transaction.objectStore(STORE);
    const request = store.get('current');
    const revision = store.get('revision');
    transaction.oncomplete = () => {
      knownRevision = Number(revision.result) || 0;
      resolve(request.result ?? null);
    };
    transaction.onabort = () => reject(new Error('Could not read your saved data. Restore a backup if needed.'));
    transaction.onerror = () => {};
  });
}

export function writeState(value) {
  // Capture at call time; later UI edits cannot alter an in-flight write.
  const snapshot = structuredClone(value);
  const result = queue.catch(() => {}).then(async () => {
    const db = await openDatabase();
    if (!db) {
      try { localStorage.setItem(FALLBACK_KEY, JSON.stringify(snapshot)); }
      catch { throw new Error('Device storage is full or disabled. Your changes are still on screen: export a backup now.'); }
      return { backend: 'localStorage' };
    }
    await new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE, 'readwrite');
      const store = transaction.objectStore(STORE);
      const revision = store.get('revision');
      let conflict;
      let nextRevision;
      revision.onsuccess = () => {
        const currentRevision = Number(revision.result) || 0;
        if (currentRevision !== knownRevision) {
          conflict = new Error('Another Weektable tab saved newer changes. Export a backup of this tab, then reload before making more changes.');
          transaction.abort();
          return;
        }
        nextRevision = currentRevision + 1;
        store.put(snapshot, 'current');
        store.put(nextRevision, 'revision');
      };
      transaction.oncomplete = () => { knownRevision = nextRevision; resolve(); };
      transaction.onabort = () => reject(conflict || new Error('Your changes could not be saved on this device. Export a backup before closing the app.'));
      transaction.onerror = () => {}; // onabort supplies the actionable error once.
    });
    return { backend: 'indexedDB' };
  });
  queue = result;
  return result;
}

export function waitForPendingSave() { return queue; }

export async function requestPersistentStorage() {
  if (!navigator.storage?.persist) return false;
  try { return await navigator.storage.persist(); } catch { return false; }
}
