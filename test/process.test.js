/* @flow */

import { spawnProcess } from "../src";

test(`Should successfully set up a process and recieve a message`, async () => {
  const worker = spawnProcess({ script: require.resolve("./child") });

  // $FlowFixMe
  const listener = new Promise((resolve) => worker.on("hello", resolve));

  await worker.send("send", {
    name: "hello",
    message: { foo: "bar" },
  });

  const message = await listener;

  if (!message) {
    throw new Error(`Expected hello message from child process`);
  }

  if (!message.foo === "bar") {
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
  const worker = spawnProcess({ script: require.resolve("./child") });

  const listener = worker.once("hello");

  await worker.send("send", {
    name: "hello",
    message: { foo: "bar" },
  });

  const message = await listener;

  if (!message) {
    throw new Error(`Expected hello message from child process`);
  }

  if (!message.foo === "bar") {
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
    await worker.send("send", {
      name: "hello",
      message: { foo: "bar" },
    });
  } catch (err) {
    error = err;
  }

  if (!error) {
    throw new Error(
      `Expected message send to fail a second time for once handler`
    );
  }

  worker.kill();
});

test(`Should successfully set up a process and send/receive a message`, async () => {
  const worker = spawnProcess({ script: require.resolve("./child") });

  await worker.send("listen", {
    name: "ping",
    handler: (message) => {
      if (!message || message.type !== "ping") {
        throw new Error(`Expected message.type to be ping`);
      }

      return { type: "pong" };
    },
  });

  const response = await worker.send("ping", { type: "ping" });

  if (!response || response.type !== "pong") {
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
  const worker = spawnProcess();

  const { multiply } = await worker.import(require.resolve("./exports"));

  const result = await multiply(5, 7);

  if (result !== 35) {
    throw new Error(`Expected result to be 35, got ${result}`);
  }

  worker.kill();
});

test(`Should message a process and handle an error`, async () => {
  const worker = spawnProcess({ script: require.resolve("./child") });

  await worker.send("listen", {
    name: "error",
    handler: () => {
      throw new Error(`Something went wrong`);
    },
  });

  let error;

  try {
    await worker.send("error");
  } catch (err) {
    error = err;
  }

  if (!error) {
    throw new Error(`Expected error to propagate back from handler`);
  }

  worker.kill();
});

test(`Should call attachProcess multiple times`, async () => {
  const worker = spawnProcess({ script: require.resolve("./child") });

  await worker.send("reattach");

  worker.kill();
});

test(`Should successfully require a file using the shorthand and call a function`, async () => {
  // $FlowFixMe
  const { multiply, killProcess } = await spawnProcess.import(
    require.resolve("./exports")
  );

  const result = await multiply(5, 7);

  if (result !== 35) {
    throw new Error(`Expected result to be 35, got ${result}`);
  }

  killProcess();
});

test(`Should successfully serialize and deserialize an error`, async () => {
  const worker = spawnProcess({ script: require.resolve("./child") });

  const err = new Error("Something went wrong");
  // $FlowFixMe
  err.code = "SOMETHING_WENT_WRONG";

  // $FlowFixMe
  const listener = new Promise((resolve) => worker.on("hello", resolve));

  await worker.send("send", {
    name: "hello",
    message: { err },
  });

  const message = await listener;

  if (!message) {
    throw new Error(`Expected hello message from child process`);
  }

  if (!message.err) {
    throw new Error(`Expected message to contain err`);
  }

  if (!(message.err instanceof Error)) {
    throw new TypeError(`Expected err to be instance of Error`);
  }

  // $FlowFixMe
  if (!message.err.code) {
    throw new Error(`Expected error to have a code`);
  }

  // $FlowFixMe
  if (message.err.code !== err.code) {
    throw new Error(`Expected code to match`);
  }

  worker.kill();
});
