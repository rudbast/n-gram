/**
 * Spelling Corrector's server instance.
 *
 * @param  {string} load Indicates whether word index need to be loaded first
 */

'use strict';

var _          = require('lodash'),
    express    = require('express'),
    app        = express(),
    bodyParser = require('body-parser'),
    path       = require('path'),
    now        = require('performance-now');

var helper    = require(__dirname + '/../util/helper.js'),
    Indexer   = require(__dirname + '/../main/Indexer.js'),
    Corrector = require(__dirname + '/../main/Corrector.js'),
    Setiadi   = require(__dirname + '/../ref/Setiadi.js'),
    Verberne  = require(__dirname + '/../ref/Verberne.js'),
    runner    = require(__dirname + '/../main/runner.js');

const WEB_PORT = 3000;

var connection,
    indexer,
    corrector;

const DISTANCE_LIMIT = 2,
      RESULT_LIMIT   = 25,
      PUBLIC_PATH    = __dirname + '/../../public',
      FILTER_COUNT   = 10;

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
            corrector = new Corrector(indexer.getInformations(), DISTANCE_LIMIT);
            break;

        case 'setiadi':
            corrector = new Setiadi(indexer.getInformations(), DISTANCE_LIMIT);
            break;

        case 'verberne':
            corrector = new Verberne(indexer.getInformations(), DISTANCE_LIMIT);
            break;
    }

    var digits, corrections;

    digits   = helper.getDigits(sentence);
    sentence = helper.cleanInitial(sentence);

    corrections = corrector.tryCorrect(sentence);
    corrections = helper.mapCorrectionsToCollection(corrections);
    corrections = helper.limitCollection(corrections, RESULT_LIMIT);

    // If digits exists, we'll map back the original value to the corrections.
    if (!_.isNull(digits)) {
        sentence    = helper.mapBackDigits(sentence, digits);
        corrections = _.map(corrections, function (correction) {
            correction.sentence = helper.mapBackDigits(correction.sentence, digits);
            return correction;
        });
    }

    response.send({
        sentence: sentence,
        corrections: corrections
    });
});

app.post('/compare', function (request, response) {
    var sentence = request.body.sentence,
        result   = new Array();

    var correctors = [
        new Corrector(indexer.getInformations(), DISTANCE_LIMIT),
        new Setiadi(indexer.getInformations(), DISTANCE_LIMIT),
        new Verberne(indexer.getInformations(), DISTANCE_LIMIT)
    ];

    var digits, corrections;

    digits   = helper.getDigits(sentence);
    sentence = helper.cleanInitial(sentence);

    correctors.forEach(function (corrector) {
        var corrections, startTime, endTime;

        startTime   = now();
        corrections = corrector.tryCorrect(sentence);
        endTime     = now();

        corrections = helper.mapCorrectionsToCollection(corrections);
        corrections = helper.limitCollection(corrections, RESULT_LIMIT);

        // If digits exists, we'll map back the original value to the corrections.
        if (!_.isNull(digits)) {
            corrections = _.map(corrections, function (correction) {
                correction.sentence = helper.mapBackDigits(correction.sentence, digits);
                return correction;
            });
        }

        result.push({
            corrections: corrections,
            time: endTime - startTime
        });
    });

    // If digits exists, we'll map back the original value to the corrections.
    if (!_.isNull(digits)) {
        sentence = helper.mapBackDigits(sentence, digits);
    }

    response.send({
        sentence: sentence,
        comparison: result
    });
});

/** Start listening for request. */
var server = app.listen(WEB_PORT, function () {
    var message = 'App listening at http://localhost:' + WEB_PORT;
    helper.notify('Spelling Corrector Server', message);
    console.log(message + '\n');

    indexer = new Indexer(DISTANCE_LIMIT);

    if (shouldLoadInformation) {
        runner.initAndStart(indexer);
    } else {
        runner.start(indexer);
    }
});
