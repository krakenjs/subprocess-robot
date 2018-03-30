/* @flow */

import { cpus } from 'os';

import type { SpawnedProcess, Handler, Cancelable } from '../types';

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

    async function withProcess<T>(handler : (worker : SpawnedProcess) => Promise<T>) : Promise<T> {
        let pid = Object.keys(pool).sort((a, b) => (work[a] - work[b]))[0];
        work[pid] += 1;
        let result = await handler(pool[pid]);
        work[pid] -= 1;
        return result;
    }

    return {
        on: <M : mixed, R : mixed>(name : string, handler : Handler<M, R>) : Cancelable => {
            let listeners = pool.map(worker => worker.on(name, handler));

            return {
                cancel: () => listeners.forEach(listener => listener.cancel())
            };
        },
        async send<M : mixed, R : mixed>(name : string, message : M) : Promise<R> {
            return await withProcess(async (worker) => await worker.send(name, message));
        },
        async require<T : Object> (name : string) : Promise<T> {
            return await withProcess(async (worker) => await worker.require(name));
        }
    };
}
