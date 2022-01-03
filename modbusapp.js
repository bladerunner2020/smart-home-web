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

let writingInProgress = false;
const registers = {};

const closeModbus = () => new Promise((resolve, reject) => {
  try {
    if (tcpSocket) {
      tcpSocket.once('close', resolve);
      tcpSocket.once('error', reject);
      tcpSocket.destroy();
    }
  } catch (err) {
    reject(err);
  }
  modbusClient = null;
  tcpSocket = null;
});

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

const reconnect = () => closeModbus().catch(console.error).finally(() => connectModbus().catch(console.error));

const getPowerValue = () => powerValue;

module.exports = {
  reconnect,
  update,
  toggleCoil,
  getPowerValue,
  isConnected
};
