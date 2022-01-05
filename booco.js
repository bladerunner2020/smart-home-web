/* eslint-disable no-console */
const http = require('http');
const config = require('./save-config');
const { vars, SYNC_ZWAVE } = require('./vars-and-flags');

const username = config.get('booco.username');
const password = config.get('booco.password');
const hostname = config.get('booco.host');
const port = config.get('booco.port');
const target = config.get('booco.target');
const enable = config.get('booco.enable', false);

let authToken = null;
let userId = null;

let synchronize = null;

const httpRequest = ({ path, data, method = data ? 'POST' : 'GET' }) => new Promise((resolve, reject) => {
  const postData = data && JSON.stringify(data);

  const headers = { 'Content-Type': 'application/json' };
  if (postData) headers['Contenet-Length'] = Buffer.byteLength(postData);
  if (authToken) headers['X-Auth-Token'] = authToken;
  if (userId) headers['X-User-Id'] = userId;

  const options = {
    method, hostname, port, path, headers
  };

  const req = http.request(options, (res) => {
    if (res.statusCode !== 200) {
      reject(new Error(`Request  ${path} failed with status code: ${res.statusCode}`));
      return;
    }
    let resData = '';
    res.on('data', (chunk) => {
      resData += chunk;
    });
    res.on('end', () => {
      try {
        const jsonData = JSON.parse(resData);
        if (jsonData.status !== 'success') {
          reject(new Error(`Request  ${path} failed ${resData})`));
        } else {
          resolve(jsonData);
        }
      } catch (err) {
        reject(new Error(`Request ${path} failed, invalid data: ${resData}`));
      }
    });
  });
  req.on('error', reject);
  if (postData) req.write(postData);
  req.end();
});

const login = (force = false) => {
  if (authToken && userId && !force) {
    return Promise.resolve();
  }
  authToken = null;
  userId = null;

  return httpRequest({
    path: '/api/v1/login',
    data: { username, password }
  }).then((res) => {
    authToken = res.data && res.data.authToken;
    userId = res.data && res.data.userId;
  });
};

const devices = Object
  .keys(vars)
  .map((name) => vars[name].booco)
  .filter((device) => !!device);

console.log(`Booco devices: ${devices.join(', ')}`);

const subscribe = () => httpRequest({
  path: '/api/v1/eqstates/subscribe/',
  data: {
    target,
    query: { name: { $in: devices } }
  }
});

const requestData = () => httpRequest({
  path: '/api/v1/eqstates/'
}).then(({ data = [] } = {}) => {
  data.forEach(({ name, power, status } = {}) => {
    if (status === 'connected' && devices.includes(name)) {
      const [device] = Object.keys(vars).filter((key) => vars[key].booco === name);
      if (device) {
        synchronize({
          [device]: power === 'on'
        }, SYNC_ZWAVE);
      }
    }
  });
});

const notifyChanges = (data = {}) => {
  const { name, power, status } = data.document || {};
  if (status !== 'connected') return;

  const [device] = Object.keys(vars).filter((key) => vars[key].booco === name);
  if (device) {
    synchronize({
      [device]: power === 'on'
    }, SYNC_ZWAVE);
  }
};

let updateTimer = null;
const updateData = (now) => {
  if (updateTimer) clearTimeout(updateTimer);
  updateTimer = setTimeout(() => {
    updateTimer = null;
    login(true)
      .then(() => subscribe().catch(console.error))
      .then(() => requestData().catch(console.error))
      .catch(console.error)
      .finally(updateData);
  }, now ? 0 : 180000);
};

const toggleBoocoDevice = (name, value) => {
  const { booco: deviceName } = vars[name] || {};
  const channel = value ? 'powerOn' : 'powerOff';
  if (!deviceName) return;

  login()
    .then(() => httpRequest({
      path: `/api/v1/equipment/set/${deviceName}/${channel}`
    }).catch(console.error))
    .catch(console.error);
};

const initializeBooco = (sync) => {
  synchronize = sync;
};

if (enable) updateData(true);

module.exports = {
  toggleBoocoDevice,
  notifyChanges,
  initializeBooco
};
