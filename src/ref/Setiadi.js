'use strict';

var _ = require('lodash');

var levenshtein = require(__dirname + '/../util/levenshtein.js'),
    helper      = require(__dirname + '/../util/helper.js'),
    Default     = require(__dirname + '/../util/Default.js'),
    ngramUtil   = require(__dirname + '/../util/ngram.js');

/**
 * @class     Setiadi
 * @classdesc Spelling correction main class (as implemented by Iskandar Setiadi).
 * @see https://www.researchgate.net/publication/268334497_Damerau-Levenshtein_Algorithm_and_Bayes_Theorem_for_Spell_Checker_Optimization
 *
 * @constructor
 * @param {Informations} informations          Words' informations (data, count, size, similars, vocabularies)
 * @param {Object}       [options]             Options to initialize the component with
 * @param {number}       [options.distLimit=1] Word's different (distance) limit
 *
 * @property {Object} data          N-grams words index container
 * @property {number} distanceLimit Words distance limit
 */
var Setiadi = function (informations, options) {
    options = _.isUndefined(options) ? new Object() : options;

    this.data          = informations.data;
    this.distanceLimit = _.isUndefined(options.distLimit) ? Default.DISTANCE_LIMIT : options.distLimit;
};

Setiadi.prototype = {
    /**
     * Checks a word's validity.
     *
     * @param  {string}  inputWord Word to be checked
     * @return {boolean}           Word validity
     */
    isValid: function (inputWord) {
        for (var word in this.data.unigrams) {
            if (word == inputWord) {
                return true;
            }
        }
        return false;
    },

    /**
     * Get list of similar words suggestion given a word.
     *
     * @param  {string}  inputWord         Input word
     * @param  {boolean} useWordAssumption Indicates needs of additional points for word rank
     * @return {Object}                    Suggestion list of similar words
     */
    getSuggestions: function (inputWord, useWordAssumption) {
        var checkedLength = inputWord.length,
            dictLength    = _.keys(this.data.unigrams).length,
            ranksMarginal = Math.floor(dictLength / 3),
            suggestions   = new Object();

        for (var dictWord in this.data.unigrams) {
            if (this.data.unigrams.hasOwnProperty(dictWord)) {
                var wordLength = dictWord.length;
                // Pruning words distance calculation.
                if (wordLength >= checkedLength - 1 || wordLength <= checkedLength + 1) {
                    var distance;
                    // Alternate between the two damerau distance if any error occurred.
                    try {
                        distance = levenshtein.damerauDistance(inputWord, dictWord);
                    } catch (err) {
                        // console.error('err: ' + inputWord + ' - ' + dictWord);
                        distance = levenshtein.optimalDamerauDistance(inputWord, dictWord);
                    }

                    if (distance <= this.distanceLimit) {
                        // Bayes theorem implementation.
                        var rank = this.data.unigrams[dictWord];

                        // Words' statictics' probabilities using assumption.
                        if (useWordAssumption) {
                            if (wordLength > checkedLength) {
                                rank += 2 * ranksMarginal;
                            } else if (wordLength == checkedLength) {
                                rank += 1 * ranksMarginal;
                            }
                        }

                        suggestions[dictWord] = rank;
                    }
                }
            }
        }

        return suggestions;
    },

    /**
     * Try correcting the given sentence if there exists any error.
     *
     * @param  {string} sentence Text input in a sentence form
     * @return {Object}          List of suggestions (if error exists)
     */
    tryCorrect: function (sentence) {
        var self        = this,
            suggestions = new Object(),
            subParts    = sentence.split(',');

        subParts.forEach(function (subPart) {
            subPart = helper.cleanExtra(subPart);
            subPart = ngramUtil.uniSplit(subPart);

            suggestions = helper.createNgramCombination(
                [suggestions, self.doCorrect(subPart)],
                'plus',
                'join'
            );
        });

        return suggestions;
    },

    /**
     * Main correction's logic.
     *
     * @param  {Array}  words Ngram split word
     * @return {Object}       Correction results in a form of hash/dictionary
     */
    doCorrect: function (words) {
        var self = this,
            corrections = new Array();

        words.forEach(function (word) {
            if (self.isValid(word)) {
                corrections.push({
                    [`${word}`]: self.data.unigrams[word]
                });
            } else {
                var useWordAssumption   = true,
                    wordSuggestions     = self.getSuggestions(word, useWordAssumption),
                    wordSuggestionsSize = _.keys(wordSuggestions).length;

                if (wordSuggestionsSize != 0) {
                    corrections.push(wordSuggestions);
                } else {
                    corrections.push({
                        [`${word}`]: 0
                    });
                }
            }
        });

        return helper.createNgramCombination(corrections);
    }
};

module.exports = Setiadi;
