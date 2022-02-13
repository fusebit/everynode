exports.handler = (event, context, callback) => {
  callback(null, { message: `Hello from Node ${process.version}` });
};
