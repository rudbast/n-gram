'use strict';

var _ = require('lodash');

var Setiadi = require(__dirname + '/Setiadi.js');

/**
 * @class     AuxSetiadi
 * @classdesc Spelling correction main class (as implemented by Iskandar Setiadi) modified to use Trie as vocabularies.
 * @see https://www.researchgate.net/publication/268334497_Damerau-Levenshtein_Algorithm_and_Bayes_Theorem_for_Spell_Checker_Optimization
 *
 * @property {Object} data          N-grams words index container
 * @property {number} distanceLimit Words distance limit
 * @property {Trie}   vocabularies  Trie structured words vocabulary
 */
class AuxSetiadi extends Setiadi {
    /**
     * @constructor
     * @param {Informations} informations          Words' informations (data, count, size, similars, vocabularies)
     * @param {Object}       [options]             Options to initialize the component with
     * @param {number}       [options.distLimit=1] Word's different (distance) limit
     */
    constructor(informations, options) {
        options = _.isUndefined(options) ? new Object() : options;
        super(informations, options);

        this.vocabularies = informations.vocabularies;
    }

    /**
     * Checks a word's validity.
     *
     * @param  {string}  inputWord Word to be checked
     * @return {boolean}           Word validity
     */
    isValid(inputWord) {
        return this.vocabularies.has(inputWord);
    }

    /**
     * Get list of similar words suggestion given a word.
     *
     * @param  {string} inputWord Input word
     * @return {Object}           Suggestion list of similar words
     */
    getSuggestions(inputWord) {
        var self        = this,
            suggestions = this.vocabularies.findWordsWithinLimitDamLev(inputWord, this.distanceLimit);

        _.forEach(suggestions, function (distance, word) {
            suggestions[word] = self.data.unigrams[word];
        });

        return suggestions;
    }
}

module.exports = AuxSetiadi;
