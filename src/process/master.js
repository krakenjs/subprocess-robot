/* @flow */

import { spawn } from 'child_process';

import { NODE_PATH, ENV_FLAG, BUILTIN_MESSAGE } from '../conf';
import type { AnyProcess, Handler, SpawnedProcess, Cancelable } from '../types';

import { listen, send, setupListener } from './process';

const DEFAULT_WORKER_SCRIPT = require.resolve('./worker');

export function listenWorker<M : mixed, R : mixed>(worker : AnyProcess, name : string, handler : Handler<M, R>) : Cancelable {
    return listen(worker, name, handler);
}

export function listenWorkerOnce<M : mixed>(worker : AnyProcess, name : string) : Promise<M> {
    return new Promise(resolve => {
        let listener = listenWorker(worker, name, message => {
            listener.cancel();
            resolve(message);
        });
    });
}

export function messageWorker<M : mixed, R : mixed>(worker : AnyProcess, name : string, message : M) : Promise<R> {
    return send(worker, name, message);
}

type SpawnOptions = {
    script? : string
};

export function spawnProcess({ script } : SpawnOptions = {}) : SpawnedProcess {

    script = script || DEFAULT_WORKER_SCRIPT;

    let worker = spawn(NODE_PATH, [ '--require', 'babel-register', script ], {
        stdio: [ null, null, null, 'ipc' ],
        env:   {
            ...process.env,
            [ ENV_FLAG.BABEL_DISABLE_CACHE ]:  '1',
            [ ENV_FLAG.PROCESS_ROBOT_WORKER ]: '1'
        }
    });

    worker.stdout.on('data', (data) => {
        process.stdout.write(data.toString());
    });

    worker.stderr.on('data', (data) => {
        process.stderr.write(data.toString());
    });

    setupListener(worker);

    let readyPromise = listenWorkerOnce(worker, BUILTIN_MESSAGE.READY);

    function processOn <M : mixed, R : mixed>(name : string, handler : Handler<M, R>) : Cancelable {
        return listenWorker(worker, name, handler);
    }

    async function processSend<M : mixed, R : mixed>(name : string, message : M) : Promise<R> {
        await readyPromise;
        return await messageWorker(worker, name, message);
    }

    let requireCache = {};

    async function processRequire <T : Object>(name : string) : Promise<T> {
        await readyPromise;

        if (!requireCache[name]) {
            requireCache[name] = messageWorker(worker, BUILTIN_MESSAGE.REQUIRE, name);
        }

        return await requireCache[name];
    }

    function processKill() {
        worker.kill();
    }

    return {
        on:      processOn,
        send:    processSend,
        require: processRequire,
        kill:    processKill
    };
}
