const createRuntimeApi = require("./runtime");
const Superagent = require("superagent");

describe("Runtime API", () => {
  let runtimeApi;

  beforeAll(async () => {
    runtimeApi = await createRuntimeApi();
  });

  afterAll(async () => {
    runtimeApi && runtimeApi.close();
  });

  afterEach(async () => {
    runtimeApi.reset();
  });

  test("Runtime API service works", async () => {
    const url = `http://${runtimeApi.host}/test`;
    const response = await Superagent.get(url);
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ ok: true });
  });

  test("Runtime API get invocation works", async () => {
    const url = `http://${runtimeApi.host}/2018-06-01/runtime/invocation/next`;
    const headers = runtimeApi.defaultHeaders;
    const payload = runtimeApi.defaultPayload;
    const headersLowecase = {};
    Object.keys(headers).forEach(
      (h) => (headersLowecase[h.toLowerCase()] = headers[h])
    );
    const response = await Superagent.get(url);
    expect(response.status).toBe(200);
    expect(response.headers).toMatchObject(headersLowecase);
    expect(response.body).toMatchObject(payload);
    const trace = runtimeApi.getTrace();
    expect(Array.isArray(trace)).toBe(true);
    expect(trace.length).toBe(1);
    expect(trace[0]).toMatchObject({
      request: { method: "GET" },
      response: { status: 200, headers, payload },
    });
  });

  test("Runtime API invocation response works", async () => {
    const url = `http://${runtimeApi.host}/2018-06-01/runtime/invocation/1234/response`;
    const payload = { result: "baz" };
    const response = await Superagent.post(url).send(payload);
    expect(response.status).toBe(202);
    const trace = runtimeApi.getTrace();
    expect(Array.isArray(trace)).toBe(true);
    expect(trace.length).toBe(1);
    expect(trace[0]).toMatchObject({
      request: { method: "POST", payload },
      response: { status: 202 },
    });
  });

  test("Runtime API invocation error works", async () => {
    const url = `http://${runtimeApi.host}/2018-06-01/runtime/invocation/1234/error`;
    const headers = {
      "Lambda-Runtime-Function-Error-Type": "Runtime.NoSuchHandler",
    };
    const headersLowercase = {};
    Object.keys(headers).forEach(
      (h) => (headersLowercase[h.toLowerCase()] = headers[h])
    );
    const payload = {
      errorMessage: "Error parsing event data.",
      errorType: "InvalidEventDataException",
      stackTrace: [],
    };
    const response = await Superagent.post(url).set(headers).send(payload);
    expect(response.status).toBe(202);
    const trace = runtimeApi.getTrace();
    expect(Array.isArray(trace)).toBe(true);
    expect(trace.length).toBe(1);
    expect(trace[0]).toMatchObject({
      request: { method: "POST", payload, headers: headersLowercase },
      response: { status: 202 },
    });
  });

  test("Runtime API init error works", async () => {
    const url = `http://${runtimeApi.host}/2018-06-01/runtime/init/error`;
    const headers = {
      "Lambda-Runtime-Function-Error-Type": "Runtime.NoSuchHandler",
    };
    const headersLowercase = {};
    Object.keys(headers).forEach(
      (h) => (headersLowercase[h.toLowerCase()] = headers[h])
    );
    const payload = {
      errorMessage: "Error parsing event data.",
      errorType: "InvalidEventDataException",
      stackTrace: [],
    };
    const response = await Superagent.post(url).set(headers).send(payload);
    expect(response.status).toBe(202);
    const trace = runtimeApi.getTrace();
    expect(Array.isArray(trace)).toBe(true);
    expect(trace.length).toBe(1);
    expect(trace[0]).toMatchObject({
      request: { method: "POST", payload, headers: headersLowercase },
      response: { status: 202 },
    });
  });
});
