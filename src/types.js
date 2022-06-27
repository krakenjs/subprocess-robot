/* @flow */

// eslint-disable-next-line flowtype/require-exact-type
export type Cancelable = {
  cancel: () => void,
};

export type NodeProcess = Process; // eslint-disable-line no-undef
export type ChildProcess = child_process$ChildProcess; // eslint-disable-line no-undef

export type AnyProcess = NodeProcess | ChildProcess;

export type Handler<M: mixed, R: mixed> = (M) => Promise<R> | R;

export type SpawnedProcess = {|
  on: <M: mixed, R: mixed>(name: string, handler: Handler<M, R>) => Cancelable, // eslint-disable-line no-undef
  once: <M: mixed>(name: string) => Promise<M>, // eslint-disable-line no-undef
  send: <M: mixed, R: mixed>(name: string, message: M) => Promise<R>, // eslint-disable-line no-undef
  // eslint-disable-next-line no-undef
  import: <T: Object>(
    name: string
  ) => Promise<T & {| __process__: SpawnedProcess |}>, // eslint-disable-line no-undef
  kill: () => void,
  onDisconnect: (() => void) => void,
  onClose: (() => void) => void,
  onError: ((mixed) => void) => void,
|};
