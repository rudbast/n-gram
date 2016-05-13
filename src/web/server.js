'use strict';

var _          = require('lodash'),
    express    = require('express'),
    app        = express(),
    bodyParser = require('body-parser'),
    prompt     = require('prompt'),
    path       = require('path'),
    now        = require('performance-now');

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
    response.sendFile(path.resolve(PUBLIC_PATH + '/index.html'));
});

/** Compare page. */
app.get('/compare', function (request, response) {
    response.sendFile(path.resolve(PUBLIC_PATH + '/compare.html'));
});

/** About page. */
app.get('/about', function (request, response) {
    response.sendFile(path.resolve(PUBLIC_PATH + '/about.html'));
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

app.post('/compare', function (request, response) {
    var sentence = request.body.sentence;

    var correctors = [
        new Corrector(indexer.getData(), indexer.getSimilars(), DISTANCE_LIMIT, indexer.getVocabularies()),
        new Setiadi(indexer.getData(), indexer.getSimilars(), DISTANCE_LIMIT, indexer.getVocabularies()),
        new Verberne(indexer.getData(), indexer.getSimilars(), DISTANCE_LIMIT, indexer.getVocabularies())
    ];

    var result = new Array();
    correctors.forEach(function (corrector) {
        var subResult = new Object();

        var startTime = now();
        subResult.corrections = corrector.tryCorrect(sentence);
        var endTime = now();

        subResult.time = endTime - startTime;
        result.push(subResult);
    });

    response.send({comparison: result});
});

/** Start listening for request. */
var server = app.listen(WEB_PORT, function () {
    var message = 'App listening at http://localhost:' + WEB_PORT;
    helper.notify('Spelling Corrector Server', message);
    console.log(message);

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
