/* @flow */

export type Cancelable = {
    cancel : () => void
};

export type AnyProcess = Process | child_process$ChildProcess;

export type Handler<M : mixed, R : mixed> = (M) => (Promise<R> | R);

export type SpawnedProcess = {
    on : <M : mixed, R : mixed>(name : string, handler : Handler<M, R>) => Cancelable,
    send : <M : mixed, R : mixed>(name : string, message : M) => Promise<R>,
    require : <T : Object>(name : string) => Promise<T>
};
