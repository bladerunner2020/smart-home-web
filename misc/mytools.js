/**
 * Created by bladerunner on 31.08.2015.
 */


exports.LogMessage = function(msg){
    var now = new Date();
    var s = now.getDate() + "." + now.getMonth() + "." + now.getFullYear() + " " +
            now.getHours() + ":" + now.getMinutes()+ ":" + now.getSeconds() +" " + msg;
    console.log(s);
};
