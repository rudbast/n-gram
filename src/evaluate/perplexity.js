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
      DEFAULT_ARTICLE_FILE = __dirname + '/../../res/eval/article.json';

// Main.
main(process.argv.slice(2));

/**
 * Main logic container.
 *
 * @param {Array} args List of program's arguments
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
                totalCounted = {
                    [`${ngramConst.UNIGRAM}`]: 0,
                    [`${ngramConst.BIGRAM}`]: 0,
                    [`${ngramConst.TRIGRAM}`]: 0
                },
                data  = indexer.getInformations().data,
                count = indexer.getInformations().count,
                size  = indexer.getInformations().size;

            console.log(':: Perplexity Computation Result ::');

            sentences.forEach(function (sentence) {
                var parts = sentence.split(',');

                parts.forEach(function (part) {
                    part = helper.cleanExtra(part);

                    var grams     = ngramUtil.tripleNSplit(part),
                        wordCount = grams[ngramConst.UNIGRAM].length;

                    for (var gram in averagePerplexity) {
                        if (grams[gram].length == 0) return;
                        else totalCounted[gram]++;

                        averagePerplexity[gram] += computePerplexity(grams[gram], data, count, size, wordCount);
                    }
                });
            });

            for (var gram in averagePerplexity) {
                averagePerplexity[gram] /= totalCounted[gram];
                console.log(`${gram}: ${averagePerplexity[gram]}`);
            }
        });
    });
}

/**
 * Compute perplexity of the given parts (gram split from a sentence).
 *
 * @param  {Array}  parts     Gram split from a sentence
 * @param  {Object} data      Container for ngram's index information
 * @param  {Object} count     Container for ngram's index information's total frequency
 * @param  {Object} size      Container for ngram's index information's total unique gram
 * @param  {number} wordCount Total word count of the main sentence
 * @return {number}           Perplexity of the sentence
 */
function computePerplexity(parts, data, count, size, wordCount) {
    var perplexity = 1,
        probability;

    parts.forEach(function (part) {
        probability = ngramProbability(part, data, count, size);
        perplexity *= 1 / probability;
    });

    return Math.pow(perplexity, 1 / wordCount);
}

/**
 * Compute the probability of the given gram.
 *
 * @param  {string} gram  Gram to be computed for the probability
 * @param  {Object} data  Container for ngram's index information
 * @param  {Object} count Container for ngram's index information's total frequency
 * @param  {Object} size  Container for ngram's index information's total unique gram
 * @return {number}       Probability of the given gram
 */
function ngramProbability(gram, data, count, size) {
    var validGram, precedenceGram,
        words       = ngramUtil.uniSplit(gram),
        probability = 1;

    switch (ngramUtil.getGramClass(ngramUtil.uniSplit(gram).length)) {
        case ngramConst.UNIGRAM:
            var mainfreq = _.isUndefined(data[ngramConst.UNIGRAM][gram]) ? 0 : data[ngramConst.UNIGRAM][gram];
            // (C(w_i) + 1) / (N + V)
            probability = (mainfreq + 1) / (count[ngramConst.UNIGRAM] + size[ngramConst.UNIGRAM]);
            break;

        case ngramConst.BIGRAM:
            precedenceGram = `${words[0]}`;
            validGram      = !_.isUndefined(data[ngramConst.BIGRAM][gram]);

            if (!validGram) {
                words.forEach(function (word) {
                    probability *= ngramProbability(word, data, count, size);
                });
            } else {
                probability = data[ngramConst.BIGRAM][gram] / data[ngramConst.UNIGRAM][precedenceGram];
            }
            break;

        case ngramConst.TRIGRAM:
            precedenceGram = `${words[0]} ${words[1]}`;
            validGram      = !_.isUndefined(data[ngramConst.TRIGRAM][gram]);

            if (!validGram) {
                var newGrams = [
                    precedenceGram,
                    `${words[1]} ${words[2]}`
                ];

                newGrams.forEach(function (newGram) {
                    probability *= ngramProbability(newGram, data, count, size);
                });
            } else {
                probability = data[ngramConst.TRIGRAM][gram] / data[ngramConst.BIGRAM][precedenceGram];
            }
            break;
    }

    return probability;
}
