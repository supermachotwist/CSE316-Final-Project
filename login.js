var mysql = require('mysql');
var express = require('express');
var session = require('express-session');
var bodyParser = require('body-parser');
var path = require('path');
const url = require('url');
const { response } = require('express');

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
	//TODO: need to redirect/show results for specific employee results/////////////////////////
	if (request.session.loggedin) {
		response.sendFile(path.join(__dirname + '/views/employeeResults.html'));
	} else {
		response.send('Please login to view this page!');
	}
});

//redirects to test collection page if signed in
app.get('/testCollection', function(request, response) {
	if (request.query.str == "table") {
		//build table and send
		createTestCollectionTable(function(table) {
			response.send(table);
		});
	}
	else if (request.session.loggedin) {
		response.sendFile(path.join(__dirname + '/views/testCollection.html'));
	} else {
		response.send('Please login to view this page!');
	}
});

//Called after user enters employee id and test barcode on test collection page 
//Attempts to add values to employee_test database
app.post('/testCollection' ,function(request, response) {
	if (request.query.str == "delete") {
		//delete selected employees from employee_test table
		testCollectionDelete(request.body, function() {
			createTestCollectionTable(function(table) {
			response.send(table);
		})});
		//build table and send
	}
	else {
		var employeeID = request.body.employeeID;
		var testBarcode = request.body.testBarcode;
		//Checks to see if user has input for both sections
		if(employeeID && testBarcode){
			//Checks to see if employee ID is valid
			db.query('SELECT * FROM accounts WHERE employeeID = ?', [employeeID], function(error, results, fields) {
				//Valid ID, add data to table
				if (results.length > 0) {
					addToEmployeeTest(request, response);
					// TODO: display table for id and test barcode/////////////////////				
					response.redirect('/testCollection')
				}
					else {
					response.send('Invalid employee ID');
				}			
				
			});
		} else {
			response.send('Please enter valid employee ID and a test barcode');
		}
	}
});

//Function that adds employee ID and test barcode to employee_test database
function addToEmployeeTest(req, res) {
    var employeeID = req.body.employeeID;
	var testBarcode = req.body.testBarcode;
	let addQuery = `INSERT INTO employee_test (employeeID, testBarcode) VALUES(?,?)`;
	let add = [employeeID, testBarcode];
	db.query(addQuery, add, (err, results, fields) => {
		if(err){
			response.send("Couldn't add test")
		}
	})
}

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

//create table at /testCollection
function createTestCollectionTable(addRowCallBack) {
	//create table headers
	var tablehtml = 
	`<tr>
		<th> Select </th>
		<th> Employee ID </th>
		<th> Test Barcode </th>
	</tr>`

	db.query(`SELECT employeeID, testBarcode FROM employee_test`, function (error, results, fields) {
			if (error)
				throw console.log(error);
			for (let item of results) {
				var employeeID = item.employeeID;
				var testBarcode = item.testBarcode;
				//Create checkbox column
				tablehtml +=
					`<tr>
				<td> <input type="checkbox"></input> </td>
				<td>` + employeeID + `</td>
				<td>` + testBarcode + `</td>
			</tr>`;
			}
			addRowCallBack(tablehtml);
		});
}

//delete employee data from test collection
function testCollectionDelete(employeesToDelete, callBack) {
	for (i = 0; i < employeesToDelete.length; i++) {
		db.query(`DELETE FROM employee_test WHERE employeeID="` + employeesToDelete[i].employeeID + `" AND testBarcode="` + employeesToDelete[i].testBarcode + `";`);
	}
	callBack();
}


app.listen(3000);