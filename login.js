var mysql = require('mysql');
var express = require('express');
var session = require('express-session');
var bodyParser = require('body-parser');
var path = require('path');

var db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'password',
    database: 'cse316'
});

var app = express();
app.use(session({
	secret: 'secret',
	resave: true,
	saveUninitialized: true
}));
app.use(bodyParser.urlencoded({extended : true}));
app.use(bodyParser.json());

//Directs to login page
app.get('/', function(request, response) {
	response.sendFile(path.join(__dirname + '/login.html'));
});

//Called after user presses submit and takes them to test collection page or lab home page depending on submit button
app.post('/collector', function(request, response) {
	var email = request.body.email;
	var passcode = request.body.passcode;
	var str = request.body.collectorLogin;
	if (email && passcode) {
		db.query('SELECT * FROM accounts WHERE email = ? AND passcode = ?', [email, passcode], function(error, results, fields) {
			if (results.length > 0 && "Login Collector" === str) {
				request.session.loggedin = true;
				response.redirect('/testCollection');
			}
			else if (results.length > 0){
				request.session.loggedin = true;
				response.redirect('/labHome');
			} else {
				response.send('Incorrect Email and/or Passcode!');
			}			
			response.end();
		});
	} else {
		response.send('Please enter Email and Passcode!');
		response.end();
	}
});

//redirects to lab home page
app.get('/labHome', function(request, response) {
	if (request.session.loggedin) {
		response.sendFile(path.join(__dirname + '/labHome.html'));
	} else {
		response.send('Please login to view this page!');
	}
});

//redirects to test collection page
app.get('/testCollection', function(request, response) {
	if (request.session.loggedin) {
		response.sendFile(path.join(__dirname + '/testCollection.html'));
	} else {
		response.send('Please login to view this page!');
	}
});
app.listen(3000);