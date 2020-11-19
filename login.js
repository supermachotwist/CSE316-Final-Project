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

//Directs to labtech login page "Default login page"
app.get('/', function(request, response) {
	response.sendFile(path.join(__dirname + '/views/login.html'));
});

//Directs to labtech login page
app.get('/labtech', function(request, response) {
	response.sendFile(path.join(__dirname + '/views/login.html'));
});

//Directs to employee login page
app.get('/employee', function(request, response) {
	response.sendFile(path.join(__dirname + '/views/employeeLogin.html'));
});

//Called after user presses submit and takes them to test collection page or lab home page depending on submit button
app.post('/collector', function(request, response) {
	var email = request.body.email;
	var passcode = request.body.passcode;
	var str = request.body.collectorLogin;
	//Matches user info with employees database
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
//Called after user presses submit and takes them to test collection page or lab home page depending on submit button
app.post('/authEmployee', function(request, response) {
	var email = request.body.email;
	var passcode = request.body.passcode;
	//Matches user info with employees database
	if (email && passcode) {
		db.query('SELECT * FROM accounts WHERE email = ? AND passcode = ?', [email, passcode], function(error, results, fields) {
			if (results.length > 0) {
				request.session.loggedin = true;
				response.redirect('/employeeResults');
			}
			 else {
				response.send('Incorrect Email and/or Passcode!');
			}			
			response.end();
		});
	} else {
		response.send('Please enter Email and Passcode!');
		response.end();
	}
});
//redirects to lab home page if signed in
app.get('/labHome', function(request, response) {
	if (request.session.loggedin) {
		response.sendFile(path.join(__dirname + '/views/labHome.html'));
	} else {
		response.send('Please login to view this page!');
	}
});

//redirects to Employee results page if signed in
app.get('/employeeResults', function(request, response) {
	//TODO: 
	//need to redirect/show results for specific employee results
	if (request.session.loggedin) {
		response.sendFile(path.join(__dirname + '/views/employeeResults.html'));
	} else {
		response.send('Please login to view this page!');
	}
});

//redirects to test collection page if signed in
app.get('/testCollection', function(request, response) {
	if (request.session.loggedin) {
		response.sendFile(path.join(__dirname + '/views/testCollection.html'));
	} else {
		response.send('Please login to view this page!');
	}
});

//Called after user presses pool mapping button or well testing button in "Lab Home Page"
app.post('/redirectFromLabHome', function(request, response) {
	var str = request.body.poolMapping;
	if ("Pool Mapping" === str) {
		response.redirect('/poolMapping');
	}
	else{
		response.redirect('/wellTesting');
	} 		
	response.end();
});

//redirects to pool mapping page if signed in
app.get('/poolMapping', function(request, response) {
	if (request.session.loggedin) {
		response.sendFile(path.join(__dirname + '/views/poolMapping.html'));
	} else {
		response.send('Please login to view this page!');
	}
});

//redirects to well testing page if signed in
app.get('/wellTesting', function(request, response) {
	if (request.session.loggedin) {
		response.sendFile(path.join(__dirname + '/views/wellTesting.html'));
	} else {
		response.send('Please login to view this page!');
	}
});
app.listen(3000);