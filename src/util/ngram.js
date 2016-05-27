'use strict';

var _ = require('lodash');

/**
 * N-gram's constants, used in spelling corrector to represent
 * ngram.
 *
 * @constructor
 * @property {string} UNIGRAM      Unigram's string repsenentation
 * @property {string} BIGRAM       Bigram's string repsenentation
 * @property {string} TRIGRAM      Trigram's string repsenentation
 * @property {string} TOKEN_NUMBER Number token's string representation
 */
var NgramConstant = function () {
    this.UNIGRAM = 'unigrams';
    this.BIGRAM  = 'bigrams';
    this.TRIGRAM = 'trigrams';

    this.TOKEN_NUMBER  = '<ANGKA>';
};

/**
 * Instantiated object of constants for ngram.
 *
 * @type {NgramConstant}
 */
var ngramConst = new NgramConstant();

/**
 * Find out what n-gram class of the given word count of the ngram
 * or the string representation (return the opposite alternate representation).
 *
 * @throws {string} If given identity is not uni/bi/tri-gram's number/string representation
 * @param  {number|string} wordCount Word count/string representation of ngram
 * @return {number|string}           String/number representation of the n-gram's class
 */
function getGramClass(identity) {
    if (_.isNumber(identity)) {
        switch (identity) {
            case 1: return ngramConst.UNIGRAM;
            case 2: return ngramConst.BIGRAM;
            case 3: return ngramConst.TRIGRAM;
            default: throw 'Invalid gram give, only accept uni/bi/tri-gram.';
        }
    } else {
        switch (identity) {
            case ngramConst.UNIGRAM: return 1;
            case ngramConst.BIGRAM: return 2;
            case ngramConst.TRIGRAM: return 3;
            default: throw 'Invalid gram give, only accept uni/bi/tri-gram.';
        }
    }
}

/**
 * Get the lower gram class of the given gram. Will return 'invalid' if "1/unigrams"
 * is given, since it's already the lowest one.
 *
 * @throws {string} If given identity is not bi/tri-gram's number/string representation
 * @param  {number|string} identity Word count/string representation of ngram
 * @return {number|string}          String/number representation of the lower n-gram's class
 */
function getLowerGramClass(identity) {
    if (!_.isNumber(identity)) {
        identity = getGramClass(identity);
    }

    switch (identity) {
        case 2: return ngramConst.UNIGRAM;
        case 3: return ngramConst.BIGRAM;
        default: throw 'Invalid gram given, only accept bi/tri-gram.';
    }
}

/**
 * Split a text into unigram (1-gram) collection of words.
 *
 * @param  {string} text Text to be split
 * @return {Array}       Split words
 */
function uniSplit(text) {
    return text.split(/\s+/);
}

/**
 * Split a text into bigram (2-gram) collection of words.
 *
 * @param  {string} text Text to be split
 * @return {Array}       Split words
 */
function biSplit(text) {
    var words   = uniSplit(text),
        bigrams = [];

    if (words.length < 2) return [];

    var current = words.shift(),
        next;

    while (words.length > 0) {
        next = words.shift();

        var bigram = `${current} ${next}`;
        bigrams.push(bigram);

        current = next;
    }

    return bigrams;
}

/**
 * Split a text into trigram (3-gram) collection of words.
 *
 * @param  {string} text Text to be split
 * @return {Array}       Split words
 */
function triSplit(text) {
    var words    = uniSplit(text),
        trigrams = [];

    if (words.length < 3) return [];

    var current  = words.shift(),
        next     = words.shift(),
        last;

    while (words.length > 0) {
        last = words.shift();

        var trigram = `${current} ${next} ${last}`;
        trigrams.push(trigram);

        current = next;
        next    = last;
    }

    return trigrams;
}

/**
 * Split a text into 1,2,3-gram collection of words.
 *
 * @param  {string} text Text to be split
 * @return {Object}      Split words in a object (for each n-gram)
 */
function tripleNSplit(text) {
    var words  = uniSplit(text),
        ngrams = {
            [`${ngramConst.UNIGRAM}`]: [],
            [`${ngramConst.BIGRAM}`]: [],
            [`${ngramConst.TRIGRAM}`]: []
        };

    if (words.length < 2) {
        ngrams[ngramConst.UNIGRAM] = words;
        return ngrams;
    }

    var current  = words.shift(),
        next     = words.shift(),
        last;

    ngrams[ngramConst.UNIGRAM].push(current);
    ngrams[ngramConst.UNIGRAM].push(next);

    while (words.length > 0) {
        last = words.shift();

        var unigram = last,
            bigram  = `${current} ${next}`,
            trigram = `${current} ${next} ${last}`;

        ngrams[ngramConst.UNIGRAM].push(unigram);
        ngrams[ngramConst.BIGRAM].push(bigram);
        ngrams[ngramConst.TRIGRAM].push(trigram);

        current = next;
        next    = last;
    }
    ngrams.bigrams.push(`${current} ${next}`);

    return ngrams;
}

module.exports = {
    NgramConstant,
    getGramClass,
    getLowerGramClass,
    uniSplit,
    biSplit,
    triSplit,
    tripleNSplit
}
