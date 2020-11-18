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

app.get('/', function(request, response) {
	response.sendFile(path.join(__dirname + '/login.html'));
});

app.post('/auth', function(request, response) {
	var email = request.body.email;
	var passcode = request.body.passcode;
	if (email && passcode) {
		db.query('SELECT * FROM accounts WHERE email = ? AND passcode = ?', [email, passcode], function(error, results, fields) {
			if (results.length > 0) {
				request.session.loggedin = true;
				request.session.email = email;
				response.redirect('/home');
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

app.get('/home', function(request, response) {
	if (request.session.loggedin) {
		response.sendFile(path.join(__dirname + '/home.html'));
	} else {
		response.send('Please login to view this page!');
	}
	response.end();
});
app.listen(3000);