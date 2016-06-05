'use strict';

var _ = require('lodash');

var Verberne = require(__dirname + '/Verberne.js');

/**
 * @class     AuxVerberne
 * @classdesc Spelling correction main class (as implemented by Suzan Verberne) modified to use precomputed similar words list.
 * @see http://sverberne.ruhosting.nl/papers/verberne2002.pdf
 *
 * @property {Object} data          N-grams words index container
 * @property {Object} similars      Words with it's similars pairs
 * @property {Trie}   vocabularies  Trie's structured vocabularies
 * @property {number} distanceLimit Words distance limit
 */
class AuxVerberne extends Verberne {
    /**
     * @constructor
     * @param {Informations} informations          Words' informations (data, count, size, similars, vocabularies)
     * @param {Object}       [options]             Options to initialize the component with
     * @param {number}       [options.distLimit=1] Word's different (distance) limit
     */
    constructor(informations, options) {
        options = _.isUndefined(options) ? new Object() : options;
        super(informations, options);

        this.similars = informations.similars;
    }

    /**
     * Get list of similar words suggestion given a word.
     *
     * @param  {string} inputWord Input word
     * @return {Object}           Suggestion list of similar words
     */
    getSuggestions(inputWord) {
        return this.similars[inputWord];
    }
}

module.exports = AuxVerberne;
