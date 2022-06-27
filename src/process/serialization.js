/* @flow */

import uuidv4 from "uuid/v4";

import { SERIALIZATION_TYPE, BUILTIN_MESSAGE } from "../conf";
import { replaceObject } from "../lib";
import type { AnyProcess } from "../types";

import type { ListenFunctionType, SendFunctionType } from "./process";

const serializedMethods = {};
const methodListeners = new WeakMap();

function listenForMethodCalls(origin, listen) {
  if (!methodListeners.has(origin)) {
    methodListeners.set(
      origin,
      listen(origin, BUILTIN_MESSAGE.METHOD_CALL, async ({ uid, args }) => {
        const { method, process } = serializedMethods[uid];
        if (origin !== process) {
          throw new Error(`Recieved request for method from wrong processs`);
        }
        return await method(...args);
      })
    );
  }
}

export function serializeObject<T: mixed>(
  destination: AnyProcess,
  obj: T,
  listen: ListenFunctionType
): T {
  return replaceObject({ obj }, (item) => {
    if (typeof item === "function") {
      const uid = uuidv4();
      serializedMethods[uid] = { process: destination, method: item };
      listenForMethodCalls(destination, listen);

      return {
        __type__: SERIALIZATION_TYPE.METHOD,
        __name__: item.name,
        __uid__: uid,
      };
    }

    if (item instanceof Error) {
      return {
        __type__: SERIALIZATION_TYPE.ERROR,
        __stack__: item.stack,
        // $FlowFixMe
        __code__: item.code,
      };
    }
  }).obj;
}

export function deserializeObject<T: mixed>(
  origin: AnyProcess,
  obj: T,
  send: SendFunctionType
): T {
  return replaceObject({ obj }, (item) => {
    if (item && item.__type__ === SERIALIZATION_TYPE.METHOD) {
      // $FlowFixMe
      const uid = item.__uid__;
      // $FlowFixMe
      const name = item.__name__;
      const processWrapperFunction = async function processMessageWrapper<
        A: $ReadOnlyArray<mixed>,
        R: mixed
      >(...args: A): R {
        // $FlowFixMe
        return await send(origin, BUILTIN_MESSAGE.METHOD_CALL, {
          uid,
          name,
          args,
        });
      };
      processWrapperFunction.__process__ = origin;
      return processWrapperFunction;
    }

    if (item && item.__type__ === SERIALIZATION_TYPE.ERROR) {
      // $FlowFixMe
      const err = new Error(item.__stack__);
      // $FlowFixMe
      err.code = item.__code__;
      return err;
    }
  }).obj;
}
