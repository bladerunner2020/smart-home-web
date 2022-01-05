const SYNC_NONE = 0;
const SYNC_MODBUS = 2;
const SYNC_GUI = 3;
const SYNC_ZWAVE = 4;
const SYNC_API = 5;

// Переменные контроллера
const vars = {
  var1: {
    name: 'var1',
    coil: 3,
    zwave: null,
    title: 'Гостинная - верхний свет',
    value: false
  },
  var2: {
    name: 'var2',
    coil: 17,
    zwave: 6,
    title: 'Гостиная - подсветка',
    booco: 'LedMain',
    value: false
  },
  var3: {
    name: 'var3',
    coil: 16,
    zwave: 5,
    title: 'Гостиная - лампа',
    booco: 'LampMain',
    value: false
  },
  var4: {
    name: 'var4',
    coil: 2,
    zwave: null,
    title: 'Детская - верхний свет',
    value: false
  },
  var5: {
    name: 'var5',
    coil: 18,
    zwave: 7,
    title: 'Детская - лампа настольная',
    booco: 'LampKid',
    value: false
  },
  var6: {
    name: 'var6',
    coil: 19,
    zwave: null,
    title: 'Детская - резерв',
    value: false
  },
  var7: {
    name: 'var7',
    coil: 0,
    zwave: null,
    title: 'Кухня - верхний свет',
    value: false
  },
  var8: {
    name: 'var8',
    coil: 1,
    zwave: null,
    title: 'Кухня - подсветка',
    value: false
  },
  var9: {
    name: 'var9',
    coil: 7,
    zwave: null,
    title: 'Туалет',
    value: false
  },
  var10: {
    name: 'var10',
    coil: 6,
    zwave: null,
    title: 'Ванная',
    value: false
  },
  var11: {
    name: 'var11',
    coil: 4,
    zwave: null,
    title: 'Кладовка',
    value: false
  },
  var12: {
    name: 'var12',
    coil: 5,
    zwave: null,
    title: 'Коридор',
    value: false
  },
  var13: {
    name: 'var13',
    coil: 20,
    zwave: 8,
    title: 'Аквариум - свет',
    booco: 'Aquarium',
    noBridge: true,
    value: false
  },
  var15: {
    name: 'var15',
    coil: 22,
    swCoil: 29,
    zwave: 9,
    title: 'Умная розетка',
    booco: 'SmartPlug1',
    value: false
  }
};

module.exports = {
  SYNC_NONE,
  SYNC_MODBUS,
  SYNC_GUI,
  SYNC_ZWAVE,
  SYNC_API,

  vars
};
