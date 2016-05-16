'use strict';

var _ = require('lodash');

var levenshtein = require(__dirname + '/../util/levenshtein.js'),
    helper      = require(__dirname + '/../util/helper.js'),
    ngramUtil   = require(__dirname + '/../util/ngram.js');

var ngramConst  = new ngramUtil.NgramConstant();

/**
 * Spelling correction main class (as implemented by Suzan Verberne).
 * @see http://sverberne.ruhosting.nl/papers/verberne2002.pdf
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
var Verberne = function (ngrams, similars, distanceLimit) {
    this.data          = ngrams;
    this.similars      = similars;
    this.distanceLimit = !_.isUndefined(distanceLimit) ? distanceLimit : 2;
};

Verberne.prototype = {
    /**
     * Check the validity of given gram.
     *
     * @param  {String}  gram      Word pair in a form of certain n-gram
     * @param  {String}  gramClass String representation of the n-gram
     * @return {Boolean}           Gram validity
     */
    isValid: function (gram, gramClass) {
        if (gramClass === undefined) {
            gramClass = ngramUtil.getGramClass(ngramUtil.uniSplit(gram).length);
        }

        if (gramClass == ngramConst.UNIGRAM) {
            for (var dictGram in this.data[gramClass]) {
                if (dictGram == gram) {
                    return true;
                }
            }
            return false;
        }
        return this.data[gramClass].hasOwnProperty(gram);
    },

    /**
     * Get list of similar words suggestion given a word.
     *
     * @param  {String} inputWord Input word
     * @return {Object}           Suggestion list of similar words
     */
    getSuggestions: function (inputWord) {
        return this.similars[inputWord];
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
            parts       = ngramUtil.triSplit(sentence);

        parts.forEach(function (part) {
            var words            = ngramUtil.uniSplit(part),
                errorIndexes     = self.detectNonWord(words),
                errorIndexLength = Object.keys(errorIndexes).length,
                isValidTrigram   = self.detectRealWord(part),
                alternatives     = new Object();

            if (errorIndexLength == 0 && isValidTrigram) {
                // Contains no error.
                alternatives[part] = self.data.trigrams[part];
            } else if (errorIndexLength != 0) {
                // Since verberne's spelling corrector only correct real word error,
                // we'll push the original ones in if it contains non-word error.
                alternatives[part] = 0;
            } else if (!isValidTrigram) {
                // Contains real word error.
                alternatives = self.createAlternatives(words);
            }

            corrections.push(alternatives);
        });

        var suggestions = helper.createNgramCombination(corrections, 'plus');
        return suggestions;
    },

    /**
     * Detect non word error if exists.
     *
     * @param  {Array} words List of words (ordered) from a sentence
     * @return {Array}       Index of the word having an error (empty if no error found)
     */
    detectNonWord: function (words) {
        var self = this;

        var errorIndexes = new Array();
        words.forEach(function (word, index) {
            if (!self.isValid(word, ngramConst.UNIGRAM)) {
                errorIndexes.push(index);
            }
        });

        return errorIndexes;
    },

    /**
     * Detect real word error.
     *
     * @param  {String}  trigram Word pair in a form of trigram.
     * @return {Boolean}         Indicates if the trigram is valid.
     */
    detectRealWord: function (trigram) {
        return this.isValid(trigram, ngramConst.TRIGRAM);
    },

    /**
     * Create valid trigram alternatives from a list of words' similarity,
     * only allows 1 different word from the original trigram.
     *
     * @param  {Array}  words List of words (ordered) from a sentence
     * @return {Object}       Valid trigrams with its' rank
     */
    createAlternatives: function (words) {
        var self = this;

        var alternatives = new Object();

        var wordAlts = [
            {[`${words[0]}`]: this.data[ngramConst.UNIGRAM][words[0]]},
            {[`${words[1]}`]: this.data[ngramConst.UNIGRAM][words[1]]},
            {[`${words[2]}`]: this.data[ngramConst.UNIGRAM][words[2]]}
        ];

        var collections = [
            helper.createNgramCombination([this.getSuggestions(words[0]), wordAlts[1], wordAlts[2]]),
            helper.createNgramCombination([wordAlts[0], this.getSuggestions(words[1]), wordAlts[2]]),
            helper.createNgramCombination([wordAlts[0], wordAlts[1], this.getSuggestions(words[2])])
        ];

        collections.forEach(function (collection) {
            for (var combination in collection) {
                // Only accept valid word combination (exists in n-gram knowledge).
                if (self.isValid(combination, ngramConst.TRIGRAM)) {
                    // Check if alternatives already exists.
                    if (!alternatives.hasOwnProperty(combination)) {
                        alternatives[combination] = self.data.trigrams[combination];
                    }
                }
            }
        });

        return alternatives;
    }
};

module.exports = Verberne;
