/**
 * Created by bladerunner on 08.03.2016.
 */
 var config = require('./save-config');
var nodemailer = require("nodemailer");
var xoauth2 = require("xoauth2"),
    xoauth2gen;


var myClientID = config.get('Mailer.ClientID');
var myClientSecret = config.get('Mailer.Secret');
var myRefreshToken = config.get('Mailer.RefreshToken');
var myUser =  config.get('Mailer.UserID');
var myTo = config.get('Mailer.To');

var myAccessToken = '';

xoauth2gen = xoauth2.createXOAuth2Generator({
    user: myUser,
    clientId: myClientID,
    clientSecret: myClientSecret,
    refreshToken: myRefreshToken,
    customHeaders: {
        "HeaderName": "HeaderValue"
    },
    customPayload: {
        "payloadParamName": "payloadValue"
    }
});

xoauth2gen.on("token", function(token){
    myAccessToken = token.accessToken;

    console.log("User: ", token.user); // e-mail address
    console.log("New access token: ", myAccessToken);
    console.log("New access token timeout: ", token.timeout); // TTL in seconds
});


// SMTP/IMAP
/*
 xoauth2gen.getToken(function(err, token){
 if(err){
 return console.log(err);
 }
 console.log("AUTH XOAUTH2 " + token);
 });
 */

// HTTP

module.exports.sendMyData = sendMyData;
function sendMyData(subject, message) {
    xoauth2gen.getToken(function(err, token, accessToken){
        if(err){
            return console.log(err);
        }
        console.log("Authorization: Bearer " + accessToken);
    });

    var transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            xoauth2: xoauth2gen
            /*
             xoauth2: xoauth2.createXOAuth2Generator({
             user: "pivovarov@gmail.com",
             clientId: '795895241053-jnacco3e77rrglfnh8unvajp5490ugar.apps.googleusercontent.com',
             clientSecret: 'ty3kimJ3EAT3L1uQvT256yAS',
             refreshToken: '1/0uNhk6-YK9wLQ9J2aXfh_FfAHMTmz7TS65o5oApkZYE',
             accessToken: 'ya29.ngLmordlhhHcuilUnnNnVqUsyTTsrobDxtgpz5DPtEvxn0Ww7nqcBxN5AuJUBWd0MA'

             })
             */
        }
    });

    transporter.verify(function(error, success) {
        if (error) {
            console.log(error);
        } else {
            console.log('Server is ready to take our messages ');
            var mailOptions = {
                from: myUser,
                to: myTo,
                subject: subject,
                generateTextFromHTML: true,
                html: message
            };


            transporter.sendMail(mailOptions, function(error, response) {
                if (error) {
                    console.log(error);
                } else {
                    console.log(response);
                }
                transporter.close();
            });
        }
    });


}




