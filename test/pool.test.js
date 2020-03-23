/* @flow */

import { spawnProcessPool } from '../src';

test(`Should successfully require a file and call a function`, async () => {

    const worker = spawnProcessPool();

    const { multiply } = await worker.import(require.resolve('./exports'));

    const result = await multiply(5, 7);

    if (result !== 35) {
        throw new Error(`Expected result to be 35, got ${ result }`);
    }

    worker.kill();
}, 10000);

test(`Should successfully require a file using the shorthand and call a function`, async () => {

    // $FlowFixMe
    const { multiply, killProcessPool } = await spawnProcessPool.import(require.resolve('./exports'));

    const result = await multiply(5, 7);

    if (result !== 35) {
        throw new Error(`Expected result to be 35, got ${ result }`);
    }

    killProcessPool();
}, 10000);

if (!process.env.TRAVIS) {

    test(`Should run several process tasks in parallel`, async () => {

        const worker = spawnProcessPool({ script: require.resolve('./child') });

        const start = Date.now();

        const numTasks = 5;
        const timeTasks = 2;
        const expectedTime = numTasks * timeTasks * 1000;

        await Promise.all(new Array(numTasks).fill(true).map(async () => {
            await worker.send('sleep', { time: timeTasks });
        }));

        const elapsed = Date.now() - start;

        if (elapsed > expectedTime) {
            throw new Error(`Parallel tasks took ${ elapsed }ms, expected to complete in <${ expectedTime }`);
        }

        worker.kill();

    }, 50000);

    test(`Should run several process tasks in parallel using a require`, async () => {

        const worker = spawnProcessPool();

        const { sleep } = await worker.import(require.resolve('./exports'));

        const start = Date.now();

        const numTasks = 5;
        const timeTasks = 2;
        const expectedTime = numTasks * timeTasks * 1000;

        await Promise.all(new Array(numTasks).fill(true).map(async () => {
            await sleep(timeTasks);
        }));

        const elapsed = Date.now() - start;

        if (elapsed > expectedTime) {
            throw new Error(`Parallel tasks took ${ elapsed }ms, expected to complete in <${ expectedTime }`);
        }

        worker.kill();

    }, 50000);
}
