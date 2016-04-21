var express = require('express');
var app     = express();

var helper    = require(__dirname + '/../util/Helper.js'),
    Corrector = require(__dirname + '/../main/Corrector.js');

const DB_HOST  = 'localhost',
      DB_PORT  = '27017',
      DB_NAME  = 'autocorrect'
      WEB_PORT = '3000';

var connection,
    corrector;

var outputDir = process.argv[2];

/** Index page. */
app.get('/', function (request, response) {
    response.send('home');
});

/** Words index manipulation. */
app.get('/index/:action/:target', function (request, response) {
    var action = request.params.action,
        target = request.params.target;

    switch (action) {
        case 'load':
            if (target == 'file') {
                corrector.loadIndexFromFile(outputDir, function () {
                    corrector.fillVocabularyListFromIndex();

                    response.send('finished loading index from file.');
                });
            } else {}
            break;

        case 'build':
            if (target == 'file') {
                corrector.constructIndex(function () {
                    corrector.saveIndexToFile(outputDir, function () {
                        corrector.fillVocabularyListFromIndex();
                        response.send('saved index to file.');
                    });
                });
            } else {}
            break;
    }
});

/** Route: check word validity. */
app.get('/check/:word/:limit', function (request, response) {
    var inputWord     = request.params.word,
        distanceLimit = request.params.limit;

    if (corrector.checkWordValidity(inputWord)) {
        var responseMessage = `${inputWord} is a valid word.`;
        response.send(responseMessage + JSON.stringify(corrector.getSuggestion(inputWord, distanceLimit)));
    } else {
        var responseMessage = `${inputWord} is not a valid word. Here is a list of similar words:<br/>`;
        response.send(responseMessage + JSON.stringify(corrector.getSuggestion(inputWord, distanceLimit)));
    }
});

// Connect to database and create new instance of 'Corrector'.
helper.connectDatabase(DB_HOST, DB_PORT, DB_NAME, function (db) {
    console.log('Connected to database.');

    connection = db;
    corrector  = new Corrector(connection);

    process.on('exit', function () {
        connection.close();
        console.log('Database connection closed.')
    });
});

/** Start listening for request. */
var server = app.listen(WEB_PORT, function () {
    var host = server.address().address;
    var port = server.address().port;

    console.log('App listening at http://%s:%s', host, port);
});
