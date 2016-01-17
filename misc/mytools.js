/**
 * Created by bladerunner on 31.08.2015.
 */
var argv = require('optimist').argv;
var debug = argv.debug;

exports.LogMessage = function(msg){
    if (debug) {
        var now = new Date();
        var s = now.getDate() + "." + now.getMonth() + "." + now.getFullYear() + " " +
            now.getHours() + ":" + now.getMinutes() + ":" + now.getSeconds() + " " + msg;
        console.log(s);
    }
};
