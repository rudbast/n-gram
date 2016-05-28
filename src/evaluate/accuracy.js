/**
 * Compute the accuracy of the spelling correction's corrector.
 *
 * @param {string} type       Sentences' file used for testing (fp, real, non, both)
 * @param {string} limit      Word distance limit (used when correcting words)
 * @param {string} version    Version of spelling corrector to use (rudy-1, rudy-2, verberne, setiadi)
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
    now         = require('performance-now'),
    path        = require('path');

var Indexer      = require(__dirname + '/../main/Indexer.js'),
    ngramUtil    = require(__dirname + '/../util/ngram.js'),
    helper       = require(__dirname + '/../util/helper.js'),
    Corrector    = require(__dirname + '/../main/Corrector.js'),
    AuxCorrector = require(__dirname + '/../main/AuxCorrector.js'),
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
            console.log('Informations loaded. Commencing evaluation..\n');

            var progressBar = new ProgressBar('    Computing accuracy: [:bar] :percent :elapseds', {
                    complete: '=',
                    incomplete: ' ',
                    total: data.length
                }),
                inputContent, report;

            switch (argv.type) {
                case 'fp': inputContent = 'correct'; break;
                case 'non': inputContent = 'error.non'; break;
                case 'real': inputContent = 'error.real'; break;
                default: inputContent = 'error.both';
            }

            // Start evaluate and get the report from it.
            report = evaluate(corrector, data, inputContent, progressBar);

            jsFile.writeFile(DEFAULT_REPORT_FILE, report, {spaces: 4}, function (err) {
                assert.equal(err, null);
                console.log(`Check detailed result in ${path.resolve(DEFAULT_REPORT_FILE)}`);
            });
        });
    });
}

/**
 * Start the evaluation and get the report from evaluation result.
 *
 * @param  {Object}      corrector    Spelling corrector's object instance
 * @param  {Array}       data         Evaluation input (as list of sentences)
 * @param  {string}      inputContent Input content's object path
 * @param  {ProgressBar} progressBar  Progress bar's object instance
 * @return {Array}                    List of sentence that fails on correction
 */
function evaluate(corrector, data, inputContent, progressBar) {
    var report        = {
            fail: new Array(),
            success: new Array()
        },
        corrected     = 0,
        timeSpent     = 0,
        success       = 0,
        fail          = 0,
        error         = 0,
        falsePositive = 0,
        normal        = 0;

    data.forEach(function (content) {
        var errorSentence   = helper.cleanInitial(_.get(content, inputContent)),
            correctSentence = helper.cleanInitial(content.correct),
            corrections, result, start, end;

        start       = now();
        corrections = corrector.tryCorrect(errorSentence);
        end         = now();

        corrections = helper.mapCorrectionsToCollection(corrections);
        result      = _.first(corrections);

        var correctWords = ngramUtil.uniSplit(correctSentence),
            inputWords   = ngramUtil.uniSplit(errorSentence),
            resultWords  = ngramUtil.uniSplit(result.sentence);

        // Word level evaluation.
        resultWords.forEach(function (resultWord, index) {
            var inputWord      = inputWords[index],
                correctWord    = correctWords[index],
                sameAsInput    = resultWord == inputWord,
                sameAsCorrect  = resultWord == correctWord,
                inputAsCorrect = inputWord == correctWord;

            if (!sameAsInput && sameAsCorrect) {
                // error successfully corrected.
                ++success;
            } else if (inputAsCorrect && !sameAsCorrect) {
                // false-positive occurred (over correction).
                ++falsePositive;
            } else if (sameAsInput && !sameAsCorrect) {
                // error correction failed.
                ++fail;
            }

            if (!inputAsCorrect) ++error;
            else ++normal;
        });

        // Evaluation result of current sentence input.
        var evaluationResult = {
            id: content.id,
            correct: correctSentence,
            input: errorSentence,
            result: result.sentence
        };

        // Sentence level evaluation.
        if (result.sentence == correctSentence) {
            ++corrected;
            report.success.push(evaluationResult);
        } else {
            report.fail.push(evaluationResult);
        }

        timeSpent += end - start;
        progressBar.tick();
    });

    console.log();
    console.log(':: Evaluation Result ::\n');

    console.log(`Sentence count         : ${data.length}`);
    console.log(`Corrected (sentence)   : ${corrected}`);
    console.log(`Accuracy (sentence)    : ${_.round(corrected / data.length * 100, 4)}%\n`);

    console.log(`Word count (error)     : ${error}`);
    console.log(`Corrected (word)       : ${success}`);
    console.log(`Accuracy (word)        : ${_.round(success / error * 100, 4)}%\n`);

    console.log(`Word count (non error) : ${normal}`);
    console.log(`Overcorrected (word)   : ${falsePositive}`);
    console.log(`False positive         : ${_.round(falsePositive / normal * 100, 4)}%\n`);

    console.log(`Total time spent       : ${_.round(timeSpent / 1000, 4)} second`);
    console.log(`Average Speed          : ${_.round(timeSpent / data.length, 4)} millisecond\n`);

    return report;
}
