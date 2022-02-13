exports.handler = async (event, context) => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      throw new Error("An Error");
    }, 10);
  });
};
