/* eslint-disable no-console */
const {
  vars, SYNC_NONE, SYNC_MODBUS, SYNC_GUI, SYNC_ZWAVE, SYNC_API
} = require('./vars-and-flags');
const { updateAllClients } = require('./gui');
const { toggleCoil } = require('./modbusapp');
const { toggleLamp } = require('./zwave');

const syncElement = function(name, value, source) {
  if (typeof vars[name] !== 'object') {
    console.error(new Error(`invalid name: ${name}`));
    return;
  }

  vars[name].value = value;
  switch (source) {
    case SYNC_NONE:
      break;
    case SYNC_MODBUS: // Данные изменились в ПЛК
      toggleLamp(name, value); // Записываем значение в Z-Wave актуатор
      break;
    case SYNC_GUI: // Данные изменились в GUI
      toggleCoil(name, value); // Записываем значение в ПЛК
      toggleLamp(name, value); // Записываем значение в Z-Wave актуатор
      break;
    case SYNC_ZWAVE:
      toggleCoil(name, value); // Записываем значение в ПЛК
      break;
    case SYNC_API:

      break;
    default:
      console.error(`Wrong flag: ${source}`);
  }
};

const synchronize = (data, source) => {
  if (!data) return;

  const keys = Object.keys(data);
  keys.forEach((name) => {
    if (vars[name].value !== data[name]) syncElement(name, data[name], source);
  });
  updateAllClients(data);
};

module.exports = {
  synchronize
};
