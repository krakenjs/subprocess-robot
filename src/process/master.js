/* @flow */

import { spawn } from 'child_process';

import { NODE_PATH, ENV_FLAG, BUILTIN_MESSAGE } from '../conf';
import { replaceObject } from '../lib';
import type { AnyProcess, Handler, SpawnedProcess, Cancelable } from '../types';

import { listen, send, setupListener, destroyListeners, errorListeners } from './process';

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
    const onDisconnectHandlers = [];
    const onErrorHandlers = [];
    const onCloseHandlers = [];

    script = script || DEFAULT_WORKER_SCRIPT;

    const worker = spawn(NODE_PATH, [ '--require', '@babel/register', script ], {
        stdio: [ null, null, null, 'ipc' ],
        env:   {
            ...process.env,
            [ ENV_FLAG.BABEL_DISABLE_CACHE ]:  '1',
            [ ENV_FLAG.PROCESS_ROBOT_WORKER ]: '1'
        }
    });

    function processKill() {
        destroyListeners(worker);
        worker.kill();
    }

    const onDisconnect = () => {
        processKill();
        errorListeners(worker, 'Worker process disconnected');
        for (const handler of onDisconnectHandlers) {
            handler();
        }
    };

    const onError = (err) => {
        processKill();
        errorListeners(worker, err);
        for (const handler of onErrorHandlers) {
            handler(err);
        }
    };

    const onClose = () => {
        processKill();
        errorListeners(worker, 'Worker process closed');
        for (const handler of onCloseHandlers) {
            handler();
        }
    };

    worker.stdout.on('data', (data) => {
        process.stdout.write(data.toString());
    });

    worker.stderr.on('data', (data) => {
        process.stderr.write(data.toString());
    });

    setupListener(worker);

    worker.on('disconnect', onDisconnect);
    worker.on('error', onError);
    worker.on('uncaughtException', onError);
    worker.on('unhandledRejection', onError);
    worker.on('close', onClose);
    worker.on('exit', onClose);

    const readyPromise = listenWorkerOnce(worker, BUILTIN_MESSAGE.READY);
    listenWorkerOnce(worker, BUILTIN_MESSAGE.ERROR).then(onError);

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
                            // $FlowFixMe
                            func(...args),
                            parentMod[key](...args)
                        ]);
                        return childResult;
                    };
                }
            });

            mod.killProcess = processKill;
        }

        if (mod) {
            // eslint-disable-next-line no-use-before-define
            mod.__process__ = spawnedProcess;
        }

        return mod;
    }

    const processOnDisconnect = (handler) => {
        onDisconnectHandlers.push(handler);
    };

    const processOnError = (handler) => {
        onErrorHandlers.push(handler);
    };

    const processOnClose = (handler) => {
        onCloseHandlers.push(handler);
    };

    const spawnedProcess = {
        on:           processOn,
        once:         processOnce,
        send:         processSend,
        import:       processImport,
        kill:         processKill,
        onDisconnect: processOnDisconnect,
        onError:      processOnError,
        onClose:      processOnClose
    };

    return spawnedProcess;
}

const importProcesses = {};

spawnProcess.import = async function importProcess<T : Object>(name : string) : Promise<T & {| __process__ : SpawnedProcess |}> {
    if (importProcesses[name]) {
        return await importProcesses[name];
    }

    const process = spawnProcess();
    const importModulePromise = process.import(name);

    process.onDisconnect(() => {
        delete importProcesses[name];
    });

    importProcesses[name] = importModulePromise;
    let importModule;

    try {
        importModule = await importProcesses[name];
    } catch (err) {
        process.kill();
        delete importProcesses[name];
        throw err;
    }
    
    return importModule;
};
