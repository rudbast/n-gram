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

module.exports = {
    uniSplit,
    biSplit,
    triSplit
}
