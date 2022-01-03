const config = require('config');

const saveGet = (property, defaultValue) => {
  const value = config.has(property) ? config.get(property) : undefined;
  return (typeof value !== 'undefined') ? value : defaultValue;
};

module.exports = {
  get: saveGet
};
