'use strict';

/**
 * Program arguments: <directory>
 *
 * @param {string} directory Directory path which contains the ngrams index file (to be loaded upon demand)
 */

var express    = require('express'),
    app        = express(),
    bodyParser = require('body-parser');

var helper    = require(__dirname + '/../util/helper.js'),
    Indexer   = require(__dirname + '/../main/Indexer.js'),
    Corrector = require(__dirname + '/../main/Corrector.js');
    // Corrector = require(__dirname + '/../ref/Setiadi.js');
    // Corrector = require(__dirname + '/../ref/Verberne.js');

const WEB_PORT = '3000';

var connection,
    indexer,
    corrector;

const DISTANCE_LIMIT      = 2,
      DEFAULT_DATA_FILE   = __dirname + '/../../out/articles/data.json',
      DEFAULT_OUTPUT_DIR  = __dirname + '/../../out/ngrams',
      DEFAULT_OUTPUT_FILE = __dirname + '/../../out/similars.json',
      PUBLIC_PATH         = __dirname + '/public';

var dataFile   = process.argv.length > 2 ? process.argv[2] : DEFAULT_DATA_FILE,
    outputDir  = process.argv.length > 3 ? process.argv[3] : DEFAULT_OUTPUT_DIR,
    outputFile = process.argv.length > 4 ? process.argv[4] : DEFAULT_OUTPUT_FILE;

// Register url path for static files.
app.use('/assets', express.static(PUBLIC_PATH + '/assets'));
// Register post data parser.
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
    extended: true
}));

/** Index page. */
app.get('/', function (request, response) {
    response.sendFile(PUBLIC_PATH + '/index.html');
});

/** Words informations manipulation. */
app.get('/data/:action', function (request, response) {
    var action = request.params.action,
        target = request.params.target;

    const totalTask = 2;

    var check = function (finishedTask, callback) {
        if (finishedTask == totalTask) {
            callback();
        }
    }

    var finished = function () {
        corrector = new Corrector(indexer.getData(), indexer.getSimilars(), DISTANCE_LIMIT, indexer.getVocabularies());
        response.send('finished loading/saving informations from/to file.');
    }

    var taskCount = 0;
    switch (action) {
        case 'load':
                // Load informations.
                indexer.loadIndex(outputDir, function () {
                    // Fill trie data structure.
                    indexer.buildVocabularies();
                    check(++taskCount, finished);
                });
                indexer.loadSimilarities(outputFile, function () {
                    check(++taskCount, finished);
                });
            break;

        case 'build':
            console.time('constructIndex');

            // Construct informations.
            indexer.constructIndex(dataFile, function () {
                console.timeEnd('constructIndex');

                // Fill trie data structure.
                indexer.buildVocabularies();

                // Save informations.
                indexer.saveIndex(outputDir, function () {
                    check(++taskCount, finished);

                    console.time('constructSimilarities');
                    indexer.constructSimilarities(function () {
                        console.timeEnd('constructSimilarities');

                        indexer.saveSimilarities(outputFile, function () {
                            check(++taskCount, finished);
                        });
                    });
                });
            });
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
    var sentence = request.params.sentence;

    if (!corrector) {
        response.send('Indexer / Corrector object is not constructed yet.');
        return;
    }

    response.send(corrector.tryCorrect(sentence));
});

/** Route: try correcting a sentence. (POST version) */
app.post('/correct', function (request, response) {
    var sentence = request.body.sentence;

    if (!corrector) {
        response.send('Indexer / Corrector object is not constructed yet.');
        return;
    }

    response.send({corrections: corrector.tryCorrect(sentence)});
});

/** Start listening for request. */
var server = app.listen(WEB_PORT, function () {
    console.log('App listening at http://localhost:%s', WEB_PORT);
    indexer = new Indexer(DISTANCE_LIMIT);
});
