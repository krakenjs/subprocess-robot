import { attachProcess } from "../src";

const childProcess = attachProcess();

childProcess.on("call", async (method: () => void) => {
  return await method();
});
