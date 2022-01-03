/* eslint-disable no-console */
const Socket = require('socket.io');
const { vars, SYNC_GUI } = require('./vars-and-flags');

let io = null;

const varsToClient = () => {
  const data = {};
  Object.keys(vars).forEach((name) => {
    data[name] = vars[name].value;
  });
  return data;
};

const createSocket = (server, synchronize) => {
  io = Socket(server);
  io.on('connection', (socket) => {
    console.log('Client is connected.');
    socket.emit('vars', varsToClient(vars));
    socket.on('vars', (data) => {
      synchronize(data, SYNC_GUI);
    });
  });
};

const updateAllClients = () => {
  io.emit('vars', varsToClient(vars));
};

module.exports = {
  createSocket,
  updateAllClients
};
