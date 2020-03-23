/* @flow */

import { attachProcess } from '../src';

import { sleep } from './exports';

const childProcess = attachProcess();

// $FlowFixMe
childProcess.on('send', async ({ name, message }) => {
    message.pid = process.pid;
    return await childProcess.send(name, message);
});

// $FlowFixMe
childProcess.on('listen', ({ name, handler }) => {
    childProcess.on(name, async (message) => {
        const response = await handler(message);
        response.pid = process.pid;
        return response;
    });
});

childProcess.on('call', async (method) => {
    // $FlowFixMe
    return await method();
});

// $FlowFixMe
childProcess.on('sleep', ({ time }) => {
    sleep(time);
});

// $FlowFixMe
childProcess.on('reattach', () => {
    const childProcess1 = attachProcess();
    const childProcess2 = attachProcess();

    if (childProcess1 !== childProcess2) {
        throw new Error(`Expected attachProcess to return the same thing every time`);
    }
});
