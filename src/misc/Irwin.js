'use strict';

var _      = require('lodash');

var Setiadi     = require(__dirname + '/../ref/Setiadi.js'),
    helper      = require(__dirname + '/../util/helper.js'),
    levenshtein = require(__dirname + '/../util/levenshtein.js'),
    ngramUtil   = require(__dirname + '/../util/ngram.js');

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

    /**
     * Main correction's logic.
     *
     * @param  {Array}  words Ngram split word
     * @return {Object}       Correction results in a form of hash/dictionary
     */
    doCorrect(words) {
        var corrections = new Array();

        words.forEach(word => {
            if (this.isValid(word) || word == ngramUtil.NUMBER) {
                corrections.push({
                    [`${word}`]: 0
                });
            } else {
                var useWordAssumption   = true,
                    wordSuggestions     = this.getSuggestions(word, useWordAssumption),
                    wordSuggestionsSize = _.keys(wordSuggestions).length;

                if (wordSuggestionsSize != 0) {
                    corrections.push(wordSuggestions);
                } else {
                    corrections.push({
                        [`${word}`]: 0
                    });
                }
            }
        });

        return helper.createNgramCombination(corrections);
    }
}

module.exports = Irwin;
