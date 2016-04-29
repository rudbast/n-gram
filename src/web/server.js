'use strict';

/**
 * Program arguments: <directory>
 *
 * @param {string} directory Directory path which contains the ngrams index file (to be loaded upon demand)
 */

var express = require('express');
var app     = express();

var helper    = require(__dirname + '/../util/helper.js'),
    Indexer   = require(__dirname + '/../main/Indexer.js'),
    // Corrector = require(__dirname + '/../main/Corrector.js');
    // Corrector = require(__dirname + '/../ref/Setiadi.js');
    Corrector = require(__dirname + '/../ref/Verberne.js');

const DB_HOST  = 'localhost',
      DB_PORT  = '27017',
      DB_NAME  = 'autocorrect',
      WEB_PORT = '3000';

var connection,
    indexer,
    corrector;

const DISTANCE_LIMIT = 2;

var outputDir  = process.argv.length > 2 ? process.argv[2] : __dirname + '/../../out/ngrams',
    outputFile = process.argv.length > 3 ? process.argv[3] : __dirname + '/../../out/similars.json';

/** Index page. */
app.get('/', function (request, response) {
    response.send('home');
});

/** Words informations manipulation. */
app.get('/data/:action/:target', function (request, response) {
    var action = request.params.action,
        target = request.params.target;

    const totalTask = 2;

    var check = function (finishedTask, callback) {
        if (finishedTask == totalTask) {
            callback();
        }
    }

    var taskCount = 0;
    switch (action) {
        case 'load':
            if (target == 'file') {
                var finished = function () {
                    corrector = new Corrector(indexer.getData(), indexer.getSimilars());
                    response.send('finished loading informations from file.');
                }

                // Load informations.
                indexer.loadIndexFromFile(outputDir, function () {
                    check(++taskCount, finished);
                });
                indexer.loadSimilaritiesFromFile(outputFile, function () {
                    check(++taskCount, finished);
                });
            } else {}
            break;

        case 'build':
            if (target == 'file') {
                var finished = function () {
                    corrector = new Corrector(indexer.getData(), indexer.getSimilars());
                    response.send('saved index to file.');
                }

                console.time('constructIndex');

                // Construct informations.
                indexer.constructIndex(function () {
                    console.timeEnd('constructIndex');

                    // Save informations.
                    indexer.saveIndexToFile(outputDir, function () {
                        check(++taskCount, finished);

                        console.time('constructSimilarities');
                        indexer.constructSimilarities(function () {
                            console.timeEnd('constructSimilarities');

                            indexer.saveSimilaritiesToFile(outputFile, function () {
                                check(++taskCount, finished);
                            });
                        });
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

    if (!indexer || !corrector) {
        response.send('Corrector object is not constructed yet.');
        return;
    }

    if (corrector.isValid(inputWord)) {
        var responseMessage = `${inputWord} is a valid word.<br/>`;
        response.send(responseMessage + JSON.stringify(corrector.getSuggestions(inputWord)));
    } else {
        var responseMessage = `${inputWord} is not a valid word. Here is a list of similar words:<br/>`;
        response.send(responseMessage + JSON.stringify(corrector.getSuggestions(inputWord)));
    }
});

/** Route: try correcting a sentence. */
app.get('/correct/:sentence', function (request, response) {
    var inputSentence = request.params.sentence;

    if (!indexer || !corrector) {
        response.send('Indexer / Corrector object is not constructed yet.');
        return;
    }

    response.send(JSON.stringify(corrector.tryCorrect(inputSentence)));
});

// Connect to database and create new instance of 'Corrector'.
helper.connectDatabase(DB_HOST, DB_PORT, DB_NAME, function (db) {
    console.log('Connected to database.');

    connection = db;
    indexer    = new Indexer(db, DISTANCE_LIMIT);

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
