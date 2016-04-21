'use strict';

var levenshtein = require(__dirname + '/../util/Levenshtein.js'),
    helper      = require(__dirname + '/../util/Helper.js');

/**
 * Spelling correction main class (as implemented by Suzan Verberne).
 * @see http://sverberne.ruhosting.nl/papers/verberne2002.pdf
 *
 * @param {object}  ngrams        Word index
 * @param {integer} distanceLimit Words distance limit
 *
 * @property {object}  data          N-grams words index container
 * @property {integer} distanceLimit Words distance limit
 * @constructor
 */
var Verberne = function (ngrams, distanceLimit = 2) {
    this.data          = ngrams;
    this.distanceLimit = distanceLimit;
};

var Verberne.prototype = {
    /**
     * Checks a word's validity.
     *
     * @param  {string}  inputWord Word to be checked
     * @return {boolean}           Word validity
     */
    isValid: function (inputWord) {
        for (var word in this.data.unigrams) {
            if (this.data.unigrams.hasOwnProperty(word)) {
                if (word == inputWord) {
                    return true;
                }
            }
        }

        return false;
    },

    /**
     * Get list of similar words suggestion given a word.
     *
     * @param  {string} inputWord Input word
     * @return {object}           Suggestion list of similar words
     */
    getSuggestions: function (inputWord) {
        var suggestions   = new Object();

        for (var dictWord in this.data.unigrams) {
            if (this.data.unigrams.hasOwnProperty(dictWord)) {
                var distance = levenshtein.distance(inputWord, dictWord );

                if (distance < this.distanceLimit) {
                    var rank = this.data.unigrams[dictWord];
                    suggestions[dictWord] = rank;
                }
            }
        }

        return suggestions;
    },

    /**
     * Try correcting the given sentence if there exists any error.
     *
     * @param  {string} sentence Text input in a sentence form
     * @return {object}          List of suggestions (if error exists)
     */
    tryCorrect: function (sentence) {
        var suggestions = new Object();
        return suggestions;
    }
};

module.exports = Setiadi;
