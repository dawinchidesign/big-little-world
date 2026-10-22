import { migrateSave } from "./model.js";

let dbPromise;
function db() {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      if (!globalThis.indexedDB) return reject(Error("IndexedDB unavailable"));
      const request = indexedDB.open("great-little-world", 2);
      const timer = setTimeout(
        () => reject(Error("Save database unavailable")),
        5000,
      );
      request.onupgradeneeded = () => {
        if (!request.result.objectStoreNames.contains("saves"))
          request.result.createObjectStore("saves");
      };
      request.onsuccess = () => {
        clearTimeout(timer);
        const connection = request.result;
        connection.onversionchange = () => {
          connection.close();
          dbPromise = null;
        };
        resolve(connection);
      };
      request.onerror = () => {
        clearTimeout(timer);
        reject(request.error);
      };
      request.onblocked = () => {
        clearTimeout(timer);
        reject(Error("Close the other game tab to upgrade saves"));
      };
    }).catch((error) => {
      dbPromise = null;
      throw error;
    });
  }
  return dbPromise;
}

export async function readSave(slot = "main") {
  const connection = await db();
  return new Promise((resolve, reject) => {
    const store = connection.transaction("saves").objectStore("saves");
    const request = store.get(slot);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      try {
        if (request.result) return resolve(migrateSave(request.result));
        if (slot !== "main") return resolve(null);
      } catch (error) {
        if (slot !== "main") return reject(error);
      }
      const backup = store.get("backup");
      backup.onerror = () => reject(backup.error);
      backup.onsuccess = () => {
        try {
          resolve(backup.result ? migrateSave(backup.result) : null);
        } catch (error) {
          reject(error);
        }
      };
    };
  });
}

export async function writeSave(state, slot = "main") {
  // Validate before touching the last usable save. Both slots commit atomically.
  const snapshot = migrateSave(JSON.parse(JSON.stringify(state)));
  snapshot.savedAt = new Date().toISOString();
  const connection = await db();
  return new Promise((resolve, reject) => {
    const tx = connection.transaction("saves", "readwrite");
    const store = tx.objectStore("saves");
    if (slot === "main") {
      const previous = store.get("main");
      previous.onsuccess = () => {
        try {
          if (previous.result)
            store.put(migrateSave(previous.result), "backup");
        } catch {
          /* Keep the valid backup if the main slot was damaged. */
        }
        store.put(snapshot, slot);
      };
    } else store.put(snapshot, slot);
    tx.oncomplete = () => resolve(true);
    tx.onerror = tx.onabort = () =>
      reject(tx.error || Error("Save transaction aborted"));
  });
}
