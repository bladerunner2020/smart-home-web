/* eslint-disable camelcase */
/* eslint-disable no-console */
const express = require('express');
const http = require('http');

const {
  vars, flags,
  SYNC_GUI, SYNC_MODBUS, SYNC_ZWAVE
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
  const lamp_str_id = `var${lamp}`;
  console.log(`...Switching light for ${lamp_str_id}`);

  if (valid_vars.indexOf(lamp_str_id) === -1) {
    console.error(`Invalid lamp id: ${lamp_str_id}`);
    return;
  }

  switch (String(req.query.on).toLowerCase()) {
    case '1':
    case 'true':
      vars[lamp_str_id] = true;
      break;
    case '0':
    case 'false':
      vars[lamp_str_id] = false;
      break;
    case 'toggle':
      vars[lamp_str_id] = !vars[lamp_str_id];
      break;
    case 'none':
      return;
    default:
      console.error(`Invalid command: ${req.query.on}`);
      return;
  }

  flags[lamp_str_id] = SYNC_GUI;
  modbusapp.syncronize2(vars, flags);
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

// let timerId = setInterval(() => {
//   modbusapp.syncronize2(vars, flags);

//   io.emit('vars', vars);
// }, 500); // интервал в миллисекундах

// setInterval(() => {
//   modbusapp.readActuators(vars, flags);
//   io.emit('vars', vars);
// }, 2000); // интервал в миллисекундах

// setInterval(() => {
//   if (!modbusapp.isConnected()) {
//     modbusapp.reconnect();
//   }
// }, 10000); // интервал в миллисекундах

console.log(`App is started: ${__dirname}`);
