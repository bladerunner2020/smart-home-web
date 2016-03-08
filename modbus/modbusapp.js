/**
 * Created by bladerunner on 18.08.2015.
 */
var debug = require('debug')('modbusapp');
var error = debug;
var log = debug;
// log.log = console.log.bind(console);

const EventEmitter = require('events');

var power_val = 0;

var modbus = require('jsModbus');
var util = require('util');
//var misc = require('../misc/mytools');
var lastresp = null;
var http = require('http');
var config = require('config');

var z_user = config.get('ZWave.user');
var z_pass = config.get('ZWave.pass');
var z_host = config.get('ZWave.host');
var z_port = config.get('ZWave.port');
var z_device_path = config.get('ZWave.device_path');

var z_cmd_base = "http://" + z_user + ":" + z_pass +"@" + z_host + ":" +z_port + z_device_path;
log('z-wave command base: ' + z_cmd_base);

var modbus_host = config.get('Modbus.host');
var modbus_port = config.get('Modbus.port');
log('Modbus host: ' + modbus_host + ':' + modbus_port);

const SYNC_NONE = 0;
const SYNC_MODBUS = 2;
const SYNC_GUI = 3;
const SYNC_ZWAVE = 4;
const SYNC_TIMER = 5;

exports.SYNC_NONE = SYNC_NONE;
exports.SYNC_MODBUS = SYNC_MODBUS;
exports.SYNC_GUI = SYNC_GUI;
exports.SYNC_ZWAVE = SYNC_ZWAVE;
exports.SYNC_TIMER = SYNC_TIMER;

//Переменные контроллера
var mb_vars = {
    var1: false,    // Гостинная
    var2: false,    // Гостинная резерв
    var3: false,    // Гостинная резерв
    var4: false,    // Детская
    var5: false,    // Детская резерв
    var6: false,    // Детская резерв
    var7: false,    // Верхний свет кухня
    var8: false,    // Подсветка кухня
    var9: false,    // Туалет
    var10: false,   // Ванная
    var11: false,   // Кладовка
    var12: false,    // Коридор
    var13: false    // Умная розетка
};


toggleLamp = function(vars, var_num)
{
    var url = z_cmd_base;
    switch (var_num){
        case 'var3':
            url += "devices[5].Basic";
            break;
        case 'var2':
            url += "devices[6].Basic";
            break;
        case 'var5':
            url += "devices[7].Basic";
            break;
        case 'var13':
            url += "devices[8].Basic";
            break;
        default :
            // Не z-wave или не подключена
            return;
    }

    if (!vars[var_num]) {
        url = url + ".Set(0)";
    } else {
        url = url + ".Set(1)";
    }
    debug('Toggle z-wave ' + url);
    http.get(url, function (res) {
        debug("Got response: " + res.statusCode);
        }).on('error', function(err){
        error('http error: ' + err);
    }).end();
};

exports.readSensors = function(){
    var url = z_cmd_base;
    url += "devices[4].SensorBinary.data[1].level.value";

    http.get(url, function(res) {
        debgu("Got response: " + res.statusCode);
        res.on('data', function (chunk) {
            debgu('BODY: ' + chunk);
            var sensor_res = (String(chunk).toLowerCase() == 'true');
            debug('Sensor: ' + sensor_res);
        });
    });
};

readZwaveActuator = function(vars, sflags, name, id){
    var url =z_cmd_base;
    url += "devices[" + id +
                "].SwitchBinary.data.level.value";
    http.get(url, function(res) {
        res.on('data', function (chunk) {
            var sw_res = (String(chunk).toLowerCase() == 'true');
            if ((sw_res != vars[name])&& (sflags[name] == SYNC_NONE)) {
                vars[name] = sw_res;
                sflags[name] = SYNC_ZWAVE;
            }
        });
    }).on('error', function(err){
        error('http error: ' + err);
    }).end();
};

exports.readActuators = function(vars,sflags){
    readZwaveActuator(vars, sflags,'var13', 8);
    readZwaveActuator(vars, sflags,'var5', 7);
    readZwaveActuator(vars, sflags,'var3', 5);
};

read_modbus_element =function(sflags, name, coil){
    if (mb_vars[name] != coil){
        mb_vars[name] = coil;
        if (sflags[name] == SYNC_NONE) {
            debug(' ==> Set Sync Modbus');
            sflags[name] = SYNC_MODBUS;
        }
    }
};

function ModbusEmitter() {
    EventEmitter.call(this);
}
util.inherits(ModbusEmitter, EventEmitter);

const Notifier = new ModbusEmitter();
module.exports.Notifier = Notifier;

function procecc_door_lock(coil) {
    if (mb_vars['var14'] != coil){
        if (mb_vars['var14'] != undefined)
            Notifier.emit('doorlock', coil, power_val);
        mb_vars['var14'] = coil;
    }
}


read_modbus = function(sflags){
    // Читаем значения из контроллера
    client.readCoils (0, 8, function (resp, err) {
        if (err) {
            eror("Ошибка чтения coils: " + err);
            closeClient();
            return;
        }
        lastresp = resp;

        read_modbus_element(sflags, 'var1', resp.coils[3]); // Гостинная
        read_modbus_element(sflags, 'var4', resp.coils[2]); // Верхний свет Детская
        read_modbus_element(sflags, 'var7', resp.coils[0]); // Верхний свет Кухня
        read_modbus_element(sflags, 'var8', resp.coils[1]); // Дополнительный свет Кухня
        read_modbus_element(sflags, 'var9', resp.coils[7]); // Туалет
        read_modbus_element(sflags, 'var10', resp.coils[6]); // Ванная
        read_modbus_element(sflags, 'var11', resp.coils[4]); // Кладовка
        read_modbus_element(sflags, 'var12', resp.coils[4]); // Коридор
    });

    client.readCoils (16, 8, function (resp, err) {
        if (err) {
            error("Ошибка чтения coils (2): " + err);
            closeClient();
            return;
        }
        lastresp = resp;

        read_modbus_element(sflags, 'var3', resp.coils[0]); //Лампа Гостиная
        read_modbus_element(sflags, 'var2', resp.coils[1]); // Шкаф Гсотиная (подсветка)
        read_modbus_element(sflags, 'var5', resp.coils[2]); // Лампа настольная
        read_modbus_element(sflags, 'var6', resp.coils[3]); // Зарезервировано
        read_modbus_element(sflags, 'var13', resp.coils[4]); // Умная розетка

        procecc_door_lock(resp.coils[5]); // Дверной замок  var14
    });

    client.readInputRegister(2, 2, function(resp, err) {
        if (err) {
            error("Ошибка чтения Мобас " + err.message);
            return;
        }

        var byte1  = resp.register[0] & 0xFF;
        var byte2 = (resp.register[0] >> 8) ;
        var byte3  = resp.register[1] & 0xFF;
        var byte4 = (resp.register[1] >> 8) ;

        power_val = decodeFloat([byte1, byte2, byte3, byte4], 1, 8, 23, -126, 127, true);
       // console.log(power_val);
    })
};

sync_element = function(vars, sflags, element, coil){
    switch (sflags[element]) {
        case SYNC_NONE:
            break;
        case SYNC_MODBUS:                   // Данные изменились в ПЛК
            debug('SYNC_MODBUS');
            vars[element] = mb_vars[element];// Обновляем GUI
            toggleLamp(vars, element);      // Записываем значение в Z-Wave актуатор
            sflags[element] = SYNC_NONE;    // Сбрасываем флаг
            debug('SYNC_MODBUS - end');
            break;
        case SYNC_GUI:                      // Данные изменились в GUI
            debug('SYNC_GUI');
            toggleCoil(coil);               // Записываем значение в ПЛК
            toggleLamp(vars, element);      // Записываем значение в Z-Wave актуатор
            sflags[element] = SYNC_NONE;    // Сбрасываем флаг
            mb_vars[element] = vars[element];
            debug('SYNC_GUI - end');
            break;
        case SYNC_ZWAVE:
            debug('SYNC_ZWAVE');
            toggleCoil(coil);               // Записываем значение в ПЛК
            sflags[element] = SYNC_NONE;    // Сбрасываем флаг
            mb_vars[element] = vars[element];
            break;
        case SYNC_TIMER:
            debug('SYNC_TIMER');
            toggleCoil(coil);               // Записываем значение в ПЛК
            toggleLamp(vars, element);      // Записываем значение в Z-Wave актуатор
            sflags[element] = SYNC_NONE;    // Сбрасываем флаг
            mb_vars[element] = vars[element];
            break;
        default:
            error('Wrong flag');
    }
};

exports.syncronize2 = function(vars, sflags){
    if (!isFlag2(sflags)) {
        read_modbus(sflags);
    } else {
        sync_element(vars, sflags, 'var1', 3); // Гостинная
        sync_element(vars, sflags, 'var4', 2); // Детская
        sync_element(vars, sflags, 'var7', 0); // Верхний свет кухня
        sync_element(vars, sflags, 'var8', 1); // Подсветка кухня
        sync_element(vars, sflags, 'var9', 7); // Туалет
        sync_element(vars, sflags, 'var10', 6); // Ванная
        sync_element(vars, sflags, 'var11', 4); // Кладовка
        sync_element(vars, sflags, 'var12', 5); // Коридор
        sync_element(vars, sflags, 'var2', 9); // Подсветка в гостиной
        sync_element(vars, sflags, 'var3', 8); // Лампа в гостиной
        sync_element(vars, sflags, 'var5', 10); // Настольная лампа
        sync_element(vars, sflags, 'var6', 11); // Резерв

        sync_element(vars, sflags, 'var13', 12); // Унмая розетка

        sync_element(vars, sflags, 'var14', 13); // Унмая розетка
    }
};

function isFlag2(sflags){
    return (sflags['var1'] != SYNC_NONE) || (sflags['var2'] != SYNC_NONE) || (sflags['var3'] != SYNC_NONE) ||
        (sflags['var4'] != SYNC_NONE)|| (sflags['var5'] != SYNC_NONE)|| (sflags['var6'] != SYNC_NONE) ||
        (sflags['var7'] != SYNC_NONE)|| (sflags['var8'] != SYNC_NONE)|| (sflags['var9']!= SYNC_NONE) ||
        (sflags['var10']!= SYNC_NONE) || (sflags['var11']!= SYNC_NONE) ||(sflags['var12']!= SYNC_NONE)||
        (sflags['var13']!= SYNC_NONE);
}

function toggleCoil(coil){
    var coil1 = coil;
    var coil_shift = 8;

    if (coil > 7) {
        coil1 = coil - 8;
        coil_shift = 24;
    }

    debug('Toggle coil: ' + coil + ". is connected: " + client.isConnected());
    if (!client.isConnected()) {
        connectModbus();
        return;
    }

    // Switch on
    client.writeSingleCoil(coil_shift+coil1 , true, function (resp, err) {
        if (err) {
            error('Error write coil: ' + err);
            closeClient();
            return;
        }
        // Switch off
        client.writeSingleCoil(coil_shift+coil1 , false, function (resp, err) {
            if (err) {
                error('Error write coil: ' + err);
                closeClient();
            }
        });
    });
}
// Для отображения лога из jsModbus
//modbus.setLogger(debug);
var client;
connectModbus();

function connectModbus() {
// create a modbus client
    log('Connecting to modbus ' + modbus_host + ':' + modbus_port);
    client = modbus.createTCPClient(modbus_port, modbus_host);
        cntr = 0;
        closeClient = function () {
            debugy('close modbus client function: ' + cntr);
            cntr += 1;
            if (cntr === 5) {
                client.close();
            }
        };
}

exports.isConnected = function() {
    return client.isConnected();
};

exports.reconnect = function() {
    debug('Reconnection...');
    connectModbus();
};

exports.getPowerValue = function() {
    return power_val;
};


// Derived from http://stackoverflow.com/a/8545403/106786
function decodeFloat(bytes, signBits, exponentBits, fractionBits, eMin, eMax, littleEndian) {
    var binary = "";
    for (var i = 0, l = bytes.length; i < l; i++) {
        var bits = bytes[i].toString(2);
        while (bits.length < 8)
            bits = "0" + bits;

        if (littleEndian)
            binary = bits + binary;
        else
            binary += bits;
    }

    var sign = (binary.charAt(0) == '1')?-1:1;
    var exponent = parseInt(binary.substr(signBits, exponentBits), 2) - eMax;
    var significandBase = binary.substr(signBits + exponentBits, fractionBits);
    var significandBin = '1'+significandBase;
    i = 0;
    var val = 1;
    var significand = 0;

    if (exponent == -eMax) {
        if (significandBase.indexOf('1') == -1)
            return 0;
        else {
            exponent = eMin;
            significandBin = '0'+significandBase;
        }
    }

    while (i < significandBin.length) {
        significand += val * parseInt(significandBin.charAt(i));
        val = val / 2;
        i++;
    }

    return sign * significand * Math.pow(2, exponent);
}
