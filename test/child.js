/* @flow */

import { sleep } from 'sleep';

import { attachProcess } from '../src';

let childProcess = attachProcess();

childProcess.on('send', async ({ name, message }) => {
    message.pid = process.pid;
    return await childProcess.send(name, message);
});

childProcess.on('listen', ({ name, handler }) => {
    childProcess.on(name, async (message) => {
        let response = await handler(message);
        response.pid = process.pid;
        return response;
    });
});

childProcess.on('call', async (method) => {
    return await method();
});

childProcess.on('sleep', ({ time }) => {
    sleep(time);
});

childProcess.on('reattach', () => {
    let childProcess1 = attachProcess();
    let childProcess2 = attachProcess();

    if (childProcess1 !== childProcess2) {
        throw new Error(`Expected attachProcess to return the same thing every time`);
    }
});
