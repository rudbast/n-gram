/**
 * Compute the average perplexity of uni/bi/tri-gram language model,
 * given sentences in an article.
 *
 * @param {string} index   Ngram's index information (uni/bi/tri) file directory
 * @param {string} article Test file used for computing perplexity
 */

'use strict';

var _      = require('lodash'),
    jsFile = require('jsonfile'),
    argv   = require('yargs').argv;

var Indexer   = require(__dirname + '/../main/Indexer.js'),
    ngramUtil = require(__dirname + '/../util/ngram.js'),
    Default   = require(__dirname + '/../util/Default.js'),
    helper    = require(__dirname + '/../util/helper.js');

// Main.
main();

/**
 * Main logic container.
 */
function main() {
    var indexDir  = _.isUndefined(argv.index) ? Default.INDEX_DIR : argv.index,
        inputFile = _.isUndefined(argv.article) ? Default.PERPLEXITY_FILE : argv.article,
        indexer   = new Indexer();

    indexer.loadIndex(indexDir, function () {
        jsFile.readFile(inputFile, function (err, article) {
            var sentences         = helper.splitToSentence(helper.cleanInitial(article.content)),
                averagePerplexity = {
                    [`${ngramUtil.UNIGRAM}`]: 0,
                    [`${ngramUtil.BIGRAM}`]: 0,
                    [`${ngramUtil.TRIGRAM}`]: 0
                },
                totalCounted = {
                    [`${ngramUtil.UNIGRAM}`]: 0,
                    [`${ngramUtil.BIGRAM}`]: 0,
                    [`${ngramUtil.TRIGRAM}`]: 0
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
                        wordCount = grams[ngramUtil.UNIGRAM].length;

                    for (let gram in averagePerplexity) {
                        var currentGram;

                        if (grams[gram].length == 0) return;
                        else {
                            totalCounted[gram]++;

                            if (gram == ngramUtil.TRIGRAM) {
                                currentGram = _.concat(
                                    _.first(grams[ngramUtil.UNIGRAM]),
                                    _.first(grams[ngramUtil.BIGRAM]),
                                    grams[gram]
                                );
                            } else if (gram == ngramUtil.BIGRAM) {
                                currentGram = _.concat(
                                    _.first(grams[ngramUtil.UNIGRAM]),
                                    grams[gram]
                                );
                            } else {
                                currentGram = grams[gram];
                            }
                        }

                        averagePerplexity[gram] += computePerplexity(currentGram, data, count, size, wordCount);
                    }
                });
            });

            for (let gram in averagePerplexity) {
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
        perplexity *= 1 / Math.exp(probability);
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
        probability = 1,
        logResult   = true;

    switch (ngramUtil.getGramClass(ngramUtil.uniSplit(gram).length)) {
        case ngramUtil.UNIGRAM:
            var mainfreq = _.isUndefined(data[ngramUtil.UNIGRAM][gram]) ? 0 : data[ngramUtil.UNIGRAM][gram];
            // (C(w_i) + 1) / (N + V)
            probability = (mainfreq + 1) / (count[ngramUtil.UNIGRAM] + size[ngramUtil.UNIGRAM]);
            break;

        case ngramUtil.BIGRAM:
            precedenceGram = `${words[0]}`;
            validGram      = !_.isUndefined(data[ngramUtil.BIGRAM][gram]);

            if (!validGram) {
                words.forEach(function (word) {
                    probability += ngramProbability(word, data, count, size);
                });
                logResult = false;
            } else {
                probability = data[ngramUtil.BIGRAM][gram] / data[ngramUtil.UNIGRAM][precedenceGram];
            }
            break;

        case ngramUtil.TRIGRAM:
            precedenceGram = `${words[0]} ${words[1]}`;
            validGram      = !_.isUndefined(data[ngramUtil.TRIGRAM][gram]);

            if (!validGram) {
                var newGrams = [
                    precedenceGram,
                    `${words[1]} ${words[2]}`
                ];

                newGrams.forEach(function (newGram) {
                    probability += ngramProbability(newGram, data, count, size);
                });
                logResult = false;
            } else {
                probability = data[ngramUtil.TRIGRAM][gram] / data[ngramUtil.BIGRAM][precedenceGram];
            }
            break;
    }

    if (logResult)
        return Math.log(probability);
    else
        return probability;
}

// function kneserNeyProbability(words, gramClass) {
//     const DISCOUNT_WEIGHT = 0.75;
//     var gram = words.join(' '),
//         probability;

//     probability = Math.max(bigram - DISCOUNT_WEIGHT, 0);
//     probability += DISCOUNT_WEIGHT / data[ngramUtil.UNIGRAM][words[0]] * countPrecedingGram(words, ngramUtil.BIGRAM):
// }

function countPrecedingGram(supercedeGram, gramClass) {
    if (_.has(this.precede, supercedeGram))
        return this.precede[supercedeGram];

    var count = 0;
    _.forEach(data[gramClass], function (probability, dictGram) {
        if (dictGram.indexOf(supercedeGram) > 0) ++count;
    });

    return this.precede[supercedeGram] = count;
}

function countSupercedeGram(precedeGram, gramClass) {
    if (_.has(this.supercede, precedeGram))
        return this.supercede[precedeGram];

    var count = 0;
    _.forEach(data[gramClass], function (probability, dictGram) {
        if (dictGram.indexOf(precedeGram) > 0) ++count;
    });

    return this.supercede[precedeGram] = count;
}
