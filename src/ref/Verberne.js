'use strict';

var levenshtein = require(__dirname + '/../util/levenshtein.js'),
    helper      = require(__dirname + '/../util/helper.js'),
    ngramUtil   = require(__dirname + '/../util/ngram.js');

/**
 * Spelling correction main class (as implemented by Suzan Verberne).
 * @see http://sverberne.ruhosting.nl/papers/verberne2002.pdf
 *
 * @param {object}  ngrams        Word index
 * @param {object}  similars      Words with it's similars pairs
 * @param {integer} distanceLimit Words distance limit
 *
 * @property {object}  data          N-grams words index container
 * @property {object}  similars      Words with it's similars pairs
 * @property {integer} distanceLimit Words distance limit
 * @constructor
 */
var Verberne = function (ngrams, similars, distanceLimit) {
    this.data          = ngrams;
    this.similars      = similars;
    this.distanceLimit = distanceLimit !== undefined ? distanceLimit : 2;
};

Verberne.prototype = {
    /**
     * Get list of similar words suggestion given a word.
     *
     * @param  {string} inputWord Input word
     * @return {object}           Suggestion list of similar words
     */
    getSuggestions: function (inputWord) {
        return this.similars[inputWord];
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
            parts       = ngramUtil.triSplit(sentence);

        parts.forEach(function (part) {
            var errorIndexes   = self.detectNonWord(part),
                isValidTrigram = self.detectRealWord(part);

            if (errorIndexes.length == 0 && isValidTrigram) {
                corrections.push({
                    [`${part}`]: self.data.trigrams[part]
                });
            } else if (!isValidTrigram) {
                var alternatives = self.createAlternatives(part);
                corrections.push(alternatives);
            } else if (errorIndexes.length != 0) {
                // Since verberne's spelling corrector only correct real word error,
                // we'll push the original ones in if it contains non-word error.
                corrections.push({
                    [`${part}`]: 0
                });
            }
        });

        var suggestions = helper.createTrigramCombination(corrections, 'plus');
        return suggestions;
    },

    /**
     * Detect non word error if exists.
     *
     * @param  {string} trigram Words pair in a form of trigram.
     * @return {array}          Index of the word having an error (empty if no error found)
     */
    detectNonWord: function (trigram) {
        var self = this;

        var errorIndexes = new Array(),
            words        = ngramUtil.uniSplit(trigram);

        words.forEach(function (word, index) {
            if (self.data.unigrams.hasOwnProperty(word)) {
                errorIndexes.push(index);
            }
        });

        return errorIndexes;
    },

    /**
     * Detect real word error.
     *
     * @param  {string}  trigram Word pair in a form of trigram.
     * @return {boolean}         Indicates if the trigram is valid.
     */
    detectRealWord: function (trigram) {
        return this.data.trigrams.hasOwnProperty(trigram);
    },

    /**
     * Create valid trigram alternatives from a list of words' similarity,
     * only allows 1 different word from the original trigram.
     *
     * @param  {string} trigram Words pair in trigram form
     * @return {object}         Valid trigrams with its' rank
     */
    createAlternatives: function (trigram) {
        var words        = ngramUtil.uniSplit(trigram),
            alternatives = new Object();

        var firstAlts  = {[`${words[0]}`]: this.data.unigrams[words[0]]},
            secondAlts = {[`${words[1]}`]: this.data.unigrams[words[1]]},
            thirdAlts  = {[`${words[2]}`]: this.data.unigrams[words[2]]};

        var collections = {
            first: helper.createUnigramCombination([self.getSuggestions(words[0]), secondAlts, thirdAlts]),
            second: helper.createUnigramCombination([firstAlts, self.getSuggestions(words[1]), thirdAlts]),
            third: helper.createUnigramCombination([firstAlts, secondAlts, self.getSuggestions(words[2])])
        };

        for (var collection in collections) {
            for (var combination in collections[collection]) {
                if (this.data.trigrams.hasOwnProperty(combination)) {
                    if (!alternatives.hasOwnProperty(combination)) {
                        alternatives[combination] = this.data.trigrams[combination];
                    }
                }
            }
        }

        return alternatives;
    }
};

module.exports = Verberne;
