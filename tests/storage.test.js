import test from "node:test";
import assert from "node:assert/strict";
import "fake-indexeddb/auto";
import { initialState } from "../src/model.js";
import { writeSave, readSave } from "../src/storage.js";

test("transactional saves, backup recovery and separate final checkpoint", async () => {
  const state = initialState();
  state.started = true;
  await writeSave(state);
  state.x = 777;
  await writeSave(state);
  assert.equal((await readSave()).x, 777);
  assert.equal((await readSave("backup")).x, 540);
  await writeSave(state, "before-ending");
  const connection = await new Promise((resolve, reject) => {
    const request = indexedDB.open("great-little-world", 2);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  await new Promise((resolve, reject) => {
    const tx = connection.transaction("saves", "readwrite");
    tx.objectStore("saves").put({ version: 3, quest: "broken" }, "main");
    tx.oncomplete = resolve;
    tx.onerror = reject;
  });
  assert.equal(
    (await readSave()).x,
    540,
    "corrupt main falls back to prior valid save",
  );
  await assert.rejects(writeSave({ ...state, x: NaN }));
  assert.equal(
    (await readSave()).x,
    540,
    "invalid new state cannot overwrite backup",
  );
  await writeSave({ ...state, x: 888 });
  assert.equal((await readSave()).x, 888);
  assert.equal(
    (await readSave("backup")).x,
    540,
    "corrupt state is never backed up",
  );
  assert.equal((await readSave("before-ending")).x, 777);
  connection.close();
});
