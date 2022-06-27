/* @flow */

import { cpus } from "os";

import type { SpawnedProcess, Handler, Cancelable } from "../types";
import { replaceObject, values } from "../lib";

import { spawnProcess } from "./master";

type SpawnPoolOptions = {|
  script?: string,
  count?: number,
|};

export function spawnProcessPool({
  script,
  count = cpus().length,
}: SpawnPoolOptions = {}): SpawnedProcess {
  if (count < 1) {
    throw new Error(`Can not create process pool with less than 1 process`);
  }

  const pool = {};
  const work = {};

  for (let i = 0; i < count; i++) {
    pool[i] = spawnProcess({ script });
    work[i] = 0;
  }

  async function loadBalance<T>(
    handler: (worker: SpawnedProcess) => Promise<T>
  ): Promise<T> {
    const pid = Object.keys(pool).sort((a, b) => work[a] - work[b])[0];
    work[pid] += 1;
    let result;

    try {
      result = await handler(pool[pid]);
    } catch (err) {
      work[pid] -= 1;
      throw err;
    }

    work[pid] -= 1;
    return result;
  }

  async function loadBalanceImport<T>(path: string): Promise<T> {
    return await loadBalance(async (worker) => await worker.import(path));
  }

  function processPoolOn<M: mixed, R: mixed>(
    name: string,
    handler: Handler<M, R>
  ): Cancelable {
    const listeners = values(pool).map((worker) => worker.on(name, handler));

    return {
      cancel: () => listeners.forEach((listener) => listener.cancel()),
    };
  }

  function processPoolOnce<M: mixed>(name: string): Promise<M> {
    return new Promise((resolve) => {
      const listener = processPoolOn(name, (message) => {
        listener.cancel();
        resolve(message);
      });
    });
  }

  async function processPoolSend<M: mixed, R: mixed>(
    name: string,
    message: M
  ): Promise<R> {
    return await loadBalance(
      async (worker) => await worker.send(name, message)
    );
  }

  function processPoolKill() {
    values(pool).forEach((worker) => worker.kill());
  }

  const processPoolImportCache = {};

  async function processPoolImport<T: Object>(name: string): Promise<T> {
    if (processPoolImportCache[name]) {
      return processPoolImportCache[name];
    }

    processPoolImportCache[name] = loadBalanceImport(name).then(
      (childModule) => {
        childModule = replaceObject(childModule, (item, key) => {
          if (typeof item === "function") {
            const importWrapper = async function processImportWrapper<
              A: mixed,
              R: mixed
            >(...args: $ReadOnlyArray<A>): Promise<R> {
              const loadBalanceModule = await loadBalanceImport(name);
              return await loadBalanceModule[key](...args);
            };
            return importWrapper;
          }
        });

        childModule.killProcessPool = processPoolKill;
        return childModule;
      }
    );

    return await processPoolImportCache[name];
  }

  const eventHandler = () => {
    throw new Error(`Not implemented`);
  };

  return {
    on: processPoolOn,
    once: processPoolOnce,
    send: processPoolSend,
    import: processPoolImport,
    kill: processPoolKill,
    onDisconnect: eventHandler,
    onClose: eventHandler,
    onError: eventHandler,
  };
}

const importPoolProcesses = {};

spawnProcessPool.import = async function importProcessPool<T: Object>(
  name: string
): Promise<T> {
  if (importPoolProcesses[name]) {
    return await importPoolProcesses[name];
  }
  const pool = spawnProcessPool();
  importPoolProcesses[name] = pool.import(name);
  return await importPoolProcesses[name];
};
