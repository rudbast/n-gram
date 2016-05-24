/**
 * Compute the accuracy of the spelling correction's corrector.
 *
 * @param {string} distanceLimit Word distance limit (used when correcting words)
 * @param {string} inputFile     Sentences' file used for testing
 * @param {string} indexDir      Ngram's index information (uni/bi/tri) file directory
 * @param {string} trieFile      Ngram's trie information file
 * @param {string} similarFile   Ngram's word similarity information file
 */

'use strict';

var _           = require('lodash'),
    assert      = require('assert'),
    jsFile      = require('jsonfile'),
    ProgressBar = require('progress');

var Indexer   = require(__dirname + '/../main/Indexer.js'),
    ngramUtil = require(__dirname + '/../util/ngram.js'),
    helper    = require(__dirname + '/../util/helper.js'),
    Corrector = require(__dirname + '/../misc/Corrector.js'),
    Setiadi   = require(__dirname + '/../ref/Setiadi.js'),
    Verberne  = require(__dirname + '/../ref/Verberne.js');

var ngramConst = new ngramUtil.NgramConstant();

const DEFAULT_SENTENCES_FILE  = __dirname + '/../../res/eval/accuracy.json',
      DEFAULT_TRIE_FILE       = __dirname + '/../../out/trie.json',
      DEFAULT_INDEX_DIR       = __dirname + '/../../out/ngrams',
      DEFAULT_SIMILARITY_FILE = __dirname + '/../../out/similars.json',
      DEFAULT_REPORT_FILE     = __dirname + '/../../out/eval/accuracy.json';

var indexer = new Indexer(),
    corrector;

// Main.
main(process.argv.slice(2));

/**
 * Main logic container.
 *
 * @param {Array} args List of program's arguments
 */
function main(args) {
    var distanceLimit = _.isUndefined(args[0]) ? DEFAULT_DISTANCE_LIMIT : args[0],
        inputFile     = _.isUndefined(args[1]) ? DEFAULT_SENTENCES_FILE : args[1],
        indexDir      = _.isUndefined(args[2]) ? DEFAULT_INDEX_DIR : args[2],
        trieFile      = _.isUndefined(args[3]) ? DEFAULT_TRIE_FILE : args[3],
        similarFile   = _.isUndefined(args[4]) ? DEFAULT_SIMILARITY_FILE : args[4];

    indexer.loadInformations(indexDir, trieFile, similarFile, function () {
        corrector = new Corrector(indexer.getInformations(), distanceLimit);

        jsFile.readFile(inputFile, function (err, data) {
            assert.equal(err, null);

            var report = new Array();
            console.log('Informations loaded, commencing computation..\n');

            var correctResult = 0,
                progressBar   = new ProgressBar('    Computing accuracy: [:bar] :percent :elapseds', {
                    complete: '=',
                    incomplete: ' ',
                    total: data.length
                });

            data.forEach(function (content) {
                var errorSentence   = helper.cleanInitial(content.error.both),
                    correctSentence = helper.cleanInitial(content.correct),
                    corrections, result;

                corrections = corrector.tryCorrect(errorSentence);
                corrections = helper.mapCorrectionsToCollection(corrections);
                // corrections = helper.limitCollection(corrections, 1);

                result = _.first(corrections);

                if (result.sentence == correctSentence) {
                    ++correctResult;
                } else {
                    report.push({
                        id: content.id,
                        correct: correctSentence,
                        result: result.sentence
                    });
                }

                progressBar.tick();
            });

            var accuracy = correctResult / data.length * 100;

            console.log();
            console.log(':: Evaluation Result ::');
            console.log(`Sentence count     : ${data.length}`);
            console.log(`Corrected sentence : ${correctResult}`);
            console.log(`Accuracy           : ${accuracy}%\n`);

            jsFile.writeFile(DEFAULT_REPORT_FILE, report, {spaces: 4}, function (err) {
                assert.equal(err, null);
                console.log(`Check detailed result in ${DEFAULT_REPORT_FILE}`);
            });
        });
    });
}
