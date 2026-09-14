/* eslint-disable no-console */
const http = require('http');

const { vars } = require('./vars-and-flags');
const config = require('./save-config');

const username = config.get('ZWave.user');
const password = config.get('ZWave.pass');
const host = config.get('ZWave.host');
const port = config.get('ZWave.port');
const devicePath = config.get('ZWave.device_path');
const enable = config.get('ZWave.enable', true);

let writingInProgress = false;

const cmdBase = `http://${username}:${password}@${host}:${port}${devicePath}`;
console.log(`z-wave command base: ${cmdBase}`);

const readZwaveActuator = (name, zwave) => new Promise((resolve, reject) => {
  const url = typeof zwave === 'string'
    ? `${cmdBase}${zwave}.SwitchBinary.data.level.value`
    : `${cmdBase}devices[${zwave}].SwitchBinary.data.level.value`;

  http.get(url, (res) => {
    res.on('data', (chunk) => {
      const value = (String(chunk).toLowerCase() === 'true');
      resolve({ name, value });
    });
  }).on('error', (err) => {
    reject(err);
  }).end();
});

const zDevices = Object
  .keys(vars)
  .map((name) => vars[name])
  .filter(({ zwave }) => typeof zwave !== 'undefined' && zwave !== null);

const readActuators = () => new Promise((resolve, reject) => {
  if (writingInProgress || !enable) {
    resolve(null);
    return;
  }

  const promises = [];
  zDevices.forEach(({ name, zwave }) => {
    promises.push(readZwaveActuator(name, zwave).catch((err) => console.log('readZwaveActuator error', err.message)));
  });
  Promise.all(promises).then((result) => {
    if (!result) {
      console.log('Error. No result from z-wave');
      resolve(null);
      return;
    }
    let changed = false;
    const res = {};
    result.forEach(({ name, value } = {}) => {
      if (vars[name] !== value) {
        res[name] = value;
        changed = true;
      }
    });
    resolve(changed ? res : null);
  }).catch((err) => reject(err));
});

const toggleLamp = (name, value) => {
  if (!enable) return;

  const { zwave } = vars[name];
  if (typeof zwave === 'undefined' || zwave === null) return; // no associated z-wave device

  writingInProgress = true;
  const url = typeof zwave === 'string'
    ? `${cmdBase}${zwave}.SwitchBinary.Set(${value ? 1 : 0})`
    : `${cmdBase}devices[${zwave}].Basic.Set(${value ? 1 : 0})`;
  console.log(`Toggle z-wave ${url}`);
  http.get(url, (res) => {
    console.log(`Got response: ${res.statusCode}`);
    writingInProgress = false;
  }).on('error', (err) => {
    console.log(`http error: ${err.message}`);
    writingInProgress = false;
  }).end();
};

module.exports = {
  readActuators,
  toggleLamp
};
