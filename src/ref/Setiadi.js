'use strict';

var _ = require('lodash');

var levenshtein = require(__dirname + '/../util/levenshtein.js'),
    helper      = require(__dirname + '/../util/helper.js'),
    ngramUtil   = require(__dirname + '/../util/ngram.js');

/**
 * Spelling correction main class (as implemented by Iskandar Setiadi).
 * @see https://www.researchgate.net/publication/268334497_Damerau-Levenshtein_Algorithm_and_Bayes_Theorem_for_Spell_Checker_Optimization
 *
 * @param {Object} ngrams        Word index
 * @param {Object} similars      Words with it's similars pairs
 * @param {Number} distanceLimit Words distance limit
 *
 * @property {Object} data          N-grams words index container
 * @property {Object} similars      Words with it's similars pairs
 * @property {Number} distanceLimit Words distance limit
 * @constructor
 */
var Setiadi = function (ngrams, similars, distanceLimit) {
    this.data          = ngrams;
    this.similars      = similars;
    this.distanceLimit = !_.isUndefined(distanceLimit) ? distanceLimit : 1;
};

Setiadi.prototype = {
    /**
     * Checks a word's validity.
     *
     * @param  {String}  inputWord Word to be checked
     * @return {Boolean}           Word validity
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
     * @param  {String}  inputWord         Input word
     * @param  {Boolean} useWordAssumption Indicates needs of additional points for word rank
     * @return {Object}                    Suggestion list of similar words
     */
    getSuggestions: function (inputWord, useWordAssumption) {
        var checkedLength = inputWord.length,
            dictLength    = Object.keys(this.data.unigrams).length,
            ranksMarginal = Math.floor(dictLength / 3);

        var suggestions   = new Object();

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
                                rank += 3 * ranksMarginal;
                            } else if (wordLength == checkedLength) {
                                rank += 2 * ranksMarginal;
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
     * @param  {String} sentence Text input in a sentence form
     * @return {Object}          List of suggestions (if error exists)
     */
    tryCorrect: function (sentence) {
        var self = this;

        var corrections = new Array(),
            words       = ngramUtil.uniSplit(sentence);

        words.forEach(function (word) {
            if (self.isValid(word)) {
                corrections.push({
                    [`${word}`]: self.data.unigrams[word]
                });
            } else {
                var useWordAssumption   = true,
                    wordSuggestions     = self.getSuggestions(word, useWordAssumption),
                    wordSuggestionsSize = Object.keys(wordSuggestions).length;

                if (wordSuggestionsSize != 0) {
                    corrections.push(wordSuggestions);
                } else {
                    corrections.push({
                        [`${word}`]: 0
                    });
                }
            }
        });

        var suggestions = helper.createNgramCombination(corrections, 'plus');
        return suggestions;
    }
};

module.exports = Setiadi;
