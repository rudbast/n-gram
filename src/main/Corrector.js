'use strict';

var Trie        = require(__dirname + '/../util/Trie.js'),
    levenshtein = require(__dirname + '/../util/Levenshtein.js');

/**
 * Spelling correction main class (custom).
 *
 * @param {object}  ngrams        Word index
 * @param {integer} distanceLimit Words distance limit
 *
 * @property {object}  data          N-grams words index container
 * @property {integer} distanceLimit Words distance limit
 * @property {object}  vocabularies  Trie's structured vocabularies
 * @constructor
 */
var Corrector = function (ngrams, distanceLimit) {
    this.data          = ngrams;
    this.distanceLimit = distanceLimit;
    this.vocabularies  = new Trie();
};

Corrector.prototype = {
    /**
     * Re-set the words distance limit.
     *
     * @param {integer} distanceLimit Words distance limit
     */
    setDistanceLimit: function (distanceLimit) {
        this.distanceLimit = distanceLimit;
    }

    /**
     * Fill vocabularies list from words index.
     *
     * @return {void}
     */
    fillVocabulary: function () {
        for (var word in this.data.unigrams) {
            if (this.data.unigrams.hasOwnProperty(word)) {
                this.vocabularies.insert(word);
            }
        }
    },

    /**
     * Checks a word's validity.
     *
     * @param  {string}  inputWord Word to be checked
     * @return {boolean}           Word validity
     */
    isValid: function (inputWord) {
        if (this.vocabularies.has(inputWord)) {
            return true;
        } else {
            return false;
        }
    },

    /**
     * Get list of similar words suggestion given a word.
     *
     * @param  {string} inputWord Input word
     * @return {object}           Suggestion list of similar words
     */
    getSuggestions: function (inputWord) {
        var suggestions = new Object();

        for (var dictWord in this.data.unigrams) {
            if (this.data.unigrams.hasOwnProperty(dictWord)) {
                var distance = levenshtein.distanceOnThreshold(inputWord, dictWord, distanceLimit);

                if (distance < this.distanceLimit ) {
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

module.exports = Corrector;
