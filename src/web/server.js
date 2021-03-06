/**
 * Spelling Corrector's server instance.
 *
 * @param {string} port  Port to listen to
 * @param {string} load  Indicates whether word index need to be loaded first
 * @param {string} limit The limit for words' distance
 * @param {string} mode  The words' distance computation method
 */

'use strict';

var _          = require('lodash'),
    express    = require('express'),
    app        = express(),
    bodyParser = require('body-parser'),
    path       = require('path'),
    now        = require('performance-now'),
    argv        = require('yargs').argv;

var helper    = require(__dirname + '/../util/helper.js'),
    Default   = require(__dirname + '/../util/Default.js'),
    Indexer   = require(__dirname + '/../main/Indexer.js'),
    Corrector = require(__dirname + '/../main/Corrector.js'),
    Setiadi   = require(__dirname + '/../ref/Setiadi.js'),
    Verberne  = require(__dirname + '/../ref/Verberne.js'),
    runner    = require(__dirname + '/../main/runner.js');

var connection,
    indexer,
    corrector;

const PUBLIC_PATH          = __dirname + '/../../public',
      DEFAULT_WEB_PORT     = 3000;

var shouldLoadInformation = !_.isUndefined(argv.load),
    webPort               = _.isUndefined(argv.port) ? DEFAULT_WEB_PORT : argv.port,
    resultLimit           = _.isUndefined(argv.result) ? Default.SUGGESTIONS_LIMIT : argv.result,
    distanceLimit         = _.isUndefined(argv.limit) ? Default.DISTANCE_LIMIT : argv.limit,
    distanceMode          = _.isUndefined(argv.mode) ? Default.DISTANCE_MODE : argv.mode;

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
            corrector = new Corrector(indexer.getInformations(), { distLimit: distanceLimit, distMode: distanceMode });
            break;

        case 'setiadi':
            corrector = new Setiadi(indexer.getInformations(), { distLimit: distanceLimit });
            break;

        case 'verberne':
            corrector = new Verberne(indexer.getInformations(), { distLimit: distanceLimit });
            break;
    }

    var digits, corrections;

    digits   = helper.getDigits(sentence);
    sentence = helper.cleanInitial(sentence);

    corrections = corrector.tryCorrect(sentence, resultLimit);
    corrections = helper.mapCorrectionsToCollection(corrections);

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

/** Route: Compare different spelling correction system. */
app.post('/compare', function (request, response) {
    var sentence = request.body.sentence,
        result   = new Array();

    var correctors = [
        new Corrector(indexer.getInformations(), { distLimit: distanceLimit }),
        new Setiadi(indexer.getInformations(), { distLimit: distanceLimit }),
        new Verberne(indexer.getInformations(), { distLimit: distanceLimit })
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
        corrections = helper.limitCollection(corrections, resultLimit);

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
var server = app.listen(webPort, function () {
    var message = 'App listening at http://0.0.0.0:' + webPort;
    helper.notify('Spelling Corrector Server', message);
    console.log(message + '\n');

    indexer = new Indexer({ distLimit: distanceLimit, distMode: distanceMode });

    if (shouldLoadInformation) {
        runner.initAndStart(indexer);
    } else {
        runner.start(indexer);
    }
});
