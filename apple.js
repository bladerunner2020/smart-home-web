/* eslint-disable no-console */
// const hap = require('hap-nodejs');
const {
  Accessory, Characteristic, CharacteristicEventTypes, Service, Categories, Bridge, uuid
} = require('hap-nodejs');
const storage = require('node-persist');
const { vars, SYNC_API } = require('./vars-and-flags');
const config = require('./save-config');

const dir = config.get('hap.dir');
const enable = config.get('hap.enable', true);
const useBridge = config.get('hap.useBridge');
const serviceName = config.get('hap.serviceName', 'hap-dev.booco');
const serviceMac = config.get('hap.serviceMac', '20:00:77:77:77:00');
console.log(`HAP: ${serviceName}, ${serviceMac}`);

const characteristics = {};

if (dir) {
  console.log(`Persist storage dir: ${dir}`);
  storage.init({
    dir
  });
}

const initializeAppleHomekit = (synchronize) => {
  if (!enable) {
    console.log('HAP is not enabled in config!');
    return;
  }
  console.log(`Initializing HAP. Using bridge: ${useBridge}`);
  const bridge = useBridge ? new Bridge('HAP Booco', uuid.generate(`${serviceName}.bridge`)) : null;

  Object.keys(vars).forEach((name, index) => {
    const { title, noBridge = false } = vars[name];
    const accessoryUuid = uuid.generate(`${serviceName}.${name}'`);
    const accessory = new Accessory(`${title}`, accessoryUuid);
    const lightService = new Service.Lightbulb(title);

    // 'On' characteristic is required for the light service
    const onCharacteristic = lightService.getCharacteristic(Characteristic.On);

    // with the 'on' function we can add event handlers for different events, mainly the 'get' and 'set' event
    onCharacteristic.on(CharacteristicEventTypes.GET, (callback) => {
      console.log(`Queried current light state: ${name} = ${vars[name].value}`);
      callback(undefined, vars[name].value);
    });
    onCharacteristic.on(CharacteristicEventTypes.SET, (value, callback) => {
      console.log(`Setting light state to: ${name} => ${value}`);
      const data = {
        [name]: value
      };
      synchronize(data, SYNC_API);
      callback();
    });

    characteristics[name] = onCharacteristic;

    accessory.addService(lightService); // adding the service to the accessory
    if (bridge && !noBridge) {
      bridge.addBridgedAccessory(accessory); // instead of publish
    } else {
      const s = `00${index}`.slice(-2);
      const port = 47129 + index;
      const pincode = '111-22-333';
      const username = serviceMac.slice(0, -2) + s;
      // once everything is set up, we publish the accessory. Publish should always be the last step!
      accessory.publish({
        username, // replace last 2 digits with index
        pincode,
        port,
        category: Categories.LIGHTBULB, // value here defines the symbol shown in the pairing screen
      });
      console.log(`Publishing ${name}, port: ${port}, pincode: ${pincode}, ${title}`);
    }
  });

  if (bridge) {
    bridge.publish({
      username: serviceMac,
      pincode: '111-22-333',
      port: 47128,
      category: Categories.BRIDGE, // value here defines the symbol shown in the pairing screen
    });
  }

  console.log('Accessory setup finished!');
};

const toggleHomeKit = (name, value) => {
  if (characteristics[name]) {
    characteristics[name].updateValue(value);
  }
};

module.exports = {
  initializeAppleHomekit,
  toggleHomeKit
};
