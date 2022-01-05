/* eslint-disable no-console */
const {
  vars, SYNC_NONE, SYNC_MODBUS, SYNC_GUI, SYNC_ZWAVE, SYNC_API
} = require('./vars-and-flags');
const { updateAllClients } = require('./gui');
const { toggleCoil } = require('./modbusapp');
const { toggleLamp } = require('./zwave');
const { toggleHomeKit } = require('./apple');
const config = require('./save-config');
const { toggleBoocoDevice } = require('./booco');

const zWaveEnable = config.get('ZWave.enable', true);
const boocoEnable = config.get('booco.enable', false);

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
      if (zWaveEnable) {
        toggleLamp(name, value); // Записываем значение в Z-Wave актуатор
      } else if (boocoEnable) {
        toggleBoocoDevice(name, value);
      }
      toggleHomeKit(name, value);
      break;
    case SYNC_API:
    case SYNC_GUI: // Данные изменились в GUI
      toggleCoil(name, value); // Записываем значение в ПЛК
      if (zWaveEnable) {
        toggleLamp(name, value); // Записываем значение в Z-Wave актуатор
      } else if (boocoEnable) {
        toggleBoocoDevice(name, value);
      }
      toggleHomeKit(name, value);
      break;
    case SYNC_ZWAVE:
      toggleCoil(name, value); // Записываем значение в ПЛК
      toggleHomeKit(name, value);
      break;

    default:
      console.error(`Wrong flag: ${source}`);
  }
};

const synchronize = (data, source) => {
  if (!data) return;

  const keys = Object.keys(data);
  keys.forEach((name) => {
    if (typeof vars[name] === 'undefined') {
      console.error(new Error(`Invalid request: ${name}`));
    } else if (vars[name].value !== data[name]) {
      syncElement(name, data[name], source);
    }
  });
  updateAllClients(data);
};

module.exports = {
  synchronize
};
