/* @flow */

import uuidv4 from 'uuid/v4';

import type { NodeProcess, AnyProcess, Handler, Cancelable } from '../types';
import { MESSAGE_TYPE, MESSAGE_STATUS, BUILTIN_MESSAGE, ENV_FLAG } from '../conf';

import { serializeObject, deserializeObject } from './serialization';

export function isWorker() : boolean {
    return Boolean(process.env[ENV_FLAG.PROCESS_ROBOT_WORKER]);
}

const requestListeners = new Map();
const responseListeners = {};

function cancelListener(process : AnyProcess, name : string) {
    const nameRequestListeners = requestListeners.get(process);

    if (nameRequestListeners) {
        delete nameRequestListeners[name];
    }
}

export function listen<M : mixed, R : mixed>(proc : AnyProcess, name : string, handler : Handler<M, R>) : Cancelable {
    let nameRequestListeners = requestListeners.get(proc);

    if (!nameRequestListeners) {
        nameRequestListeners = {};
        requestListeners.set(proc, nameRequestListeners);
    }

    if (nameRequestListeners[name]) {
        throw new Error(`Listener already registered for process with name: "${ name }"`);
    }

    nameRequestListeners[name] = handler;

    return {
        cancel: () => cancelListener(proc, name)
    };
}

export type ListenFunctionType = typeof listen;

export async function send<M : mixed, R : mixed>(proc : AnyProcess | NodeProcess, name : string, message : M) : Promise<R> {

    if (!proc) {
        throw new Error(`Expected process to send message to`);
    }

    const uid = uuidv4();

    message = serializeObject(proc, message, listen);

    return await new Promise((resolve, reject) => {
        responseListeners[uid] = { resolve, reject };

        // $FlowFixMe
        proc.send({ type: MESSAGE_TYPE.REQUEST, uid, name, message });
    });
}

export type SendFunctionType = typeof send;

export function setupListener(proc : AnyProcess) {
    proc.on('message', async (msg) => {
        if (!msg || !msg.type) {
            return;
        }

        const { uid, name, type } = msg;

        if (type === MESSAGE_TYPE.REQUEST) {

            const nameListeners = requestListeners.get(proc);
            const handler = nameListeners && nameListeners[name];

            const { message } = msg;
            let response;

            try {
                if (!handler) {
                    throw new Error(`No handler found for message: ${ name } in ${ isWorker() ? 'worker' : 'master' } process ${ process.pid }\n\n${ JSON.stringify(msg, null, 4) }`);
                }

                response = await handler(deserializeObject(proc, message, send));

                // $FlowFixMe
                proc.send({ type: MESSAGE_TYPE.RESPONSE, status: MESSAGE_STATUS.SUCCESS, uid, name, response: serializeObject(proc, response, listen) });
                
            } catch (err) {

                // $FlowFixMe
                proc.send({ type: MESSAGE_TYPE.RESPONSE, status: MESSAGE_STATUS.ERROR, uid, name, error: err.stack || err.message });
            }

        } else if (type === MESSAGE_TYPE.RESPONSE) {

            const responseHandler = responseListeners[uid];

            if (!responseHandler) {
                throw new Error(`No response handler found for message: ${ name }, ${ uid }`);
            }

            const { resolve, reject } = responseHandler;

            const { status, response, error } = msg;

            if (status === MESSAGE_STATUS.SUCCESS) {
                resolve(deserializeObject(proc, response, send));
            } else if (status === MESSAGE_STATUS.ERROR) {
                reject(new Error(error));
            }
        }
    });

    listen(proc, BUILTIN_MESSAGE.IMPORT, name => {
        // $FlowFixMe
        return require(name); // eslint-disable-line security/detect-non-literal-require
    });
}

export function destroyListeners(proc : AnyProcess) {
    if (requestListeners.has(proc)) {
        requestListeners.delete(proc);
    }
}
