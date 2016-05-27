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
    argv        = require('yargs').argv,
    now         = require('performance-now');

var Indexer      = require(__dirname + '/../main/Indexer.js'),
    ngramUtil    = require(__dirname + '/../util/ngram.js'),
    helper       = require(__dirname + '/../util/helper.js'),
    Corrector    = require(__dirname + '/../main/Corrector.js'),
    AuxCorrector = require(__dirname + '/../misc/Corrector.js'),
    Setiadi      = require(__dirname + '/../ref/Setiadi.js'),
    Verberne     = require(__dirname + '/../ref/Verberne.js');

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

    switch (argv.type) {
        case 'fp': inputFile = DEFAULT_FALSPOS_FILE; break;
        default: inputFile = DEFAULT_ACCURACY_FILE;
    }

    console.log('Loading N-Gram informations..');
    indexer.loadInformations(indexDir, trieFile, similarFile, function () {
        switch (argv.version) {
            case 'rudy-1': corrector = new Corrector(indexer.getInformations(), distanceLimit); break;
            case 'rudy-2': corrector = new AuxCorrector(indexer.getInformations(), distanceLimit); break;
            case 'setiadi': corrector = new Setiadi(indexer.getInformations(), distanceLimit); break;
            case 'verberne': corrector = new Verberne(indexer.getInformations(), distanceLimit); break;
            default: corrector = new Corrector(indexer.getInformations(), distanceLimit);
        }

        jsFile.readFile(inputFile, function (err, data) {
            assert.equal(err, null);
            console.log('Informations loaded. Commencing computation..\n');

            var corrected   = 0,
                timeSpent   = 0,
                report      = new Array(),
                progressBar = new ProgressBar('    Computing accuracy: [:bar] :percent :elapseds', {
                    complete: '=',
                    incomplete: ' ',
                    total: data.length
                }),
                inputContent;

            switch (argv.type) {
                case 'fp': inputContent = 'correct'; break;
                case 'non': inputContent = 'error.non'; break;
                case 'real': inputContent = 'error.real'; break;
                default: inputContent = 'error.both';
            }

            data.forEach(function (content) {
                var errorSentence   = helper.cleanInitial(_.get(content, inputContent)),
                    correctSentence = helper.cleanInitial(content.correct),
                    corrections, result, start, end;

                start       = now();
                corrections = corrector.tryCorrect(errorSentence);
                end         = now();

                corrections = helper.mapCorrectionsToCollection(corrections);
                result      = _.first(corrections);

                if (result.sentence == correctSentence) {
                    ++corrected;
                } else {
                    report.push({
                        id: content.id,
                        correct: correctSentence,
                        input: errorSentence,
                        result: result.sentence
                    });
                }

                timeSpent += end - start;
                progressBar.tick();
            });

            console.log();
            console.log(':: Evaluation Result ::');
            console.log(`Sentence count     : ${data.length}`);
            console.log(`Corrected sentence : ${corrected}`);
            console.log(`Accuracy           : ${corrected / data.length * 100}%`);
            console.log(`Total time spent   : ${_.round(timeSpent / 1000, 4)} second`);
            console.log(`Average Speed      : ${_.round(timeSpent / data.length, 4)} millisecond\n`);

            jsFile.writeFile(DEFAULT_REPORT_FILE, report, {spaces: 4}, function (err) {
                assert.equal(err, null);
                console.log(`Check detailed result in ${DEFAULT_REPORT_FILE}`);
            });
        });
    });
}
