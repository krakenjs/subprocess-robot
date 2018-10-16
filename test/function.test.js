/* @flow */

import { spawnProcess } from '../src';

test(`Should successfully call a function on a different process`, async () => {

    const worker = spawnProcess({ script: require.resolve('./child') });

    let called = false;

    await worker.send('call', () => {
        called = true;
    });

    if (!called) {
        throw new Error(`Expected function to be called`);
    }

    worker.kill();
});
