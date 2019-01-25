process.chdir(__dirname); //  для запуска как сервис

// TODO: проверть нужность массива flags - заменть его везде на sflags??
var debug = require('debug')('app');
var error = debug;

var express = require('express');
var app = express();
var config = require('config');
var server = require('http').Server(app);
var modbusapp = require('../modbus/modbusapp');
var mailer = require('../modbus/mymailer');


modbusapp.Notifier.on('doorlock', function (status, power)  {
    var text = "";
    if (status) {
        console.log('Door is locked. Current power is ', power);
        text = 'Date and Time: ' + new Date().toLocaleString();
        text += "<p>Power current is " + power.toFixed(2) +"</p>";
        mailer.sendMyData('Door is locked!', text);
    } else {
        console.log('Door is unlocked');
        text = 'Date and Time: ' + new Date().toLocaleString();
        mailer.sendMyData('Door is unlocked!', text);
    }
});


// var misc = require('../misc/mytools');
var schedule = require('node-schedule');

//var EventLogger = require('node-windows').EventLogger;
//var log2 = new EventLogger('Smart Home');

// var valid_vars = ['var3' ,'var2', 'var5', 'var13'];
var valid_vars = ['var1', 'var2', 'var3' , 'var4', 'var5', 'var6', 'var7', 'var8', 'var9', 'var10', 'var11',
        'var12',  'var13', 'var14', 'var15'];

debug('process.env.NODE_ENV = ' + process.env.NODE_ENV);
debug('process.env.DEBUG = ' + process.env.DEBUG);

var port = config.get('General.port');
debug('Set port: ' + port);

server.listen(port);

app.use(express.static('public'));
app.get('/json', function (req, res) {
    res.json({
        'mainroom' :vars['var1'],   // Гостиная
        'mainroom1' :vars['var2'],  // Гостиная резерв
        'mainroom2' :vars['var3'],  // Гостиная резерв
        'kidroom' :vars['var4'],    // Детская
        'kidroom1' :vars['var5'],   // Детская резерв
        'kidroom2' :vars['var6'],   // Детская резерв
        'kitchen' :vars['var7'],    // Верхний свет кухня
        'kitchen1' :vars['var8'],   // Подсветка кухня
        'wc' :vars['var9'],         // Туалет
        'bath' :vars['var10'],      // Ванная
        'boxroom' :vars['var11'],   // Кладовка
        'hall' :vars['var12'],      // Коридор
        'smartoutlet1' : vars['var13'], // Свет в аквариуме
        'doorlock' : vars['var14']
    });
});

WC_timer_id = 0;

app.get('/sensors', function (req, res) {
    res.writeHead(200, {'content-type': 'text/plain'});
    res.write('on: ' + req.query.on + '\n');
    res.end('That\'s all folks');

    var is_on = (String(req.query.on).toLowerCase() == 'true');
    debug('Sensor WC. Status = ' + is_on);

    if (!is_on) {
        WC_timer_id = setTimeout(function()
            {
                debug('Senosr WC. Timeout....');
                WC_timer_id = 0;
                if (vars['var9']) {
                    debug('...Turning WC light off.');
                    vars['var9'] = false;
                    flags['var9'] = true;
                }
            }, 5*60*1000);
    } else {
        if (!WC_timer_id) { clearTimeout(WC_timer_id); }
        if (!vars['var9']) {
            debug('...Turning WC light on.');
            vars['var9'] = true;
            flags['var9'] = true;
        }
    }
});

app.get('/switch', function (req, res) {
    res.writeHead(200, {'content-type': 'text/plain'});
    res.write('lamp: ' + req.query.lamp + '\n');
    res.write('on: ' + req.query.on + '\n');
    res.end('That\'s all folks');

    var lamp = Number(req.query.lamp);

    debug('Switch. Status = ' + req.query.on);

    debug('Switch. Lamp = ' + lamp);
    if (isNaN(lamp)) {
        error('... Error lamp ID');
        return;
    }
    var lamp_str_id = 'var' + lamp;
    debug('...Switching light for ' + lamp_str_id);

    if (valid_vars.indexOf(lamp_str_id)== -1)
    {
        error('Invalid lamp id: ' + lamp_str_id);
        return;
    }

    switch (String(req.query.on).toLowerCase()) {
        case '1':
        case 'true':
            vars[lamp_str_id]  = true;
            break;
        case '0':
        case 'false':
            vars[lamp_str_id]  = false;
            break;  
        case 'toggle':
            vars[lamp_str_id]  = !vars[lamp_str_id];
            break;   
        default:
            error('Invalid command: ' + req.query.on);
            return;

    }

    sflags[lamp_str_id] = modbusapp.SYNC_GUI;
    flags[lamp_str_id] = true;     
    modbusapp.syncronize2(vars, sflags);
});

debug('Start app.js ' + __dirname);

//Переменные контроллера
var vars = {
    var1: false,    // Гостинная
    var2: false,    // Гостиная резерв
    var3: false,    // Гостиная резерв
    var4: false,    // Детская
    var5: false,    // Детская резерв
    var6: false,    // Детская резерв
    var7: false,    // Верхний свет кухня
    var8: false,    // Подсветка кухня
    var9: false,    // Туалет
    var10: false,   // Ванная
    var11: false,   // Кладовка
    var12: false,    // Коридор
    var13: false,    // Свет в аквариуме
    var14: false
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
    var13: false,
    var14: false
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
    var13: 0,
    var14: 0
};

//modbusapp.syncronize(vars, flags);
modbusapp.syncronize2(vars, sflags);

var io = require('socket.io')(server);
io.on('connection', function (socket) {
    debug('Open connection to a client.');
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

var time_on = config.get('Aquarium.on');
var time_off = config.get('Aquarium.off');

ScheduleJob = function(time_str, cb, arg){
    var time = toDate(time_str,'h:m');
    var cron_str = time.getMinutes() + ' ' + time.getHours() + ' * * *';

    debug('Scheduling job. Cron string=' + cron_str + ' arg=' + arg);

    schedule.scheduleJob(cron_str, function(){
        cb(arg);
    });
};

setAquariumLight = function(status){
   debug('Turn aquarium light ' + status);
    if (status ^ vars['var13'] ) {  // XOR:  true+false or false+true
        vars['var13'] = status;
        sflags['var13'] = modbusapp.SYNC_TIMER;
    }
};

debug('Aquarium time on:  ' + time_on);
debug('Aquarium time off:  '+ time_off);

ScheduleJob(time_on, setAquariumLight, true);
ScheduleJob(time_off, setAquariumLight, false);



timerId = setInterval(function() {
    //modbusapp.readActuators(vars, flags, zflags);
    //modbusapp.syncronize(vars, flags);
    modbusapp.syncronize2(vars, sflags);

    io.emit('vars', vars);
}, 500); // интервал в миллисекундах


setInterval(function() {
    modbusapp.readActuators(vars, sflags);
    io.emit('vars', vars);
}, 2000); // интервал в миллисекундах

setInterval(function() {
    if (!modbusapp.isConnected()) {
        modbusapp.reconnect();
    }
}, 10000); // интервал в миллисекундах

function toDate(dStr,format) {
    var now = new Date();
    if (format == "h:m") {
        now.setHours(dStr.substr(0,dStr.indexOf(":")));
        now.setMinutes(dStr.substr(dStr.indexOf(":")+1));
        now.setSeconds(0);
        return now;
    }else
        return "Invalid Format";
}


/*
var timerId2 = setInterval(function() {
    modbusapp.readSensors();
}, 15000); // интервал в миллисекундах
*/
