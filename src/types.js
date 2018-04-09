/* @flow */

export type Cancelable = {
    cancel : () => void
};

export type AnyProcess = Process | child_process$ChildProcess;

export type Handler<M : mixed, R : mixed> = (M) => (Promise<R> | R);

export type SpawnedProcess = {
    on : <M : mixed, R : mixed>(name : string, handler : Handler<M, R>) => Cancelable,
    once : <M : mixed>(name : string) => Promise<M>,
    send : <M : mixed, R : mixed>(name : string, message : M) => Promise<R>,
    import : <T : Object>(name : string) => Promise<T>,
    kill : () => void
};
