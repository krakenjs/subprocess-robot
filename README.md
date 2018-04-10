SubProcess Robot
----------------

Create subprocesses and deal with messaging. Good for delegating tasks to a differnet process

### Import a function and run it using a child process

Before:

```javascript
import { slowSynchronousTask } from './synchronous-tasks';

export function synchronousTask(options) {
    return slowSynchronousTask(options);
}
```

After:

```javascript
import { spawnProcess } from 'subprocess-robot';

export async function asynchronousTask(options) {
    const { slowSynchronousTask } =
        await spawnProcess.import(require.resolve('./synchronous-tasks'));

    return await slowSynchronousTask(options);
}
```

### Load balance your task between a pool of processes

Before:

```javascript
import { slowSynchronousTask } from './synchronous-tasks';

export function synchronousTask(options) {
    return slowSynchronousTask(options);
}
```

After:

```javascript
import { spawnProcessPool } from 'subprocess-robot';

export async function asynchronousTask(options) {
    const { slowSynchronousTask } =
        await spawnProcessPool.import(require.resolve('./synchronous-tasks'));

    return await slowSynchronousTask(options);
}
```

### Manually create a subprocess and send messages between

Parent process:

```javascript
import { spawnProcess } from 'subprocess-robot';

const childProcess = spawnProcess({
    script: require.resolve('./child')
});

childProcess.on('getUser', ({ id ) => {
    return {
        id,
        name: 'Daniel',
        logout() {
            // log the user out
        }
    }
});
```

Child process:

```javascript
import { attachProcess } from 'subprocess-robot';

const parentProcess = attachProcess();

let user = await parentProcess.send('getUser', { id: 1337 });

console.log(`Logging ${ user.name } out`);
await user.logout();
```

### Create a pool of processes and delegate tasks

Parent process:

```javascript
import { spawnProcessPool } from 'subprocess-robot';

const childProcessPool = spawnProcessPool({
    script: require.resolve('./child')
});

let result = childProcessPool.send('do_some_blocking_task', data);
```

Child process:

```javascript
import { attachProcess } from 'subprocess-robot';

const parentProcess = attachProcess();

parentProcess.on('do_some_blocking_task', data => {
    return slowSynchronousCompile(data);
})
```

### Manually create a pool of processes and import a function

Parent process:

```javascript
import { spawnProcessPool } from 'subprocess-robot';

const childProcessPool = spawnProcessPool();

let { doSomeBlockingTask } = await childProcessPool.import(require.resolve('./blockingTask'));

let result = await doSomeBlockingTask(config);
```

Child process:

```javascript
export function doSomeBlockingTask(config) {
    return slowSynchronousCompile(config);
}
```

## Quick Start

```bash
npm install --save subprocess-robot
```

### Tests

- Run the tests:

  ```bash
  npm test
  ```

