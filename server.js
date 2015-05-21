var express = require('express');
var app = require("./wrio_app.js").init(express);
var nconf = require("./wrio_nconf.js").init();
var server = require('http').createServer(app).listen(nconf.get("server:port"));

var aws = require("./aws.js")

app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');


var wrioLogin = require('./wriologin');

var session = require('express-session');
var SessionStore = require('express-mysql-session');
var cookieParser = require('cookie-parser');



MYSQL_HOST = nconf.get("db:host");
MYSQL_USER = nconf.get("db:user");
MYSQL_PASSWORD = nconf.get("db:password");
MYSQL_DB = nconf.get("db:dbname");
DOMAIN= nconf.get("db:workdomain");


var session_options = {
    host: MYSQL_HOST,
    port: 3306,
    user: MYSQL_USER,
    password: MYSQL_PASSWORD,
    database: MYSQL_DB
}

var cookie_secret = nconf.get("server:cookiesecret");
var sessionStore = new SessionStore(session_options);
app.use(cookieParser(cookie_secret));
app.use(session(
    {

        secret: cookie_secret,
        saveUninitialized: true,
        store: sessionStore,
        resave: true,
        cookie: {
            secure:false,
            domain:DOMAIN,
            maxAge: 1000 * 60 * 24 * 30
        },
        key: 'sid'
    }
));

function returndays(response,days) {
    response.render('index.ejs',{"url":"http://webrunes.com","days":30-days});
}

app.get('/', function (request, response) {

    console.log(request.sessionID);
    wrioLogin.checkSessionExists(request.sessionID, function(exists,data) {
        if (!exists) {
            console.log("Session not exists");
            wrioLogin.storageCreateTempRecord(request.sessionID, function(err,data) {
                if (err) {
                    console.log(err);
                }
                returndays(response,deltadays);
                var id = wrioLogin.convertDbIDtoUserID(data);
                console.log(id);
                aws.createTemplates(id);
                returndays(response,0);
            });
        } else {
            var delta = new Date().getTime() - data.expire_date;
            var deltadays = Math.round(delta / (24*60*60*1000));
            console.log("Session exists",delta,deltadays);
            returndays(response,deltadays);
        }
    });

  /*  wrioLogin.loginWithSessionId(request.sessionID,function(err,res) {
        if (err) {
            console.log("User not found")
            response.render('index.ejs',{"error":"Not logged in","user":undefined});
        } else {
            response.render('index.ejs',{"user":res});
            console.log("User found "+res);
        }
    })*/
});


app.get('/logoff',function(request,response) {
    console.log("Logoff called");
    response.clearCookie('sid',{'path':'/','domain':DOMAIN});
    response.redirect('/');

});
