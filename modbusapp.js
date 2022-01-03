/* eslint-disable no-console */
/* eslint-disable camelcase */
/**
 * Created by bladerunner on 18.08.2015.
 */
const Modbus = require('jsmodbus');
const { Socket } = require('net');

const { vars } = require('./vars-and-flags');
const { decodeFloat } = require('./tools');
const config = require('./save-config');

let powerValue = 0;
let tcpSocket = null;
let modbusClient = null;

const host = config.get('Modbus.host');
const port = config.get('Modbus.port', 502);
const unitId = config.get('Modbus.unitId', 1);
console.log(`Modbus: ${host}:${port}, unit ID: ${unitId}`);

// const registerMap = [
//   { name: 'var7', value: 0, coil: 0 }, // Coil 0, Верхний свет Кухня
//   { name: 'var8', value: 0, coil: 1 }, // Coil 1, Дополнительный свет Кухня
//   { name: 'var4', value: 0, coil: 2 }, // Coil 2, Верхний свет Детская
//   { name: 'var1', value: 0, coil: 3 }, // Coil 3, Гостинная
//   { name: 'var11', value: 0, coil: 4 }, // Coil 4, Кладовка
//   { name: 'var12', value: 0, coil: 5 }, // Coil 5, Коридор
//   { name: 'var10', value: 0, coil: 6 }, // Coil 6, Ванная
//   { name: 'var9', value: 0, coil: 7 }, // Coil 7, Туалет
//   {}, {}, {}, {}, {}, {}, {}, {}, // skip 8 coils

//   { name: 'var3', value: 0, coil: 16 }, // Coil 16, Лампа Гостиная
//   { name: 'var2', value: 0, coil: 17 }, // Coil 17, Шкаф Гостиная (подсветка)
//   { name: 'var5', value: 0, coil: 18 }, // Coil 18, Детская Лампа настольная
//   { name: 'var6', value: 0, coil: 19 }, // Coil 19, Зарезервировано
//   { name: 'var13', value: 0, coil: 20 }, // Coil 20, Умная розетка
//   { name: 'var14', value: 0, coil: 21 }, // Coil 20, Умная розетка
//   { name: 'var15', value: 0, coil: 22 }, // Coil 20, Умная розетка
// ];

let writingInProgress = false;
const registers = {};

const closeModbus = () => {
  try {
    if (tcpSocket) tcpSocket.destroy();
  } catch (err) {
    console.error(err);
  }
  modbusClient = null;
  tcpSocket = null;
};

const connectModbus = () => new Promise((resolve, reject) => {
  if (modbusClient) {
    resolve();
    return;
  }

  let promiseAnswered = false;
  tcpSocket = new Socket();
  modbusClient = new Modbus.client.TCP(tcpSocket, unitId);
  const options = { host, port };
  tcpSocket.on('connect', () => {
    console.log('Modbus is connected');
    promiseAnswered = true;
    resolve();
  });
  tcpSocket.on('error', (err) => {
    if (!promiseAnswered) {
      promiseAnswered = true;
      reject(err);
    } else {
      console.error(err);
    }
    closeModbus();
  });
  tcpSocket.connect(options);
});

let lastError = null;

const update = () => {
  if (writingInProgress) return Promise.resolve();

  return connectModbus()
    .then(() => modbusClient
      .readInputRegisters(2, 2)
      .then((resp) => {
        const data = resp.response.body.valuesAsArray;
        const byte1 = data[0] & 0xFF; // eslint-disable-line no-bitwise
        const byte2 = (data[0] >> 8); // eslint-disable-line no-bitwise
        const byte3 = data[1] & 0xFF; // eslint-disable-line no-bitwise
        const byte4 = (data[1] >> 8); // eslint-disable-line no-bitwise
        powerValue = decodeFloat([byte1, byte2, byte3, byte4], 1, 8, 23, -126, 127, true);
      })
      .then(() => modbusClient.readCoils(0, 24))
      .then((resp) => {
        lastError = null;
        const res = {};
        let changed = false;
        if (writingInProgress) return null; // ignore results

        Object
          .keys(vars)
          .forEach((name) => {
            const { coil, value } = vars[name] || {};
            if (typeof coil !== 'undefined') {
              const newValue = resp.response.body.valuesAsArray[coil];
              registers[name] = !!newValue;
              if (typeof newValue !== 'undefined' && !!newValue !== value) {
                changed = true;
                res[name] = !!newValue;
              }
            }
          });
        return changed ? res : null;
      })
      .catch((err) => {
        if (err.message !== lastError) {
          console.error(err);
          lastError = err.message;
        }
        closeModbus();
      }))
    .catch((err) => {
      if (err.message !== lastError) {
        lastError = err.message;
        console.error(err);
      }
      closeModbus();
    });
};

const toggleCoil = (name, value) => {
  const { coil, swCoil = coil + 8 } = vars[name];
  if (typeof coil === 'undefined') return;
  if (registers[name] === value) return;

  writingInProgress = true;
  registers[name] = value;

  // Switch on
  connectModbus().then(() => modbusClient.writeSingleCoil(swCoil, true))
    .then(() => modbusClient.writeSingleCoil(swCoil, false))
    .catch((err) => {
      console.error(`Error write coil: ${err.message}`);
      closeModbus();
    })
    .finally(() => {
      writingInProgress = false;
    });
};

const isConnected = () => modbusClient.isConnected();

const reconnect = function() {
  closeModbus();
  connectModbus();
};

const getPowerValue = () => powerValue;

module.exports = {
  reconnect,
  update,
  toggleCoil,
  getPowerValue,
  isConnected
};
