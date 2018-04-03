/* @flow */

import { cpus } from 'os';

import type { SpawnedProcess, Handler, Cancelable } from '../types';
import { replaceObject } from '../lib';

import { spawnProcess } from './master';

type SpawnPoolOptions = {
    script? : string,
    count? : number
};

export function spawnProcessPool({ script, count = cpus().length } : SpawnPoolOptions = {}) : SpawnedProcess {

    if (count < 1) {
        throw new Error(`Can not create process pool with less than 1 process`);
    }

    let pool = {};
    let work = {};

    for (let i = 0; i < count; i++) {
        pool[i] = spawnProcess({ script });
        work[i] = 0;
    }

    async function loadBalance<T>(handler : (worker : SpawnedProcess) => Promise<T>) : Promise<T> {
        let pid = Object.keys(pool).sort((a, b) => (work[a] - work[b]))[0];
        work[pid] += 1;
        let result = await handler(pool[pid]);
        work[pid] -= 1;
        return result;
    }

    async function loadBalanceRequire<T>(path : string) : Promise<T> {
        return await loadBalance(async (worker) => await worker.require(path));
    }

    return {
        on: <M : mixed, R : mixed>(name : string, handler : Handler<M, R>) : Cancelable => {
            let listeners = pool.map(worker => worker.on(name, handler));

            return {
                cancel: () => listeners.forEach(listener => listener.cancel())
            };
        },
        async send<M : mixed, R : mixed>(name : string, message : M) : Promise<R> {
            return await loadBalance(async (worker) => await worker.send(name, message));
        },
        async require<T : Object> (name : string) : Promise<T> {
            let childModule = await loadBalanceRequire(name);

            return replaceObject(childModule, (item, key) => {
                if (typeof item === 'function') {
                    return async function processRequireWrapper<A : mixed, R : mixed>(...args : Array<A>) : Promise<R> {
                        let loadBalanceModule = await loadBalanceRequire(name);
                        return await loadBalanceModule[key](...args);
                    };
                }
            });
        },
        kill: () => {
            pool.forEach(worker => worker.kill());
        }
    };
}

 
