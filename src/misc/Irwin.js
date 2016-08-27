'use strict';

var _      = require('lodash');

var Setiadi     = require(__dirname + '/../ref/Setiadi.js'),
    levenshtein = require(__dirname + '/../util/levenshtein.js');

/**
 * @class     Irwin
 * @classdesc Spelling Correction for Irwin.
 * @see https://www.researchgate.net/publication/268334497_Damerau-Levenshtein_Algorithm_and_Bayes_Theorem_for_Spell_Checker_Optimization
 *
 * @property {Array}  data          Valid words list
 * @property {number} distanceLimit Words distance limit
 */
class Irwin extends Setiadi {
    /**
     * @constructor
     * @param {Informations} informations          Words' informations (data, count, size, similars, vocabularies)
     * @param {Object}       [options]             Options to initialize the component with
     * @param {number}       [options.distLimit=1] Word's different (distance) limit
     */
    constructor(informations, options) {
        super(informations, options);
    }

    /**
     * Checks a word's validity.
     *
     * @param  {string}  inputWord Word to be checked
     * @return {boolean}           Word validity
     */
    isValid(inputWord) {
        for (let index = 0; index < this.data.length; ++index) {
            if (this.data[index] == inputWord) {
                return true;
            }
        }
        return false;
    }

    /**
     * Get list of similar words suggestion given a word.
     *
     * @param  {string} inputWord Input word
     * @return {Object}           Suggestion list of similar words
     */
    getSuggestions(inputWord) {
        var suggestions   = new Object();

        for (var index = 0; index < this.data.length; ++index) {
            var dictWord = this.data[index],
                distance = levenshtein.optimalDamerauDistance(inputWord, dictWord);

            if (distance <= this.distanceLimit) {
                suggestions[dictWord] = distance;
            }
        }

        return suggestions;
    }
}

module.exports = Irwin;
