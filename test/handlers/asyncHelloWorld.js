exports.handler = async (event, context) => {
  return { env: process.env, event, context };
};
