exports.handler = (event, context) => {
  return new Promise((r) => r({ env: process.env, event, context }));
};
