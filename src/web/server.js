'use strict';

/**
 * Program arguments: <1: data file> <2: output directory (ngrams)> <3: output file (words similars)>
 *
 * @param {string} directory Directory path which contains the ngrams index file (to be loaded upon demand)
 */

var express    = require('express'),
    app        = express(),
    bodyParser = require('body-parser');

var helper    = require(__dirname + '/../util/helper.js'),
    Indexer   = require(__dirname + '/../main/Indexer.js'),
    Corrector = require(__dirname + '/../main/Corrector.js'),
    Setiadi   = require(__dirname + '/../ref/Setiadi.js'),
    Verberne  = require(__dirname + '/../ref/Verberne.js');

const WEB_PORT = 3000;

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

/** Route: try correcting a sentence. */
app.post('/correct', function (request, response) {
    var sentence = request.body.sentence,
        type     = request.body.type;

    switch (type) {
        case 'custom':
            corrector = new Corrector(indexer.getData(), indexer.getSimilars(), DISTANCE_LIMIT, indexer.getVocabularies());
            break;

        case 'setiadi':
            corrector = new Setiadi(indexer.getData(), indexer.getSimilars(), DISTANCE_LIMIT, indexer.getVocabularies());
            break;

        case 'verberne':
            corrector = new Verberne(indexer.getData(), indexer.getSimilars(), DISTANCE_LIMIT, indexer.getVocabularies());
            break;
    }

    response.send({corrections: corrector.tryCorrect(sentence)});
});

/**
 * Load / build informations needed by the spelling corrector.
 *
 * @return {void}
 */
function initInformation() {
    // Try load index information.
    indexer.loadIndex(outputDir, function (dataLength) {
        // If index is empty, we'll build them.
        if (dataLength == 0) {
            // Construct index informations.
            indexer.constructIndex(dataFile, function () {
                console.log('Finished building index informations.');
                indexer.buildVocabularies();

                // Save informations.
                indexer.saveIndex(outputDir, function () {
                    console.log('Finished saving index informations.');
                });

                // Construct words similarity information.
                indexer.constructSimilarities(function () {
                    console.log('Finished building words similarity informations.');

                    // Save the other informations.
                    indexer.saveSimilarities(outputFile, function () {
                        console.log('Finished saving words similarity informations.');
                        indexer.printDataInformation();
                    });
                });
            });
        } else {
            indexer.buildVocabularies();
            indexer.loadSimilarities(outputFile, function () {
                console.log('Finished loading all informations.');
                indexer.printDataInformation();
            });
        }
    });
}

/** Start listening for request. */
var server = app.listen(WEB_PORT, function () {
    console.log('App listening at http://localhost:%s', WEB_PORT);
    indexer = new Indexer(DISTANCE_LIMIT);

    initInformation();
});
