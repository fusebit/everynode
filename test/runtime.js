const Express = require("express");
const Http = require("http");

const defaultHeaders = {
  "Lambda-Runtime-Aws-Request-Id": "1234",
  "Lambda-Runtime-Deadline-Ms": "5678",
  "Lambda-Runtime-Invoked-Function-Arn": "Lambda-Runtime-Invoked-Function-Arn",
  "Lambda-Runtime-Trace-Id": "Lambda-Runtime-Trace-Id",
  "Lambda-Runtime-Client-Context": "Lambda-Runtime-Client-Context",
  "Lambda-Runtime-Cognito-Identity": "Lambda-Runtime-Cognito-Identity",
};
const defaultPayload = { foo: "bar" };

module.exports = async () => {
  const app = Express();
  let trace = [];
  let events = [{ payload: defaultPayload }];

  app.get("/test", (req, res) => res.json({ ok: true }));

  app.get("/2018-06-01/runtime/invocation/next", (req, res) => {
    const event = events.shift();
    if (!event) {
      // No more events to send, "hang" the request
      return;
    }
    const headers = { ...defaultHeaders, ...event.headers };
    const payload = event.payload;
    trace.push({
      request: { method: "GET", path: req.path },
      response: { status: 200, headers, payload },
    });
    res.set(headers);
    res.json(payload);
  });

  app.post(
    [
      "/2018-06-01/runtime/invocation/:requestId/response",
      "/2018-06-01/runtime/invocation/:requestId/error",
      "/2018-06-01/runtime/init/error",
    ],
    Express.json(),
    (req, res) => {
      trace.push({
        request: {
          method: "POST",
          path: req.path,
          headers: req.headers,
          payload: req.body,
        },
        response: { status: 202 },
      });
      res.status(202);
      res.end();
    }
  );

  let tmp = Http.createServer(app);
  return new Promise((resolve, reject) => {
    tmp.on("error", reject);
    const port = Math.floor(Math.random() * 1000) + 3000;
    tmp.listen(port, () => {
      tmp.removeListener("error", reject);
      resolve({
        host: `localhost:${port}`,
        close: () => tmp.close(),
        getTrace: () => trace,
        reset: (newEvents) => {
          trace = [];
          events = newEvents || [{ payload: defaultPayload }];
        },
        defaultPayload,
        defaultHeaders,
      });
    });
  });
};
