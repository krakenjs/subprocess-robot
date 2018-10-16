/* @flow */

import { spawn } from 'child_process';

import { NODE_PATH, ENV_FLAG, BUILTIN_MESSAGE } from '../conf';
import { replaceObject } from '../lib';
import type { AnyProcess, Handler, SpawnedProcess, Cancelable } from '../types';

import { listen, send, setupListener, destroyListeners } from './process';

const DEFAULT_WORKER_SCRIPT = require.resolve('./worker');

export function listenWorker<M : mixed, R : mixed>(worker : AnyProcess, name : string, handler : Handler<M, R>) : Cancelable {
    return listen(worker, name, handler);
}

export function listenWorkerOnce<M : mixed>(worker : AnyProcess, name : string) : Promise<M> {
    return new Promise(resolve => {
        const listener = listenWorker(worker, name, message => {
            listener.cancel();
            resolve(message);
        });
    });
}

export function messageWorker<M : mixed, R : mixed>(worker : AnyProcess, name : string, message : M) : Promise<R> {
    return send(worker, name, message);
}

type SpawnOptions = {|
    script? : string
|};

export function spawnProcess({ script } : SpawnOptions = {}) : SpawnedProcess {

    script = script || DEFAULT_WORKER_SCRIPT;

    const worker = spawn(NODE_PATH, [ '--require', '@babel/register', script ], {
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

    const readyPromise = listenWorkerOnce(worker, BUILTIN_MESSAGE.READY);

    function processOn <M : mixed, R : mixed>(name : string, handler : Handler<M, R>) : Cancelable {
        return listenWorker(worker, name, handler);
    }

    function processOnce<M : mixed>(name : string) : Promise<M> {
        return listenWorkerOnce(worker, name);
    }

    async function processSend<M : mixed, R : mixed>(name : string, message : M) : Promise<R> {
        await readyPromise;
        return await messageWorker(worker, name, message);
    }

    function processKill() {
        destroyListeners(worker);
        worker.kill();
    }

    const importCache = {};

    async function processImport <T : Object>(name : string) : Promise<T> {
        await readyPromise;

        if (!importCache[name]) {
            importCache[name] = messageWorker(worker, BUILTIN_MESSAGE.IMPORT, name)
                .then(childModule => {
                    childModule.killProcess = processKill;
                    return childModule;
                });
        }

        let mod = await importCache[name];

        if (process.env.SUBPROCESS_ROBOT_DUPLICATE_IMPORT_IN_PARENT) {
            const parentMod = require(name); // eslint-disable-line security/detect-non-literal-require
            mod = replaceObject(mod, (item, key) => {
                if (typeof item === 'function') {
                    const func = item;
                    return async (...args) => {
                        const [ childResult ] = await Promise.all([
                            func(...args),
                            parentMod[key](...args)
                        ]);
                        return childResult;
                    };
                }
            });

            mod.killProcess = processKill;
        }

        return mod;
    }

    return {
        on:      processOn,
        once:    processOnce,
        send:    processSend,
        import:  processImport,
        kill:    processKill
    };
}

const importProcesses = {};

spawnProcess.import = async function importProcess<T : Object>(name : string) : Promise<T> {
    if (importProcesses[name]) {
        return await importProcesses[name];
    }
    const process = spawnProcess();
    importProcesses[name] = process.import(name);
    return await importProcesses[name];
};
