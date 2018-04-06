/* @flow */

import { spawnProcess } from '../src';

test(`Should successfully set up a process and recieve a message`, async () => {
    
    let worker = spawnProcess({ script: require.resolve('./child') });

    let listener = new Promise(resolve => worker.on('hello', resolve));

    await worker.send('send', {
        name:    'hello',
        message: { foo: 'bar' }
    });

    let message = await listener;

    if (!message) {
        throw new Error(`Expected hello message from child process`);
    }

    if (!message.foo === 'bar') {
        throw new Error(`Expected message to have foo property equal to bar`);
    }

    if (!message.pid) {
        throw new Error(`Expected child to pass pid`);
    }

    if (message.pid === process.pid) {
        throw new Error(`Expected child process to send different pid`);
    }

    worker.kill();
});

test(`Should successfully set up a process and recieve a message a single time`, async () => {

    let worker = spawnProcess({ script: require.resolve('./child') });

    let listener = worker.once('hello');

    await worker.send('send', {
        name:    'hello',
        message: { foo: 'bar' }
    });

    let message = await listener;

    if (!message) {
        throw new Error(`Expected hello message from child process`);
    }

    if (!message.foo === 'bar') {
        throw new Error(`Expected message to have foo property equal to bar`);
    }

    if (!message.pid) {
        throw new Error(`Expected child to pass pid`);
    }

    if (message.pid === process.pid) {
        throw new Error(`Expected child process to send different pid`);
    }

    let error;

    try {
        await worker.send('send', {
            name:    'hello',
            message: { foo: 'bar' }
        });
    } catch (err) {
        error = err;
    }

    if (!error) {
        throw new Error(`Expected message send to fail a second time for once handler`);
    }

    worker.kill();
});

test(`Should successfully set up a process and send/receive a message`, async () => {

    let worker = spawnProcess({ script: require.resolve('./child') });

    await worker.send('listen', {
        name:    'ping',
        handler: (message) => {
            if (!message || message.type !== 'ping') {
                throw new Error(`Expected message.type to be ping`);
            }

            return { type: 'pong' };
        }
    });

    let response = await worker.send('ping', { type: 'ping' });
    
    if (!response || response.type !== 'pong') {
        throw new Error(`Expected message.type to be pong`);
    }

    if (!response.pid) {
        throw new Error(`Expected child to pass pid`);
    }

    if (response.pid === process.pid) {
        throw new Error(`Expected child process to send different pid`);
    }

    worker.kill();
});

test(`Should successfully require a file and call a function`, async () => {

    let worker = spawnProcess();

    let { multiply } = await worker.require(require.resolve('./exports'));

    let result = await multiply(5, 7);

    if (result !== 35) {
        throw new Error(`Expected result to be 35, got ${ result }`);
    }

    worker.kill();

});


test(`Should message a process and handle an error`, async () => {

    let worker = spawnProcess({ script: require.resolve('./child') });

    await worker.send('listen', {
        name:    'error',
        handler: () => {
            throw new Error(`Something went wrong`);
        }
    });

    let error;

    try {
        await worker.send('error');
    } catch (err) {
        error = err;
    }

    if (!error) {
        throw new Error(`Expected error to propagate back from handler`);
    }

    worker.kill();
});

test(`Should call attachProcess multiple times`, async () => {

    let worker = spawnProcess({ script: require.resolve('./child') });

    await worker.send('reattach');
    
    worker.kill();
});
