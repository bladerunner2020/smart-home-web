/* eslint-disable no-console */
const http = require('http');

const { vars } = require('./vars-and-flags');
const config = require('./save-config');

const username = config.get('ZWave.user');
const password = config.get('ZWave.pass');
const host = config.get('ZWave.host');
const port = config.get('ZWave.port');
const devicePath = config.get('ZWave.device_path');

let writingInProgress = false;

const cmdBase = `http://${username}:${password}@${host}:${port}${devicePath}`;
console.log(`z-wave command base: ${cmdBase}`);

const readZwaveActuator = (name, zwave) => new Promise((resolve, reject) => {
  const url = `${cmdBase}devices[${zwave}].SwitchBinary.data.level.value`;

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
  if (writingInProgress) {
    resolve(null);
    return;
  }

  const promisses = [];
  zDevices.forEach(({ name, zwave }) => {
    promisses.push(readZwaveActuator(name, zwave));
  });
  Promise.all(promisses).then((result) => {
    let changed = false;
    const res = {};
    result.forEach(({ name, value }) => {
      if (vars[name] !== value) {
        res[name] = value;
        changed = true;
      }
    });
    resolve(changed ? res : null);
  }).catch((err) => reject(err));
});

const toggleLamp = (name, value) => {
  const { zwave } = vars[name];
  if (typeof zwave === 'undefined' || zwave === null) return; // no associated z-wave device
  writingInProgress = true;
  const url = `${cmdBase}devices[${zwave}].Basic.Set(${value ? 1 : 0})`;
  console.log(`Toggle z-wave ${url}`);
  http.get(url, (res) => {
    console.log(`Got response: ${res.statusCode}`);
    writingInProgress = false;
  }).on('error', (err) => {
    console.error(`http error: ${err}`);
    writingInProgress = false;
  }).end();
};

module.exports = {
  readActuators,
  toggleLamp
};
