'use strict';

/**
 * Program arguments: <1: data file> <2: output directory (ngrams)> <3: output file (words similars)>
 *
 * @param {string} directory Directory path which contains the ngrams index file (to be loaded upon demand)
 */

var _          = require('lodash'),
    express    = require('express'),
    app        = express(),
    bodyParser = require('body-parser'),
    prompt     = require('prompt');

var helper    = require(__dirname + '/../util/helper.js'),
    Indexer   = require(__dirname + '/../main/Indexer.js'),
    Corrector = require(__dirname + '/../main/Corrector.js'),
    Setiadi   = require(__dirname + '/../ref/Setiadi.js'),
    Verberne  = require(__dirname + '/../ref/Verberne.js'),
    runner    = require(__dirname + '/runner.js');

const WEB_PORT = 3000;

var connection,
    indexer,
    corrector;

const DISTANCE_LIMIT = 2,
      PUBLIC_PATH    = __dirname + '/../../public';

var shouldLoadInformation = _.isUndefined(process.argv[2]) ? false : (process.argv[2] == 'load' ? true : false);

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

/** Start listening for request. */
var server = app.listen(WEB_PORT, function () {
    console.log('App listening at http://localhost:%s', WEB_PORT);
    indexer = new Indexer(DISTANCE_LIMIT);

    /**
     * Start runner.
     *
     * @return {void}
     */
    function startRunner() {
        prompt.start();
        runner.waitForCommandInput(prompt, indexer);
    }

    console.log();
    if (shouldLoadInformation) {
        runner.initInformation(indexer, startRunner);
    } else {
        startRunner();
    }
});
