'use strict';

/**
 * N-gram's constants, used in spelling corrector to represent
 * ngram.
 *
 * @property {String} UNIGRAM Unigram's string repsenentation
 * @property {String} BIGRAM  Bigram's string repsenentation
 * @property {String} TRIGRAM Trigram's string repsenentation
 * @constructor
 */
var NgramConstant = function () {
    this.UNIGRAM = 'unigrams';
    this.BIGRAM  = 'bigrams';
    this.TRIGRAM = 'trigrams';
};

/**
 * Instantiated object of constants for ngram.
 *
 * @type {NgramConstant}
 */
var ngramConst = new NgramConstant();

/**
 * Find out what n-gram class of the given word count, represented
 * by a string.
 *
 * @param  {Integer} wordCount Word count
 * @return {String}            String representation of the n-gram
 */
function getGramClass(wordCount) {
    switch (wordCount) {
        case 1: return ngramConst.UNIGRAM;
        case 2: return ngramConst.BIGRAM;
        case 3: return ngramConst.TRIGRAM;
        default: return 'invalid';
    }
}

/**
 * Split a text into unigram (1-gram) collection of words.
 *
 * @param  {String} text Text to be split
 * @return {Array}       Split words
 */
function uniSplit(text) {
    return text.split(/\s+/);
}

/**
 * Split a text into bigram (2-gram) collection of words.
 *
 * @param  {String} text Text to be split
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
 * @param  {String} text Text to be split
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
 * @param  {String} text Text to be split
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
    uniSplit,
    biSplit,
    triSplit,
    tripleNSplit
}
