exports.handler = (event, context, callback) => {
  return callback(null, { env: process.env, event, context });
};

throw new Error("An Error");
