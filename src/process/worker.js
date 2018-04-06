/* @flow */

import { BUILTIN_MESSAGE } from '../conf';
import { memoize } from '../lib';
import type { Cancelable, Handler } from '../types';

import { listen, send, setupListener, isWorker } from './process';

export function listenMaster<M : mixed, R : mixed>(name : string, handler : Handler<M, R>) : Cancelable {

    if (!isWorker) {
        throw new Error(`Can only listen to master from worker process`);
    }

    return listen(process, name, handler);
}

export function messageMaster<M : mixed, R : mixed>(name : string, message : M) : Promise<R> {

    if (!isWorker) {
        throw new Error(`Can only message master from worker process`);
    }

    return send(process, name, message);
}

type AttachProcess = {
    on : <M : mixed, R : mixed>(name : string, handler : Handler<M, R>) => Cancelable,
    send : <M : mixed, R : mixed>(name : string, message : M) => Promise<R>
};

export let attachProcess = memoize(() : AttachProcess => {

    if (!isWorker) {
        throw new Error(`Can only attach from worker process`);
    }

    setupListener(process);
    messageMaster(BUILTIN_MESSAGE.READY);

    return {
        on:   <M : mixed, R : mixed>(name : string, handler : Handler<M, R>) => listenMaster(name, handler),
        send: <M : mixed, R : mixed>(name : string, message : M) : Promise<R> => messageMaster(name, message)
    };
});

if (isWorker()) {
    attachProcess();
}
