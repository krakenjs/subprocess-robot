/* @flow */

import { spawnProcess } from "../src";

test(`Should successfully call a function on a different process`, async () => {
  const worker = spawnProcess({ script: require.resolve("./child") });

  let called = false;

  await worker.send("call", () => {
    called = true;
  });

  if (!called) {
    throw new Error(`Expected function to be called`);
  }

  worker.kill();
});

test(`Should successfully call a function on a different process with typescript`, async () => {
  const worker = spawnProcess({ script: require.resolve("./childTypescript") });

  let called = false;

  await worker.send("call", () => {
    called = true;
  });

  if (!called) {
    throw new Error(`Expected function to be called`);
  }

  worker.kill();
});

test("Should successfully call a function on a different process with `useTypeScriptRegister=true`", async () => {
  const worker = spawnProcess({
    script: require.resolve("./childTypescript"),
    useTypeScriptRegister: true,
  });

  let called = false;

  await worker.send("call", () => {
    called = true;
  });

  if (!called) {
    throw new Error(`Expected function to be called`);
  }

  worker.kill();
});
