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
			if (error) {
				console.log(error);
			}
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

//Called after user presses pool mapping button or well testing button in "Lab Home Page"
app.post('/redirectFromLabHome', function(request, response) {
	var str = request.body.poolMapping;
	if ("Pool Mapping" === str) {
		response.redirect('/poolMapping');
	}
	else{
		response.redirect('/wellTesting');
	} 		
	//response.end();
});

////////////////////////////////////////////////////////////Test Collection///////////////////////////////////////////////////////////
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
				if(error){
					response.send("Cannot add employee and test barcode. Please remove from other testing pools");
				}
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
	var today = new Date();
	today = today.toISOString().slice(0,19).replace('T',' ');
	let addQuery = `INSERT INTO employee_test (employeeID, testBarcode, collectionTime) VALUES(?,?,?)`;
	let add = [employeeID, testBarcode, today];
	db.query(addQuery, add, (err, results, fields) => {
		if(err){
			response.send("Couldn't add test")
		}
	})
}

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
		db.query(`DELETE FROM employee_test WHERE employeeID="` + employeesToDelete[i].employeeID + `" AND testBarcode="` + employeesToDelete[i].testBarcode + `";`, function(error) {
			if(error){
				response.send("Cannot delete test");
			}
		});
	}
	callBack();
}

////////////////////////////////////////////////////////////Pool Mapping///////////////////////////////////////////////////////////
//Flag for editing tables
var flag = 0; 

//redirects to pool mapping page if signed in
app.get('/poolMapping', function(request, response) {
	if (request.query.str == "table") {
		//build table and send
		createPoolTable(function(table) {
			response.send(table);
		});
	}
	else if (request.session.loggedin) {
		response.sendFile(path.join(__dirname + '/views/poolMapping.html'));
	} else {
		response.send('Please login to view this page!');
	}
});

//Validates input from well_testing page and also builds the table
app.post('/poolMapping' ,function(request, response) {
	if (request.query.str == "delete") {
		//delete selected employees from employee_test table
		poolTableDelete(request.body, function() {
			createPoolTable(function(table) {
			response.send(table);
		})});
		//build table and send
	}
	else if(request.query.str == "edit") {
		flag = 1;
	}
	//add to the table and database
	else {
		var poolBarcode = request.body.poolBarcode;
		var testBarcodes = request.body.testBarcodes;
		if (!Array.isArray(testBarcodes)) { //Convert string into array
			testBarcodes = [testBarcodes];
		}
		//Checks to see if user has input for both sections
		if(poolBarcode && testBarcodes.length > 0){
			//Check if all testBarcodes are valid and non overlapping
			for (var i = 0; i < testBarcodes.length; i++) {
				//Checks to see if all testBarcodes are valid before adding to database
				(function(index) {
					db.query('SELECT * FROM employee_test WHERE testBarcode = ?', [testBarcodes[index]], function(error, results, fields) {
						//Valid Barcode, repeat for all Barcodes
						if (results.length > 0) {
							if (flag == 1) { //if editing, remove from table before adding barcodes
								poolTableDelete(poolBarcode, function() {
									addToPoolMap(poolBarcode, testBarcodes[index]);
									flag = 0;
								});
							}
							else {
								addToPoolMap(poolBarcode, testBarcodes[index]);
							}
							if (index == testBarcodes.length - 1) {
								flag = 0;
								response.redirect('/poolMapping');
							}
						}
						else {
							response.send('Invalid test barcode');
						}			
					});
				})(i);
			}
		} else {
			response.send('Please enter valid pool barcode and test barcode');
		}
	}
});

//Adds poolMapping data to pool and pool_map table
function addToPoolMap(poolBarcode, testBarcode) {
	let addQ = `INSERT INTO pool (poolBarcode) VALUES(?)`;
	//If adding to database for first time
	let a = [poolBarcode];
	//add to pool table
	db.query(addQ, a, (err, results, fields) => {
		if(err){
			console.log(err);
		}
	})
	//add to pool_map table
	let addQuery = `INSERT INTO pool_map (testBarcode, poolBarcode) VALUES(?,?)`;
	let add = [testBarcode, poolBarcode];
	db.query(addQuery, add, (err, results, fields) => {
		if(err){
			console.log(err);
		}
	})
}

//create table at /poolMapping
function createPoolTable(addRowCallBack) {
	//create table headers
	var tablehtml = 
	`<tr>
		<th> Select </th>
		<th> Pool barcode </th>
		<th> Test barcode </th>
	</tr>`

	db.query(`SELECT poolBarcode, GROUP_CONCAT(testBarcode) AS testBarcodes FROM pool_map GROUP BY poolBarcode;`, function (error, results, fields) {
			if (error)
				throw console.log(error);
			for (let item of results) {
				var poolBarcode = item.poolBarcode;
				var testBarcodes = item.testBarcodes;
				//Create checkbox column
				tablehtml +=
					`<tr>
				<td> <input type="checkbox"></input></td>
				<td>` + poolBarcode + `</td>
				<td>` + testBarcodes + `</td>
			</tr>`;
			}
			addRowCallBack(tablehtml);
		});
}

//delete well data from well collection
function poolTableDelete(poolToDelete, callBack) {
	if (!Array.isArray(poolToDelete)) { //Convert singular string to array
		poolToDelete = [{poolBarcode:poolToDelete}];
	}
	for (i = 0; i < poolToDelete.length; i++) {
		(function(index) {
			db.query(`DELETE FROM pool_map WHERE poolBarcode="` + poolToDelete[index].poolBarcode + `";`, function(error) {
				if(error){
					response.send("Cannot delete pool");
				}
			});
			db.query(`DELETE FROM pool WHERE poolBarcode="` + poolToDelete[index].poolBarcode + `";`, function(error) {
				if(error){
					response.send("Cannot delete pool");
				}
			});
		})(i);
		
	}
	callBack();
}


//////////////////////////////////////////////////////////////Well Testing//////////////////////////////////////////////////////////////////

//redirects to well testing page if signed in
app.get('/wellTesting', function(request, response) {
	if (request.query.str == "table") {
		//build table and send
		createWellTable(function(table) {
			response.send(table);
		});
	}
	else if (request.session.loggedin) {
		response.sendFile(path.join(__dirname + '/views/wellTesting.html'));
	} else {
		response.send('Please login to view this page!');
	}
});

//Validates input from well_testing page and also builds the table
app.post('/wellTesting' ,function(request, response) {
	if (request.query.str == "delete") {
		//delete selected employees from employee_test table
		wellTableDelete(request.body, function() {
			createWellTable(function(table) {
			response.send(table);
		})});
		//build table and send
	}
	else if(request.query.str == "edit") {
		flag = 1;
	}
	else {
		var wellBarcode = request.body.wellBarcode;
		var poolBarcode = request.body.poolBarcode;
		//Checks to see if user has input for both sections
		if(wellBarcode && poolBarcode){
			//Checks to see if employee ID is valid
			db.query('SELECT * FROM pool WHERE poolBarcode = ?', [poolBarcode], function(error, results, fields) {
				//Valid ID, add data to table
				if (results.length > 0) {
					addToWellTesting(request, response);
				}
					else {
					response.send('Invalid pool barcode');
				}			
				
			});
		} else {
			response.send('Please enter valid well barcode and a pool barcode');
		}
	}
});

//Adds well_testing data to well_testing data
function addToWellTesting(request, response) {
    var wellBarcode = request.body.wellBarcode;
	var poolBarcode = request.body.poolBarcode;
	var result = request.body.results;
	var today = new Date();
	var endDate = new Date();
	endDate.setDate(today.getDate() + 2);

	//Converts dates to mysql datetime format
	today = today.toISOString().slice(0,19).replace('T',' ');
	endDate = endDate.toISOString().slice(0,19).replace('T',' ');
	let addQ = `INSERT INTO well (wellBarcode) VALUES(?)`;
	//If adding to database for first time
	if(flag == 0){
		let a = [wellBarcode];
		db.query(addQ, a, (err, results, fields) => {
			if(err){
			}
		})
		let addQuery = `INSERT INTO well_testing (poolBarcode, wellBarcode, testingStartTime, testingEndTime, result) VALUES(?,?,?,?,?)`;
		let add = [poolBarcode, wellBarcode, today, endDate, result];
		db.query(addQuery, add, (err, results, fields) => {
			if(err){
			}
		})
	}
	//Editing the database
	else{
		db.query(`Update well_testing set result ="`+ result + `" WHERE wellBarcode="` + wellBarcode + `" AND poolBarcode="` + poolBarcode + `";`);
	}
	flag = 0;
	response.redirect('/wellTesting')
}

//create table at /wellTesting
function createWellTable(addRowCallBack) {
	//create table headers
	var tablehtml = 
	`<tr>
		<th> Select </th>
		<th> Well barcode </th>
		<th> Pool barcode </th>
		<th> Result </th>
	</tr>`

	db.query(`SELECT poolBarcode, wellBarcode, result FROM well_testing`, function (error, results, fields) {
			if (error)
				throw console.log(error);
			for (let item of results) {
				var poolBarcode = item.poolBarcode;
				var wellBarcode = item.wellBarcode;
				var result = item.result;
				//Create checkbox column
				tablehtml +=
					`<tr>
				<td> <input type="checkbox"></input></td>
				<td>` + wellBarcode + `</td>
				<td>` + poolBarcode + `</td>
				<td>` + result + `</td>
			</tr>`;
			}
			addRowCallBack(tablehtml);
		});
}

//delete well data from well collection
function wellTableDelete(wellToDelete, callBack) {
	for (i = 0; i < wellToDelete.length; i++) {
		var j = i;
		db.query(`DELETE FROM well_testing WHERE wellBarcode="` + wellToDelete[j].wellBarcode + `" AND poolBarcode="` + wellToDelete[j].poolBarcode + `";`);
		db.query(`DELETE FROM well WHERE wellBarcode="` + wellToDelete[j].wellBarcode + `";`);
	}
	callBack();
}

////////////////////////////////////////////////////////////Employee Results///////////////////////////////////////////////////////////
//redirects to Employee results page if signed in
app.get('/employeeResults', function(request, response) {
	if (request.query.str == "table") {
		//build table and send
		createEmployeeResultsTable(function(table) {
			response.send(table);
		});
	}
	else if (request.session.loggedin) {
		response.sendFile(path.join(__dirname + '/views/employeeResults.html'));
	} else {
		response.send('Please login to view this page!');
	}
});


//create table at /wellTesting
function createEmployeeResultsTable(addRowCallBack) {
	//create table headers
	var tablehtml = 
	`<tr>
		<th> Collection Date </th>
		<th> Results </th>
	</tr>`

	db.query(`select E.collectionTime, W.result from employee_test E,
				(select PM.testBarcode, A.result from pool_map PM,
					(select P.poolBarcode, WT.result from pool P, well_testing WT where P.poolBarcode = WT.poolBarcode) as A
					where PM.poolBarcode = A.poolBarcode) as W
				where W.testBarcode = E.testBarcode;`, 
				function (error, results, fields) {
			if (error)
				throw console.log(error);
			for (let item of results) {
				var collectionTime = item.collectionTime;
				var result = item.result;
				//Create checkbox column
				tablehtml +=
					`<tr>
				<td>` + collectionTime + `</td>
				<td>` + result + `</td>
			</tr>`;
			}
			addRowCallBack(tablehtml);
		});
}

app.listen(3000);