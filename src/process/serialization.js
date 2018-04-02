/* @flow */

import uuidv4 from 'uuid/v4';

import { SERIALIZATION_TYPE, BUILTIN_MESSAGE } from '../conf';
import { replaceObject } from '../lib';
import type { AnyProcess } from '../types';

import type { ListenFunctionType, SendFunctionType } from './process';

let serializedMethods = {};
let methodListeners = new WeakMap();

function listenForMethodCalls(origin, listen) {
    if (!methodListeners.has(origin)) {
        methodListeners.set(origin, listen(process, BUILTIN_MESSAGE.METHOD_CALL, async ({ uid, args }) => {
            let { method, process } = serializedMethods[uid];
            if (origin !== process) {
                throw new Error(`Recieved request for method from wrong processs`);
            }
            return await method(...args);
        }));
    }
}

export function serializeMethods<T : mixed>(destination : AnyProcess, obj : T, listen : ListenFunctionType) : T {
    return replaceObject(obj, (item) => {
        if (typeof item === 'function') {
            let uid = uuidv4();
            serializedMethods[uid] = { process, method: item };
            listenForMethodCalls(destination, listen);

            return {
                __type__: SERIALIZATION_TYPE.METHOD,
                __uid__:  uid
            };
        }
    });
}

export function deserializeMethods<T : mixed>(origin : AnyProcess, obj : T, send : SendFunctionType) : T {
    return replaceObject(obj, (item) => {
        if (item && item.__type__ === SERIALIZATION_TYPE.METHOD) {
            // $FlowFixMe
            let uid = item.__uid__;
            return async function processMessageWrapper<A : Array<mixed>, R : mixed > (...args : A) : R {
                // $FlowFixMe
                return await send(origin, BUILTIN_MESSAGE.METHOD_CALL, { uid, args });
            };
        }
    });
}
