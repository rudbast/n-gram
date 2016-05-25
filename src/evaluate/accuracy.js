/**
 * Compute the accuracy of the spelling correction's corrector.
 *
 * @param {string} type       Sentences' file used for testing
 * @param {string} limit      Word distance limit (used when correcting words)
 * @param {string} index      Ngram's index information (uni/bi/tri) file directory
 * @param {string} trie       Ngram's trie information file
 * @param {string} similarity Ngram's word similarity information file
 */

'use strict';

var _           = require('lodash'),
    assert      = require('assert'),
    jsFile      = require('jsonfile'),
    ProgressBar = require('progress'),
    argv        = require('yargs').argv;

var Indexer   = require(__dirname + '/../main/Indexer.js'),
    ngramUtil = require(__dirname + '/../util/ngram.js'),
    helper    = require(__dirname + '/../util/helper.js'),
    Corrector = require(__dirname + '/../misc/Corrector.js'),
    Setiadi   = require(__dirname + '/../ref/Setiadi.js'),
    Verberne  = require(__dirname + '/../ref/Verberne.js');

var ngramConst = new ngramUtil.NgramConstant();

const DEFAULT_ACCURACY_FILE   = __dirname + '/../../res/eval/accuracy.json',
      DEFAULT_FALSPOS_FILE    = __dirname + '/../../res/eval/false-positive.json',
      DEFAULT_TRIE_FILE       = __dirname + '/../../out/trie.json',
      DEFAULT_INDEX_DIR       = __dirname + '/../../out/ngrams',
      DEFAULT_SIMILARITY_FILE = __dirname + '/../../out/similars.json',
      DEFAULT_REPORT_FILE     = __dirname + '/../../out/eval/accuracy.json',
      DEFAULT_DISTANCE_LIMIT  = 1;

var indexer = new Indexer(),
    corrector;

// Main.
main();

/**
 * Main logic container.
 */
function main() {
    var distanceLimit = _.isUndefined(argv.limit) ? DEFAULT_DISTANCE_LIMIT : argv.limit,
        indexDir      = _.isUndefined(argv.index) ? DEFAULT_INDEX_DIR : argv.index,
        trieFile      = _.isUndefined(argv.trie) ? DEFAULT_TRIE_FILE : argv.trie,
        similarFile   = _.isUndefined(argv.similarity) ? DEFAULT_SIMILARITY_FILE : argv.similarity,
        inputFile;

    if (_.isUndefined(argv.type)) {
        inputFile = DEFAULT_ACCURACY_FILE;
    } else {
        if (argv.type == 'fp') {
            inputFile = DEFAULT_FALSPOS_FILE;
        } else {
            inputFile = DEFAULT_ACCURACY_FILE;
        }
    }

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
