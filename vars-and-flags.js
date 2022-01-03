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
    comment: 'Гостинная',
    value: false
  },
  var2: {
    name: 'var2',
    coil: 17,
    zwave: 6,
    comment: 'Шкаф Гостиная (подсветка)',
    value: false
  },
  var3: {
    name: 'var3',
    coil: 16,
    zwave: 5,
    comment: 'Лампа Гостиная',
    value: false
  },
  var4: {
    name: 'var4',
    coil: 2,
    zwave: null,
    comment: 'Детская',
    value: false
  },
  var5: {
    name: 'var5',
    coil: 18,
    zwave: 7,
    comment: 'Детская Лампа настольная',
    value: false
  },
  var6: {
    name: 'var6',
    coil: 19,
    zwave: null,
    comment: 'Детская резерв',
    value: false
  },
  var7: {
    name: 'var7',
    coil: 0,
    zwave: null,
    comment: 'Верхний свет кухня',
    value: false
  },
  var8: {
    name: 'var8',
    coil: 1,
    zwave: null,
    comment: 'Подсветка кухня',
    value: false
  },
  var9: {
    name: 'var9',
    coil: 7,
    zwave: null,
    comment: 'Туалет',
    value: false
  },
  var10: {
    name: 'var10',
    coil: 6,
    zwave: null,
    comment: 'Ванная',
    value: false
  },
  var11: {
    name: 'var11',
    coil: 4,
    zwave: null,
    comment: 'Кладовка',
    value: false
  },
  var12: {
    name: 'var12',
    coil: 5,
    zwave: null,
    comment: 'Коридор',
    value: false
  },
  var13: {
    name: 'var13',
    coil: 20,
    zwave: 8,
    comment: 'Свет в аквариуме',
    value: false
  },
  var15: {
    name: 'var15',
    coil: 22,
    swCoil: 29,
    zwave: 9,
    comment: 'Умная розетка 2',
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
