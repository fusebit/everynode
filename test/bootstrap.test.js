const createRuntimeApi = require("./runtime");
const Superagent = require("superagent");
const Path = require("path");
const spawn = require("child_process").spawn;

const itif = (condition) => (condition ? it : it.skip);
const major = +process.versions.node.split(".")[0];

const successResult = {
  method: "POST",
  path: "/2018-06-01/runtime/invocation/1234/response",
  headers: {
    "content-type": "application/json",
  },
  payload: {
    env: {
      _HANDLER: expect.stringContaining(".handler"),
      _X_AMZN_TRACE_ID: "Lambda-Runtime-Trace-Id",
    },
    event: {
      foo: "bar",
    },
    context: {
      deadlineMs: 5678,
      invokedFunctionArn: "Lambda-Runtime-Invoked-Function-Arn",
      awsRequestId: "1234",
    },
  },
};

const syncErrorResult = {
  method: "POST",
  path: "/2018-06-01/runtime/invocation/1234/error",
  headers: {
    "lambda-runtime-function-error-type": "Handler.Error",
    "content-type": "application/json",
  },
  payload: {
    errorMessage: "An Error",
    errorType: "Handler.Error",
    stackTrace: expect.arrayContaining(["Error: An Error"]),
  },
};

const asyncErrorResult = {
  method: "POST",
  path: "/2018-06-01/runtime/invocation/1234/error",
  headers: {
    "lambda-runtime-function-error-type": "Handler.UnhandledError",
    "content-type": "application/json",
  },
  payload: {
    errorMessage: "An Error",
    errorType: "Handler.UnhandledError",
    stackTrace: expect.arrayContaining(["Error: An Error"]),
  },
};

const runBootstrap = async (env) => {
  return new Promise((resolve, reject) => {
    try {
      // console.log("RUNNING BOOTSTRAP", process.argv[0], env);
      const child = spawn(
        process.argv[0],
        [Path.join(__dirname, "..", "src", "bootstrap")],
        {
          env,
          stdio: ["pipe", "inherit", "inherit"],
        }
      );
      let isDone = false;
      let timeout = setTimeout(() => !isDone && child.kill(), 500);
      const done = (error) => {
        if (isDone) return;
        clearTimeout(timeout);
        timeout = undefined;
        isDone = true;
        return error ? reject(error) : resolve();
      };
      child.on("exit", () => done());
      child.on("error", (e) => done(e));
    } catch (e) {
      reject(e);
    }
  });
};

describe("Bootstrap", () => {
  let runtimeApi;

  const createEnv = (handler, es6) => {
    const env = {
      _HANDLER: `${handler}.handler`,
      LAMBDA_TASK_ROOT: Path.join(__dirname, "handlers", es6 ? "es6" : ""),
      AWS_LAMBDA_RUNTIME_API: runtimeApi.host,
      _X_AMZN_TRACE_ID: "1234",
    };
    return env;
  };

  beforeAll(async () => {
    runtimeApi = await createRuntimeApi();
  });

  afterAll(async () => {
    runtimeApi && runtimeApi.close();
  });

  afterEach(async () => {
    runtimeApi.reset();
  });

  test("asyncHelloWorld", async () => {
    const env = createEnv("asyncHelloWorld");
    await runBootstrap(env);
    const trace = runtimeApi.getTrace();
    // console.log("TRACE", JSON.stringify(trace, null, 2));
    expect(Array.isArray(trace)).toBe(true);
    expect(trace.length).toBe(2);
    expect(trace[0]).toMatchObject({
      request: { method: "GET" },
      response: { status: 200 },
    });
    expect(trace[1]).toMatchObject({
      request: successResult,
      response: { status: 202 },
    });
  });

  itif(major >= 14)("asyncHelloWorld ES6", async () => {
    const env = createEnv("asyncHelloWorld", true);
    await runBootstrap(env);
    const trace = runtimeApi.getTrace();
    // console.log("TRACE", JSON.stringify(trace, null, 2));
    expect(Array.isArray(trace)).toBe(true);
    expect(trace.length).toBe(2);
    expect(trace[0]).toMatchObject({
      request: { method: "GET" },
      response: { status: 200 },
    });
    expect(trace[1]).toMatchObject({
      request: successResult,
      response: { status: 202 },
    });
  });

  test("two events", async () => {
    runtimeApi.reset([
      { payload: { eventNo: 1 } },
      { payload: { eventNo: 2 } },
    ]);
    const env = createEnv("asyncHelloWorld");
    await runBootstrap(env);
    const trace = runtimeApi.getTrace();
    // console.log("TRACE", JSON.stringify(trace, null, 2));
    expect(Array.isArray(trace)).toBe(true);
    expect(trace.length).toBe(4);
    expect(trace[0]).toMatchObject({
      request: { method: "GET" },
      response: { status: 200 },
    });
    expect(trace[1]).toMatchObject({
      request: {
        ...successResult,
        payload: { ...successResult.payload, event: { eventNo: 1 } },
      },
      response: { status: 202 },
    });
    expect(trace[2]).toMatchObject({
      request: { method: "GET" },
      response: { status: 200 },
    });
    expect(trace[3]).toMatchObject({
      request: {
        ...successResult,
        payload: { ...successResult.payload, event: { eventNo: 2 } },
      },
      response: { status: 202 },
    });
  });

  test("syncHelloWorld", async () => {
    const env = createEnv("syncHelloWorld");
    await runBootstrap(env);
    const trace = runtimeApi.getTrace();
    // console.log("TRACE", JSON.stringify(trace, null, 2));
    expect(Array.isArray(trace)).toBe(true);
    expect(trace.length).toBe(2);
    expect(trace[0]).toMatchObject({
      request: { method: "GET" },
      response: { status: 200 },
    });
    expect(trace[1]).toMatchObject({
      request: successResult,
      response: { status: 202 },
    });
  });

  itif(major >= 14)("syncHelloWorld ES6", async () => {
    const env = createEnv("syncHelloWorld", true);
    await runBootstrap(env);
    const trace = runtimeApi.getTrace();
    // console.log("TRACE", JSON.stringify(trace, null, 2));
    expect(Array.isArray(trace)).toBe(true);
    expect(trace.length).toBe(2);
    expect(trace[0]).toMatchObject({
      request: { method: "GET" },
      response: { status: 200 },
    });
    expect(trace[1]).toMatchObject({
      request: successResult,
      response: { status: 202 },
    });
  });

  test("asyncWithSyncException", async () => {
    const env = createEnv("asyncWithSyncException");
    await runBootstrap(env);
    const trace = runtimeApi.getTrace();
    // console.log("TRACE", JSON.stringify(trace, null, 2));
    expect(Array.isArray(trace)).toBe(true);
    expect(trace.length).toBe(2);
    expect(trace[0]).toMatchObject({
      request: { method: "GET" },
      response: { status: 200 },
    });
    expect(trace[1]).toMatchObject({
      request: syncErrorResult,
      response: { status: 202 },
    });
  });

  test("syncWithSyncException", async () => {
    const env = createEnv("syncWithSyncException");
    await runBootstrap(env);
    const trace = runtimeApi.getTrace();
    // console.log("TRACE", JSON.stringify(trace, null, 2));
    expect(Array.isArray(trace)).toBe(true);
    expect(trace.length).toBe(2);
    expect(trace[0]).toMatchObject({
      request: { method: "GET" },
      response: { status: 200 },
    });
    expect(trace[1]).toMatchObject({
      request: syncErrorResult,
      response: { status: 202 },
    });
  });

  test("asyncWithAsyncException", async () => {
    const env = createEnv("asyncWithAsyncException");
    await runBootstrap(env);
    const trace = runtimeApi.getTrace();
    // console.log("TRACE", JSON.stringify(trace, null, 2));
    expect(Array.isArray(trace)).toBe(true);
    expect(trace.length).toBe(2);
    expect(trace[0]).toMatchObject({
      request: { method: "GET" },
      response: { status: 200 },
    });
    expect(trace[1]).toMatchObject({
      request: asyncErrorResult,
      response: { status: 202 },
    });
  });

  test("syncWithAsyncException", async () => {
    const env = createEnv("syncWithAsyncException");
    await runBootstrap(env);
    const trace = runtimeApi.getTrace();
    // console.log("TRACE", JSON.stringify(trace, null, 2));
    expect(Array.isArray(trace)).toBe(true);
    expect(trace.length).toBe(2);
    expect(trace[0]).toMatchObject({
      request: { method: "GET" },
      response: { status: 200 },
    });
    expect(trace[1]).toMatchObject({
      request: asyncErrorResult,
      response: { status: 202 },
    });
  });

  test("missingHandlerFile", async () => {
    const env = createEnv("missingHandlerFile");
    await runBootstrap(env);
    const trace = runtimeApi.getTrace();
    // console.log("TRACE", JSON.stringify(trace, null, 2));
    expect(Array.isArray(trace)).toBe(true);
    expect(trace.length).toBe(1);
    expect(trace[0]).toMatchObject({
      request: {
        method: "POST",
        path: "/2018-06-01/runtime/init/error",
        headers: {
          "lambda-runtime-function-error-type": "Runtime.ErrorLoadingHandler",
          "content-type": "application/json",
        },
        payload: {
          errorMessage: expect.stringContaining(
            "Error loading handler 'missingHandlerFile.handler': Cannot find module"
          ),
          errorType: "Runtime.ErrorLoadingHandler",
          stackTrace: expect.arrayContaining([
            expect.stringContaining(
              "Error loading handler 'missingHandlerFile.handler': Cannot find module"
            ),
          ]),
        },
      },
      response: { status: 202 },
    });
  });

  test("missingHandlerExport", async () => {
    const env = createEnv("missingHandlerExport");
    await runBootstrap(env);
    const trace = runtimeApi.getTrace();
    // console.log("TRACE", JSON.stringify(trace, null, 2));
    expect(Array.isArray(trace)).toBe(true);
    expect(trace.length).toBe(1);
    expect(trace[0]).toMatchObject({
      request: {
        method: "POST",
        path: "/2018-06-01/runtime/init/error",
        headers: {
          "lambda-runtime-function-error-type": "Runtime.WrongHandlerType",
          "content-type": "application/json",
        },
        payload: {
          errorMessage: expect.stringContaining(
            "Error loading handler 'missingHandlerExport.handler': The handler 'handler' is not a function: undefined"
          ),
          errorType: "Runtime.WrongHandlerType",
          stackTrace: expect.arrayContaining([
            expect.stringContaining(
              "Error loading handler 'missingHandlerExport.handler': The handler 'handler' is not a function: undefined"
            ),
          ]),
        },
      },
      response: { status: 202 },
    });
  });

  test("syncHandlerReturnsPromise", async () => {
    const env = createEnv("syncHandlerReturnsPromise");
    await runBootstrap(env);
    const trace = runtimeApi.getTrace();
    // console.log("TRACE", JSON.stringify(trace, null, 2));
    expect(Array.isArray(trace)).toBe(true);
    expect(trace.length).toBe(2);
    expect(trace[0]).toMatchObject({
      request: { method: "GET" },
      response: { status: 200 },
    });
    expect(trace[1]).toMatchObject({
      request: successResult,
      response: { status: 202 },
    });
  });

  test("handlerInitializationError", async () => {
    const env = createEnv("handlerInitializationError");
    await runBootstrap(env);
    const trace = runtimeApi.getTrace();
    // console.log("TRACE", JSON.stringify(trace, null, 2));
    expect(Array.isArray(trace)).toBe(true);
    expect(trace.length).toBe(1);
    expect(trace[0]).toMatchObject({
      request: {
        method: "POST",
        path: "/2018-06-01/runtime/init/error",
        headers: {
          "lambda-runtime-function-error-type": "Runtime.ErrorLoadingHandler",
          "content-type": "application/json",
        },
        payload: {
          errorMessage: expect.stringContaining(
            "Error loading handler 'handlerInitializationError.handler': An Error"
          ),
          errorType: "Runtime.ErrorLoadingHandler",
          stackTrace: expect.arrayContaining([
            expect.stringContaining(
              "Error loading handler 'handlerInitializationError.handler': An Error"
            ),
          ]),
        },
      },
      response: { status: 202 },
    });
  });
});
