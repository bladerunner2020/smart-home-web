/**
 * Created by Bladerunner on 08/03/16.
 */

exports = module.exports = debug;
function debug(text) {
    var dt = new Date();
    dt.toLocaleDateString("ru-RU");
    var options = {  year: '2-digit', day: '2-digit', month: '2-digit', hour : '2-digit', minute : '2-digit', hour12: false };


    console.log("%s: %s", dt.toLocaleString('ru-RU', options), text);
    return debug;
}