/* @flow */

import { spawnProcessPool } from '../src';

test(`Should run several process tasks in parallel`, async () => {

    let worker = spawnProcessPool({ script: require.resolve('./child') });

    let start = Date.now();

    let numTasks = 5;
    let timeTasks = 2;
    let expectedTime = numTasks * timeTasks * 1000;

    await Promise.all(new Array(numTasks).fill(true).map(async () => {
        await worker.send('sleep', { time: timeTasks });
    }));

    let elapsed = Date.now() - start;

    if (elapsed > expectedTime) {
        throw new Error(`Parallel tasks took ${ elapsed }ms, expected to complete in <${ expectedTime }`);
    }

    worker.kill();

}, 50000);

test(`Should successfully require a file and call a function`, async () => {

    let worker = spawnProcessPool();

    let { multiply } = await worker.import(require.resolve('./exports'));

    let result = await multiply(5, 7);

    if (result !== 35) {
        throw new Error(`Expected result to be 35, got ${ result }`);
    }

    worker.kill();

});

test(`Should run several process tasks in parallel using a require`, async () => {

    let worker = spawnProcessPool();

    let { sleep } = await worker.import(require.resolve('./exports'));

    let start = Date.now();

    let numTasks = 5;
    let timeTasks = 2;
    let expectedTime = numTasks * timeTasks * 1000;

    await Promise.all(new Array(numTasks).fill(true).map(async () => {
        await sleep(timeTasks);
    }));

    let elapsed = Date.now() - start;

    if (elapsed > expectedTime) {
        throw new Error(`Parallel tasks took ${ elapsed }ms, expected to complete in <${ expectedTime }`);
    }

    worker.kill();

}, 50000);


test(`Should successfully require a file using the shorthand and call a function`, async () => {

    let { multiply } = await spawnProcessPool.import(require.resolve('./exports'));

    let result = await multiply(5, 7);

    if (result !== 35) {
        throw new Error(`Expected result to be 35, got ${ result }`);
    }

    multiply.__pool__.kill();
});
