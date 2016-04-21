'use strict';

var levenshtein = require(__dirname + '/../util/Levenshtein.js'),
    helper      = require(__dirname + '/../util/Helper.js');

/**
 * Spelling correction main class (as implemented by Iskandar Setiadi).
 * @see https://www.researchgate.net/publication/268334497_Damerau-Levenshtein_Algorithm_and_Bayes_Theorem_for_Spell_Checker_Optimization
 *
 * @param {object}  ngrams        Word index
 * @param {integer} distanceLimit Words distance limit
 *
 * @property {object}  data          N-grams words index container
 * @property {integer} distanceLimit Words distance limit
 * @constructor
 */
var Setiadi = function (ngrams, distanceLimit) {
    this.data          = ngrams;
    this.distanceLimit = distanceLimit !== undefined ? distanceLimit : 1;
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
        var checkedLength = inputWord.length,
            dictLength    = Object.keys(this.data.unigrams).length,
            ranksMarginal = Math.floor(dictLength / 3);

        var suggestions   = new Object();

        for (var dictWord in this.data.unigrams) {
            if (this.data.unigrams.hasOwnProperty(dictWord)) {
                var wordLength = dictWord.length;
                // Pruning words distance calculation.
                if (wordLength >= checkedLength - 1 || wordLength <= checkedLength + 1) {
                    // var distance = levenshtein.damLevDistance(inputWord, dictWord);
                    var distance = levenshtein.distance(inputWord, dictWord);

                    if (distance <= this.distanceLimit) {
                        // Bayes theorem implementation.
                        var rank = this.data.unigrams[dictWord];

                        // Words' statictics' probabilities using assumption.
                        if (wordLength > checkedLength) {
                            rank += 3 * ranksMarginal;
                        } else if (wordLength == checkedLength) {
                            rank += 2 * ranksMarginal;
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
     * @return {object}          List of suggestions (if error exists)
     */
    tryCorrect: function (sentence) {
        var self = this;

        var corrections = new Array(),
            parts       = sentence.split(/\s+/);

        parts.forEach(function (part) {
            var containsInvalidChars = part.match(/[\W\d_]/),
                word                 = part.replace(/[\W\d_]/g, '');

            word = word.toLowerCase();

            if (containsInvalidChars || (!containsInvalidChars && self.isValid(word))) {
                corrections.push({
                    [`${part}`]: self.data.unigrams[word]
                });
            } else {
                var wordSuggestions     = self.getSuggestions(word),
                    wordSuggestionsSize = Object.keys(wordSuggestions).length;

                if (wordSuggestionsSize != 0 ) {
                    corrections.push(wordSuggestions);
                } else {
                    corrections.push({
                        [`${part}`]: self.data.unigrams[word]
                    });
                }
            }
        });

        var suggestions = helper.createCombination(corrections);
        return suggestions;
    }
};

module.exports = Setiadi;