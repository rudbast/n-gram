'use strict';

/**
 * Split a text into unigram (1-gram) collection of words.
 *
 * @param  {string} text Text to be split
 * @return {array}       Split words
 */
function uniSplit(text) {
    return text.split(/\s+/);
}

/**
 * Split a text into bigram (2-gram) collection of words.
 *
 * @param  {string} text Text to be split
 * @return {array}       Split words
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
 * @return {array}       Split words
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
 * @return {object}      Split words in a object (for each n-gram)
 */
function tripleNSplit(text) {
    var words  = uniSplit(text),
        ngrams = {
            unigrams: [],
            bigrams: [],
            trigrams: []
        };

    if (words.length < 2) {
        ngrams.unigrams = words;
        return ngrams;
    }

    var current  = words.shift(),
        next     = words.shift(),
        last;

    ngrams.unigrams.push(current);
    ngrams.unigrams.push(next);

    while (words.length > 0) {
        last = words.shift();

        var unigram = last,
            bigram  = `${current} ${next}`,
            trigram = `${current} ${next} ${last}`;

        ngrams.unigrams.push(unigram);
        ngrams.bigrams.push(bigram);
        ngrams.trigrams.push(trigram);

        current = next;
        next    = last;
    }
    ngrams.bigrams.push(`${current} ${next}`);

    return ngrams;
}

module.exports = {
    uniSplit,
    biSplit,
    triSplit,
    tripleNSplit
}
