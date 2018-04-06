/* @flow */

import { sleep as _sleep } from 'sleep';

export function multiply(n : number, m : number) : number {
    return n * m;
}

export function sleep(time : number) {
    _sleep(time);
}
