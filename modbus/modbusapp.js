/**
 * Created by bladerunner on 18.08.2015.
 */
var modbus = require('../jsmodbus/jsModbus');
var util = require('util');
var misc = require('../misc/mytools');
var lastresp = null;

var http = require('http');

const SYNC_NONE = 0;
const SYNC_MODBUS = 2;
const SYNC_GUI = 3;
const SYNC_ZWAVE = 4;

exports.SYNC_NONE = SYNC_NONE;
exports.SYNC_MODBUS = SYNC_MODBUS;
exports.SYNC_GUI = SYNC_GUI;
exports.SYNC_ZWAVE = SYNC_ZWAVE;

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
    var url;
    switch (var_num){
        case 'var3':
            url = "http://admin:qwerty15$@192.168.2.107:8083/ZWaveAPI/Run/devices[5].Basic";
            break;
        case 'var2':
            url = "http://admin:qwerty15$@192.168.2.107:8083/ZWaveAPI/Run/devices[6].Basic";
            break;
        case 'var5':
            url = "http://admin:qwerty15$@192.168.2.107:8083/ZWaveAPI/Run/devices[7].Basic";
            break;
        case 'var13':
            url = "http://admin:qwerty15$@192.168.2.107:8083/ZWaveAPI/Run/devices[8].Basic";
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
    console.log('Toggle z-wave ' + url);
    http.get(url, function (res) {
            console.log("Got response: " + res.statusCode);
        }).on('error', function(err){
        console.log('http error: ' + err);
    }).end();
};

exports.readSensors = function(){
    var url = "http://admin:qwerty15$@192.168.2.107:8083/ZWaveAPI/Run/devices[4].SensorBinary.data[1].level.value";

    http.get(url, function(res) {
        console.log("Got response: " + res.statusCode);
        res.on('data', function (chunk) {
            console.log('BODY: ' + chunk);
            var sensor_res = (String(chunk).toLowerCase() == 'true');
            console.log('Sensor: ' + sensor_res);

        });
    });
};

readZwaveActuator = function(vars, sflags, name, id){
    var url = "http://admin:qwerty15$@192.168.2.107:8083/ZWaveAPI/Run/devices[" + id +
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
        console.log('http error: ' + err);
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
            misc.LogMessage(' ==> Set Sync Modbus');
            sflags[name] = SYNC_MODBUS;
        }
    }
};

read_modbus = function(sflags){
    // Читаем значения из контроллера
    client.readCoils (0, 8, function (resp, err) {
        if (err) {
            misc.LogMessage("Ошибка чтения coils: " + err);
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
            misc.LogMessage("Ошибка чтения coils (2): " + err);
            closeClient();
            return;
        }
        lastresp = resp;

        read_modbus_element(sflags, 'var3', resp.coils[0]); //Лампа Гостиная
        read_modbus_element(sflags, 'var2', resp.coils[1]); // Шкаф Гсотиная (подсветка)
        read_modbus_element(sflags, 'var5', resp.coils[2]); // Лампа настольная
        read_modbus_element(sflags, 'var6', resp.coils[3]); // Зарезервировано
        read_modbus_element(sflags, 'var13', resp.coils[4]); // Умная розетка
    });
};

sync_element = function(vars, sflags, element, coil){
    switch (sflags[element]) {
        case SYNC_NONE:
            break;
        case SYNC_MODBUS:                   // Данные изменились в ПЛК
            misc.LogMessage('SYNC_MODBUS');
            vars[element] = mb_vars[element];// Обновляем GUI
            toggleLamp(vars, element);      // Записываем значение в Z-Wave актуатор
            sflags[element] = SYNC_NONE;    // Сбрасываем флаг
            misc.LogMessage('SYNC_MODBUS - end');
            break;
        case SYNC_GUI:                      // Данные изменились в GUI
            misc.LogMessage('SYNC_GUI');
            toggleCoil(coil);               // Записываем значение в ПЛК
            toggleLamp(vars, element);      // Записываем значение в Z-Wave актуатор
            sflags[element] = SYNC_NONE;    // Сбрасываем флаг
            mb_vars[element] = vars[element];
            misc.LogMessage('SYNC_GUI - end');
            break;
        case SYNC_ZWAVE:
            misc.LogMessage('SYNC_ZWAVE');
            toggleCoil(coil);               // Записываем значение в ПЛК
            sflags[element] = SYNC_NONE;    // Сбрасываем флаг
            mb_vars[element] = vars[element];
            break;
        default:
            misc.LogMessage('Wrong flag');
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

    misc.LogMessage('Toggle coil: ' + coil + ". is connected: " + client.isConnected());
    if (!client.isConnected()) {
        connectModbus();
        return;
    }

    // Switch on
    client.writeSingleCoil(coil_shift+coil1 , true, function (resp, err) {
        if (err) {
            misc.LogMessage('Error write coil: ' + err);
            closeClient();
            return;
        }
        // Switch off
        client.writeSingleCoil(coil_shift+coil1 , false, function (resp, err) {
            if (err) {
                misc.LogMessage('Error write coil: ' + err);
                closeClient();
            }
        });
    });
}

modbus.setLogger(misc.LogMessage );
var client;
connectModbus();

function connectModbus() {
// create a modbus client
    misc.LogMessage('Connecting to modbus');
    client = modbus.createTCPClient(502, '192.168.2.99');
        cntr = 0;
        closeClient = function () {
            misc.LogMessage('close modbus client function: ' + cntr);
            cntr += 1;
            if (cntr === 5) {
                client.close();
            }
        };

    client.UNIT_ID = 6;
}

exports.isConnected = function() {
    return client.isConnected();
};

exports.reconnect = function() {
    console.log('Reconnection...');
    connectModbus();
};