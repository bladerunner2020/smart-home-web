const config = require('config');

const saveGet = (property) => {
  if (config.has(property)) return config.get(property);
  return undefined;
}

module.exports = {
  get: saveGet
}
