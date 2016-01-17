process.chdir(__dirname); //  для запуска как сервис

var envs = require('envs');
var express = require('express');
var app = express();
var config = require('config');
var server = require('http').Server(app);
var modbusapp = require('../modbus/modbusapp');
var misc = require('../misc/mytools');

var EventLogger = require('node-windows').EventLogger;
var log = new EventLogger('Smart Home');

var WC_timer = 0;
var valid_vars = ['var3' ,'var2', 'var5', 'var13'];

misc.LogMessage('process.env.NODE_ENV = ' + process.env.NODE_ENV);

var port = config.get('General.port');
misc.LogMessage('Set port: ' + port);

var not_ok = true;
try {
    while (not_ok) {
        server.listen(port);
        not_ok = false;
    }
} catch(err) {
    misc.LogMessage(err.message);
}

app.use(express.static('public'));
app.get('/json', function (req, res) {
    res.json({
        'mainroom' :vars['var1'],   // Гостинная
        'mainroom1' :vars['var2'],  // Гостинная резерв
        'mainroom2' :vars['var3'],  // Гостинная резерв
        'kidroom' :vars['var4'],    // Детская
        'kidroom1' :vars['var5'],   // Детская резерв
        'kidroom2' :vars['var6'],   // Детская резерв
        'kitchen' :vars['var7'],    // Верхний свет кухня
        'kitchen1' :vars['var8'],   // Подсветка кухня
        'wc' :vars['var9'],         // Туалет
        'bath' :vars['var10'],      // Ванная
        'boxroom' :vars['var11'],   // Кладовка
        'hall' :vars['var12'],      // Коридор
        'smartoutlet1' : vars['var13'] // Умная розетка
    });
});

WC_timer_id = 0;

app.get('/sensors', function (req, res) {
    res.writeHead(200, {'content-type': 'text/plain'});
    res.write('on: ' + req.query.on + '\n');
    res.end('That\'s all folks');

    var is_on = (String(req.query.on).toLowerCase() == 'true');
    misc.LogMessage('Sensor WC. Status = ' + is_on);
    if (!is_on) {
        WC_timer_id = setTimeout(function()
            {
                misc.LogMessage('Senosr WC. Timeout....');
                WC_timer_id = 0;
                if (vars['var9']) {
                    misc.LogMessage('...Turning WC light off.');
                    vars['var9'] = false;
                    flags['var9'] = true;
                }
            }, 5*60*1000);
    } else {
        if (!WC_timer_id) { clearTimeout(WC_timer_id); }
        if (!vars['var9']) {
            misc.LogMessage('...Turning WC light on.');
            vars['var9'] = true;
            flags['var9'] = true;
        }
    }
});

app.get('/switch', function (req, res) {
    res.writeHead(200, {'content-type': 'text/plain'});
    res.write('lamp: ' + req.query.lamp + '\n');
    res.write('on: ' + req.query.on + '\n');
    res.write('sw: ' + req.query.sw + '\n');
    res.end('That\'s all folks');

    var lamp = Number(req.query.lamp);
    var is_on = (String(req.query.on).toLowerCase() == 'true');
    var sw = Number(req.query.sw);
    misc.LogMessage('Switch. Status = ' + is_on + ' Sw = ' + sw);

    misc.LogMessage('Switch. Lamp = ' + lamp);
    if (isNaN(lamp)) {
        misc.LogMessage('... Error lamp ID');
        return;
    }
    var lamp_str_id = 'var' + lamp;
    misc.LogMessage('...Switching light for ' + lamp_str_id);

    if (valid_vars.indexOf(lamp_str_id)== -1)
    {
        misc.LogMessage('Invalid lamp id: ' + lamp_str_id);
        return;
    }

    vars[lamp_str_id] = is_on;
    flags[lamp_str_id] = true;
    zflags[lamp_str_id] = (sw1 != 1);
});

misc.LogMessage('Start app.js ' + __dirname);

//Переменные контроллера
var vars = {
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
    var13: false    // умная розетка
};

// Индикатор переключения
var flags = {
    var1: false,
    var2: false,
    var3: false,
    var4: false,
    var5: false,
    var6: false,
    var7: false,
    var8: false,
    var9: false,
    var10: false,
    var11: false,
    var12: false,
    var13: false
};

var sflags = {
    var1: 0,
    var2: 0,
    var3: 0,
    var4: 0,
    var5: 0,
    var6: 0,
    var7: 0,
    var8: 0,
    var9: 0,
    var10: 0,
    var11: 0,
    var12: 0,
    var13: 0
};

//modbusapp.syncronize(vars, flags);
modbusapp.syncronize2(vars, sflags);

var io = require('socket.io')(server);
io.on('connection', function (socket) {
    misc.LogMessage('Open connection ');
    socket.emit('vars', vars);
    socket.on('vars', function(data){
        for(var name in data){
            var flag = (vars[name]^ data[name]); // XOR: определяем изменение статуса
            flags[name] = flag;

            if (flag) {
                sflags[name] = modbusapp.SYNC_GUI;
            }

            vars[name] = data[name];
            io.emit('vars', vars); // обновляем переменные в других клиентах
        }
    })
});

timerId = setInterval(function() {
    //modbusapp.readActuators(vars, flags, zflags);
    //modbusapp.syncronize(vars, flags);
    modbusapp.syncronize2(vars, sflags);

    io.emit('vars', vars);
}, 500); // интервал в миллисекундах


var timerId2 = setInterval(function() {
    modbusapp.readActuators(vars, sflags);

    io.emit('vars', vars);
}, 2000); // интервал в миллисекундах

var timerId3 = setInterval(function() {
    if (!modbusapp.isConnected()) {
        modbusapp.reconnect();
    }
}, 10000); // интервал в миллисекундах

/*
var timerId2 = setInterval(function() {
    modbusapp.readSensors();
}, 15000); // интервал в миллисекундах
*/