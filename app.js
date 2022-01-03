/* eslint-disable camelcase */
/* eslint-disable no-console */
const express = require('express');
const http = require('http');

const {
  vars, SYNC_MODBUS, SYNC_ZWAVE, SYNC_API
} = require('./vars-and-flags');
const config = require('./save-config');
const modbusapp = require('./modbusapp');
const { readActuators } = require('./zwave');
const { synchronize } = require('./sync');
const { createSocket, updateAllClients } = require('./gui');

const modbusTimeout = config.get('Modbus.timeout', 500);
const zwaveTimeout = config.get('ZWave.timeout', 2000);

const app = express();
const server = http.Server(app);

// По-видимому это z-wave устройства
const valid_vars = ['var1', 'var2', 'var3', 'var4', 'var5', 'var6', 'var7', 'var8', 'var9', 'var10', 'var11',
  'var12', 'var13', 'var14', 'var15'];

console.log(`process.env.NODE_ENV = ${process.env.NODE_ENV}`);
console.log(`process.env.DEBUG = ${process.env.DEBUG}`);

const port = config.get('General.port');

server.listen(port, () => console.log(`Listenning at ${port}`));
createSocket(server, synchronize);

app.use(express.static('public'));

app.get('/time', (req, res) => {
  const date = new Date();
  res.json({ date: date.toString() });
});

app.get('/json', (req, res) => {
  res.json({
    mainroom: vars.var1, // Гостиная
    mainroom1: vars.var2, // Гостиная резерв
    mainroom2: vars.var3, // Гостиная резерв
    kidroom: vars.var4, // Детская
    kidroom1: vars.var5, // Детская резерв
    kidroom2: vars.var6, // Детская резерв
    kitchen: vars.var7, // Верхний свет кухня
    kitchen1: vars.var8, // Подсветка кухня
    wc: vars.var9, // Туалет
    bath: vars.var10, // Ванная
    boxroom: vars.var11, // Кладовка
    hall: vars.var12, // Коридор
    smartoutlet1: vars.var13, // Свет в аквариуме
    doorlock: vars.var14,
    smartoutlet2: vars.var15,
    power: modbusapp.getPowerValue()
  });
});

let switchTimer = null;
app.get('/switch', (req, res) => {
  res.writeHead(200, { 'content-type': 'text/plain' });
  res.write(`lamp: ${req.query.lamp}\n`);
  res.write(`on: ${req.query.on}\n`);
  res.end('That\'s all folks');

  if (switchTimer) return; // to avoid strange behavior of zwave controller (it sends toggle twice)

  const lamp = Number(req.query.lamp);

  console.log(`Switch. Status = ${req.query.on}`);

  console.log(`Switch. Lamp = ${lamp}`);
  if (Number.isNaN(lamp)) {
    console.error('... Error lamp ID');
    return;
  }
  const name = `var${lamp}`;
  console.log(`...Switching light for ${name}`);

  if (valid_vars.indexOf(name) === -1) {
    console.error(`Invalid lamp id: ${name}`);
    return;
  }

  const data = {};
  switch (String(req.query.on).toLowerCase()) {
    case '1':
    case 'true':
      data.name = true;
      break;
    case '0':
    case 'false':
      data.name = false;
      break;
    case 'toggle':
      data.name = !vars[name];
      break;
    case 'none':
      return;
    default:
      console.error(`Invalid command: ${req.query.on}`);
      return;
  }
  synchronize(data, SYNC_API);

  switchTimer = setTimeout(() => {
    switchTimer = null;
  }, 500);
});

let modbusUpdateTimer = null;
const pollModbus = (now) => {
  if (modbusUpdateTimer) clearTimeout(modbusUpdateTimer);
  modbusUpdateTimer = setTimeout(() => {
    modbusUpdateTimer = null;
    modbusapp
      .update()
      .then((data) => {
        synchronize(data, SYNC_MODBUS);
      })
      .finally(() => pollModbus());
  }, now ? 0 : modbusTimeout);
};

let zwaveUpdateTimer = null;
const pollZwave = (now) => {
  if (zwaveUpdateTimer) clearTimeout(zwaveUpdateTimer);
  zwaveUpdateTimer = setTimeout(() => {
    zwaveUpdateTimer = null;
    readActuators().then((data) => {
      synchronize(data, SYNC_ZWAVE);
    }).finally(() => pollZwave());
  }, now ? 0 : zwaveTimeout);
};

updateAllClients();

console.log(`Start modbus polling: ${modbusTimeout}`);
pollModbus(true);

console.log(`Start z-wave polling: ${zwaveTimeout}`);
pollZwave(true);

const reconnectModbus = () => {
  setTimeout(() => {
    pollModbus(); // restart polling
    modbusapp.reconnect().catch(console.error).finally(reconnectModbus);
  }, 60000);
};
reconnectModbus();

console.log(`App is started: ${__dirname}`);
