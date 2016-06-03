'use strict';

var _ = require('lodash');

/**
 * @class     NGram
 * @classdesc N-Gram's helper class.
 */
class NGram {
    /**
     * Functions as constants.
     */
    get UNIGRAM() { return 'unigrams'; }
    get BIGRAM() { return 'bigrams'; }
    get TRIGRAM() { return 'trigrams'; }
    get NUMBER() { return '<ANGKA>'; }

    /**
     * Find out what n-gram class of the given word count of the ngram
     * or the string representation (return the opposite alternate representation).
     *
     * @throws {string} If given identity is not uni/bi/tri-gram's number/string representation
     * @param  {number|string} wordCount Word count/string representation of ngram
     * @return {number|string}           String/number representation of the n-gram's class
     */
    getGramClass(identity) {
        if (_.isNumber(identity)) {
            switch (identity) {
                case 1: return this.UNIGRAM;
                case 2: return this.BIGRAM;
                case 3: return this.TRIGRAM;
                default: throw 'Invalid gram give, only accept uni/bi/tri-gram.';
            }
        } else {
            switch (identity) {
                case this.UNIGRAM: return 1;
                case this.BIGRAM: return 2;
                case this.TRIGRAM: return 3;
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
    getLowerGramClass(identity) {
        if (!_.isNumber(identity)) {
            identity = this.getGramClass(identity);
        }

        switch (identity) {
            case 2: return this.UNIGRAM;
            case 3: return this.BIGRAM;
            default: throw 'Invalid gram given, only accept bi/tri-gram.';
        }
    }

    /**
     * Split a text into unigram (1-gram) collection of words.
     *
     * @param  {string} text Text to be split
     * @return {Array}       Split words
     */
    uniSplit(text) {
        return text.split(/\s+/);
    }

    /**
     * Split a text into bigram (2-gram) collection of words.
     *
     * @param  {string} text Text to be split
     * @return {Array}       Split words
     */
    biSplit(text) {
        var words   = this.uniSplit(text),
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
    triSplit(text) {
        var words    = this.uniSplit(text),
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
    tripleNSplit(text) {
        var words  = this.uniSplit(text),
            ngrams = {
                [`${this.UNIGRAM}`]: [],
                [`${this.BIGRAM}`]: [],
                [`${this.TRIGRAM}`]: []
            };

        if (words.length < 2) {
            ngrams[this.UNIGRAM] = words;
            return ngrams;
        }

        var current  = words.shift(),
            next     = words.shift(),
            last;

        ngrams[this.UNIGRAM].push(current);
        ngrams[this.UNIGRAM].push(next);

        while (words.length > 0) {
            last = words.shift();

            var unigram = last,
                bigram  = `${current} ${next}`,
                trigram = `${current} ${next} ${last}`;

            ngrams[this.UNIGRAM].push(unigram);
            ngrams[this.BIGRAM].push(bigram);
            ngrams[this.TRIGRAM].push(trigram);

            current = next;
            next    = last;
        }
        ngrams.bigrams.push(`${current} ${next}`);

        return ngrams;
    }
}

module.exports = new NGram();
