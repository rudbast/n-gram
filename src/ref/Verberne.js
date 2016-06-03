'use strict';

var _ = require('lodash');

var levenshtein = require(__dirname + '/../util/levenshtein.js'),
    helper      = require(__dirname + '/../util/helper.js'),
    ngramUtil   = require(__dirname + '/../util/ngram.js');

var ngramConst  = new ngramUtil.NgramConstant();

const DEFAULT_DISTANCE_LIMIT = 1;

/**
 * @class     Verberne
 * @classdesc Spelling correction main class (as implemented by Suzan Verberne).
 * @see http://sverberne.ruhosting.nl/papers/verberne2002.pdf
 *
 * @constructor
 * @param {Informations} informations          Words' informations (data, count, size, similars, vocabularies)
 * @param {Object}       [options]             Options to initialize the component with
 * @param {number}       [options.distLimit=1] Word's different (distance) limit
 *
 * @property {Object} data          N-grams words index container
 * @property {Object} similars      Words with it's similars pairs
 * @property {number} distanceLimit Words distance limit
 */
var Verberne = function (informations, options) {
    options = _.isUndefined(options) ? new Object() : options;

    this.data          = informations.data;
    this.similars      = informations.similars;
    this.distanceLimit = _.isUndefined(options.distLimit) ? DEFAULT_DISTANCE_LIMIT : options.distLimit;
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
            gramClass = ngramUtil.getGramClass(ngramUtil.uniSplit(gram).length);
        }

        return _.has(this.data[gramClass], gram);
    },

    /**
     * Get list of similar words suggestion given a word.
     *
     * @param  {string} inputWord Input word
     * @return {Object}           Suggestion list of similar words
     */
    getSuggestions: function (inputWord) {
        return this.similars[inputWord];
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
            subPart = ngramUtil.tripleNSplit(subPart);

            if (subPart[ngramConst.TRIGRAM].length == 0) {
                if (subPart[ngramConst.UNIGRAM].length == 0) {
                    return;
                } else if (subPart[ngramConst.BIGRAM].length == 0) {
                    subPart = subPart[ngramConst.UNIGRAM];
                } else {
                    subPart = subPart[ngramConst.BIGRAM];
                }
            } else {
                subPart = subPart[ngramConst.TRIGRAM];
            }

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
     * @param  {Array}  parts Ngram split word
     * @return {Object}       Correction results in a form of hash/dictionary
     */
    doCorrect: function (parts) {
        var self        = this,
            corrections = new Object();

        parts.forEach(function (part) {
            var words            = ngramUtil.uniSplit(part),
                errorIndexes     = self.detectNonWord(words),
                errorIndexLength = _.keys(errorIndexes).length,
                isValidTrigram   = self.detectRealWord(part),
                alternatives     = new Object();

            if (!isValidTrigram) {
                // Contains real word error.
                alternatives = self.createAlternatives(words);
            }

            if (isValidTrigram) {
                // If trigram is valid, we'll add it into the alternatives, with
                // its' frequency information.
                alternatives[part] = self.data[ngramConst.TRIGRAM][part];
            } else {
                // Append original trigram as the alternatives when ANY error
                // is detected.
                alternatives[part] = 0;
            }

            corrections = helper.createNgramCombination([corrections, alternatives]);
        });

        return corrections;
    },

    /**
     * Detect non word error if exists.
     *
     * @param  {Array} words List of words (ordered) from a sentence
     * @return {Array}       Index of the word having an error (empty if no error found)
     */
    detectNonWord: function (words) {
        var self         = this,
            errorIndexes = new Array();

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
     * @param  {string}  trigram Word pair in a form of trigram.
     * @return {boolean}         Indicates if the trigram is valid.
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
        var self         = this,
            alternatives = new Object(),
            wordAlts     = [
                {[`${words[0]}`]: this.data[ngramConst.UNIGRAM][words[0]]},
                {[`${words[1]}`]: this.data[ngramConst.UNIGRAM][words[1]]},
                {[`${words[2]}`]: this.data[ngramConst.UNIGRAM][words[2]]}
            ],
            suggestWords = new Array();

        // Create alternate suggestions, excluding the token <number>.
        words.forEach(function (word) {
            if (word != '<number>') {
                suggestWords.push(self.getSuggestions(word));
            } else {
                suggestWords.push(word);
            }
        });

        var collections = [
            helper.createNgramCombination([suggestWords[0], wordAlts[1], wordAlts[2]]),
            helper.createNgramCombination([wordAlts[0], suggestWords[1], wordAlts[2]]),
            helper.createNgramCombination([wordAlts[0], wordAlts[1], suggestWords[2]])
        ];

        collections.forEach(function (collection) {
            for (var combination in collection) {
                // Only accept valid word combination (exists in n-gram knowledge).
                if (self.isValid(combination, ngramConst.TRIGRAM)) {
                    // Check if alternatives already exists.
                    if (!_.has(alternatives, combination)) {
                        alternatives[combination] = self.data[ngramConst.TRIGRAM][combination];
                    }
                }
            }
        });

        return alternatives;
    }
};

module.exports = Verberne;
