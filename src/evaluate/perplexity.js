/**
 * Compute the average perplexity of uni/bi/tri-gram language model,
 * given sentences in an article.
 *
 * @param {string} indexDir  Ngram's index information (uni/bi/tri) file directory
 * @param {string} inputFile Article used when computing perplexity
 */

'use strict';

var _      = require('lodash'),
    jsFile = require('jsonfile');

var Indexer   = require(__dirname + '/../main/Indexer.js'),
    ngramUtil = require(__dirname + '/../util/ngram.js'),
    helper    = require(__dirname + '/../util/helper.js');

var ngramConst = new ngramUtil.NgramConstant();

const DEFAULT_INDEX_DIR    = __dirname + '/../../out/ngrams',
      DEFAULT_ARTICLE_FILE = __dirname + '/../../res/eval-article.json';

// Main.
main(process.argv.slice(2));

/**
 * Main logic container.
 *
 * @param {Array} args List of program's arguments
 * @author Rudy
 */
function main(args) {
    var indexDir  = _.isUndefined(args[0]) ? DEFAULT_INDEX_DIR : args[0],
        inputFile = _.isUndefined(args[1]) ? DEFAULT_ARTICLE_FILE : args[1],
        indexer   = new Indexer();

    indexer.loadIndex(indexDir, function () {
        jsFile.readFile(inputFile, function (err, article) {
            var sentences         = helper.splitToSentence(helper.cleanInitial(article.content)),
                averagePerplexity = {
                    [`${ngramConst.UNIGRAM}`]: 0,
                    [`${ngramConst.BIGRAM}`]: 0,
                    [`${ngramConst.TRIGRAM}`]: 0
                },
                data  = indexer.getInformations().data,
                count = indexer.getInformations().count;

            console.log(':: Perplexity Computation Result ::');

            sentences.forEach(function (sentence) {
                var parts     = ngramUtil.tripleNSplit(sentence),
                    wordCount = Object.keys(parts.unigrams).length;

                for (var gram in averagePerplexity) {
                    averagePerplexity[gram] += computePerplexity(parts[gram], data, count, wordCount);
                }
            });

            for (var gram in averagePerplexity) {
                averagePerplexity[gram] /= sentences.length;
                console.log(`${gram}: ${averagePerplexity[gram]}`);
            }
        });
    });
}

/**
 * Compute perplexity of the given parts (gram splitted from a sentence).
 *
 * @param  {Array}  parts     Gram splitted from a sentence
 * @param  {Object} data      Container for ngram's index information
 * @param  {Object} count     Container for ngram's index information's total frequency
 * @param  {number} wordCount Total word count of the main sentence
 * @return {number}            Perplexity of the sentence
 */
function computePerplexity(parts, data, count, wordCount) {
    var perplexity = 1,
        probability;

    parts.forEach(function (part) {
        probability = ngramProbability(part, data, count);

        if (!_.isNaN(probability)) {
            perplexity *= 1 / probability;
        }
    });

    return Math.pow(perplexity, 1 / wordCount);
}

/**
 * Compute the probability of the given gram.
 *
 * @param  {string} gram  Gram to be computed for the probability
 * @param  {Object} data  Container for ngram's index information
 * @param  {Object} count Container for ngram's index information's total frequency
 * @return {number}       Probability of the given gram
 */
function ngramProbability(gram, data, count) {
    function findPreviousGram(gram) {
        var firstSpacePos = gram.indexOf(' ');
        var secondSpacePos = gram.indexOf(' ', firstSpacePos + 1);

        if (secondSpacePos == -1) {
            return gram.substring(0, firstSpacePos);
        } else {
            return gram.substring(0, secondSpacePos);
        }
    }

    var probability, precedenceGram;

    switch (ngramUtil.getGramClass(ngramUtil.uniSplit(gram).length)) {
        case ngramConst.UNIGRAM:
            probability = data[ngramConst.UNIGRAM][gram] / count[ngramConst.UNIGRAM];
            break;

        case ngramConst.BIGRAM:
            precedenceGram = findPreviousGram(gram);
            probability    = data[ngramConst.BIGRAM][gram] / data[ngramConst.UNIGRAM][precedenceGram];
            break;

        case ngramConst.TRIGRAM:
            precedenceGram = findPreviousGram(gram);
            probability    = data[ngramConst.TRIGRAM][gram] / data[ngramConst.BIGRAM][precedenceGram];
            break;
    }

    return probability;
}
