/* @flow */

export function multiply(n : number, m : number) : number {
    return n * m;
}

export function sleep(time : number) {

    if (process.env.TRAVIS) {
        return;
    }

    let start = Date.now();

    while ((Date.now() - start) < time) {
        // pass
    }
}
