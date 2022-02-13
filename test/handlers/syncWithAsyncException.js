exports.handler = (event, context, callback) => {
  setTimeout(() => {
    throw new Error("An Error");
  }, 10);
};
