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
 * @property {string}  NGRAM_UNIGRAM String representation for unigram
 * @property {string}  NGRAM_BIGRAM  String representation for bigram
 * @property {string}  NGRAM_TRIGRAM String representation for trigram
 * @constructor
 */
var Verberne = function (ngrams, similars, distanceLimit) {
    this.data          = ngrams;
    this.similars      = similars;
    this.distanceLimit = distanceLimit !== undefined ? distanceLimit : 2;

    this.NGRAM_UNIGRAM = 'unigrams';
    this.NGRAM_BIGRAM  = 'bigrams';
    this.NGRAM_TRIGRAM = 'trigrams';
};

Verberne.prototype = {
    /**
     * Check the validity of given gram.
     *
     * @param  {string}  gram      Word pair in a form of certain n-gram
     * @param  {string}  gramClass String representation of the n-gram
     * @return {boolean}           Gram validity
     */
    isValid: function (gram, gramClass) {
        if (gramClass === undefined) {
            gramClass = this.getGramClass(ngramUtil.uniSplit(gram).length);
        }

        if (gramClass == this.NGRAM_UNIGRAM) {
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
            var words            = ngramUtil.uniSplit(part),
                errorIndexes     = self.detectNonWord(words),
                errorIndexLength = Object.keys(errorIndexes).length,
                isValidTrigram   = self.detectRealWord(part),
                alternatives     = new Object();

            if (errorIndexLength == 0 && isValidTrigram) {
                alternatives[part] = self.data.trigrams[part];
            } else if (errorIndexLength != 0) {
                // Since verberne's spelling corrector only correct real word error,
                // we'll push the original ones in if it contains non-word error.
                alternatives[part] = 0;
            } else if (!isValidTrigram) {
                alternatives = self.createAlternatives(words);
            }

            corrections.push(alternatives);
        });

        var suggestions = helper.createNgramCombination(corrections, 'plus');
        return suggestions;
    },

    /**
     * Find out what n-gram class of the given word count, represented
     * by a string.
     *
     * @param  {integer} wordCount Word count
     * @return {string}            String representation of the n-gram
     */
    getGramClass: function (wordCount) {
        switch (wordCount) {
            case 1: return this.NGRAM_UNIGRAM;
            case 2: return this.NGRAM_BIGRAM;
            case 3: return this.NGRAM_TRIGRAM;
            default: return 'invalid';
        }
    },

    /**
     * Detect non word error if exists.
     *
     * @param  {array} words List of words (ordered) from a sentence
     * @return {array}       Index of the word having an error (empty if no error found)
     */
    detectNonWord: function (words) {
        var self = this;

        var errorIndexes = new Array();
        words.forEach(function (word, index) {
            if (!self.isValid(word, self.NGRAM_UNIGRAM)) {
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
        return this.isValid(trigram, this.NGRAM_TRIGRAM);
    },

    /**
     * Create valid trigram alternatives from a list of words' similarity,
     * only allows 1 different word from the original trigram.
     *
     * @param  {array}  words List of words (ordered) from a sentence
     * @return {object}       Valid trigrams with its' rank
     */
    createAlternatives: function (words) {
        var self = this;

        var alternatives = new Object();

        var wordAlts = [
            {[`${words[0]}`]: this.data.unigrams[words[0]]},
            {[`${words[1]}`]: this.data.unigrams[words[1]]},
            {[`${words[2]}`]: this.data.unigrams[words[2]]}
        ];

        var collections = [
            helper.createNgramCombination([this.getSuggestions(words[0]), wordAlts[1], wordAlts[2]]),
            helper.createNgramCombination([wordAlts[0], this.getSuggestions(words[1]), wordAlts[2]]),
            helper.createNgramCombination([wordAlts[0], wordAlts[1], this.getSuggestions(words[2])])
        ];

        collections.forEach(function (collection) {
            for (var combination in collection) {
                // Only accept valid word combination (exists in n-gram knowledge).
                if (self.isValid(combination, self.NGRAM_TRIGRAM)) {
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
