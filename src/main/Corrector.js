'use strict';

var _ = require('lodash');

var levenshtein = require(__dirname + '/../util/levenshtein.js'),
    helper      = require(__dirname + '/../util/helper.js'),
    ngramUtil   = require(__dirname + '/../util/ngram.js');

/**
 * Spelling correction main class (custom).
 *
 * @param {object}  ngrams        Word index
 * @param {object}  similars      Words with it's similars pairs
 * @param {integer} distanceLimit Words distance limit
 * @param {object}  vocabularies  Trie's structured vocabularies
 *
 * @property {object}  data          N-grams words index container
 * @property {object}  similars      Words with it's similars pairs
 * @property {integer} distanceLimit Words distance limit
 * @property {object}  vocabularies  Trie's structured vocabularies
 * @property {string}  NGRAM_UNIGRAM String representation for unigram
 * @property {string}  NGRAM_BIGRAM  String representation for bigram
 * @property {string}  NGRAM_TRIGRAM String representation for trigram
 * @constructor
 */
var Corrector = function (ngrams, similars, distanceLimit, vocabularies) {
    this.data          = ngrams;
    this.similars      = similars;
    this.distanceLimit = !_.isUndefined(distanceLimit) ? distanceLimit : 2;
    this.vocabularies  = vocabularies;

    this.NGRAM_UNIGRAM = 'unigrams';
    this.NGRAM_BIGRAM  = 'bigrams';
    this.NGRAM_TRIGRAM = 'trigrams';
};

Corrector.prototype = {
    /**
     * Re-set the words distance limit.
     *
     * @param {integer} distanceLimit Words distance limit
     */
    setDistanceLimit: function (distanceLimit) {
        this.distanceLimit = distanceLimit;
    },

    /**
     * Check the validity of given gram.
     *
     * @param  {string}  gram      Word pair in a form of certain n-gram
     * @param  {string}  gramClass String representation of the n-gram
     * @return {boolean}           Gram validity
     */
    isValid: function (gram, gramClass) {
        if (gramClass === undefined) {
            gramClass = this.getGramClass(ngramUtil.uniSplit(gram).length);
        }

        if (gramClass == this.NGRAM_UNIGRAM) {
            return this.vocabularies.has(gram);
        }
        return this.data[gramClass].hasOwnProperty(gram);
    },

    /**
     * Get list of similar words suggestion given a word.
     *
     * @param  {string} inputWord Input word
     * @return {object}           Suggestion list of similar words
     */
    getSuggestions: function (inputWord) {
        if (this.isValid(inputWord, this.NGRAM_UNIGRAM)) {
            return this.similars[inputWord];
        }

        // Get suggestions by incorporating Levenshtein with Trie.
        return this.vocabularies.findWordsWithinLimit(inputWord, this.distanceLimit);

        // NOTE: Might need to consider whether to remove the code below a little later.
        // Get suggestions by computing Levenshtein naively.
        // var suggestions = new Object();

        // for (var dictWord in this.data.unigrams) {
        //     if (this.data.unigrams.hasOwnProperty(dictWord)) {
        //         // var distance = levenshtein.distanceOnThreshold(inputWord, dictWord, this.distanceLimit);
        //         var distance = levenshtein.distance(inputWord, dictWord);

        //         if (distance <= this.distanceLimit ) {
        //             var rank = this.data.unigrams[dictWord];
        //             suggestions[dictWord] = rank;
        //         }
        //     }
        // }

        // return suggestions;
    },

    /**
     * Try correcting the given sentence if there exists any error.
     *
     * @param  {string} sentence Text input in a sentence form
     * @return {object}          List of suggestions (if error exists)
     */
    tryCorrect: function (sentence) {
        var self = this;

        var corrections = new Array(),
            parts       = ngramUtil.triSplit(sentence);

        // If parts is empty, it means the word is lower than three.
        if (parts.length == 0) {
            var tempWords = ngramUtil.uniSplit(sentence);

            if (tempWords.length == 2) {
                parts.push(tempWords[0] + ' ' + tempWords[1]);
            } else {
                parts.push(tempWords[0]);
            }
        }

        parts.forEach(function (part) {
            var words            = ngramUtil.uniSplit(part),
                gramClass        = self.getGramClass(words.length),
                errorIndexes     = self.detectNonWord(words),
                errorIndexLength = Object.keys(errorIndexes).length,
                isValidGram      = self.detectRealWord(part, gramClass),
                alternatives     = new Object();

            if (errorIndexLength == 0 && isValidGram) {
                // Contains no error.
                alternatives[part] = self.ngramProbability(part);
            } else if (errorIndexLength != 0) {
                // Contains non-word error.
                alternatives = self.createAlternativesNonWord(words, gramClass, errorIndexes);
            } else if (!isValidGram) {
                // Contains real word error.
                // NOTE: Current real word error correction only allows 1 word from
                //      any word length (2/3) to be corrected. This means if the current
                //      gram has more than 2 real word error, only 1 will be corrected
                //      and not the other, so the correction will fail. Might need to
                //      reconsider this problem.
                alternatives = self.createAlternativesRealWord(words, gramClass);
            }

            corrections.push(alternatives);
        });

        var suggestions = helper.createNgramCombination(corrections, 'multiply');
        return suggestions;
    },

    /**
     * Find out what n-gram class of the given word count, represented
     * by a string.
     *
     * @param  {integer} wordCount Word count
     * @return {string}            String representation of the n-gram
     */
    getGramClass: function (wordCount) {
        switch (wordCount) {
            case 1: return this.NGRAM_UNIGRAM;
            case 2: return this.NGRAM_BIGRAM;
            case 3: return this.NGRAM_TRIGRAM;
            default: return 'invalid';
        }
    },

    /**
     * Detect non word error if exists.
     *
     * @param  {array}  words List of words (ordered) from a sentence
     * @return {object}       Index of the word having an error (empty if no error found)
     */
    detectNonWord: function (words) {
        var self = this;
        var errorIndexes = new Object();

        words.forEach(function (word, index) {
            if (!self.isValid(word, self.NGRAM_UNIGRAM)) {
                errorIndexes[index] = true;
            }
        });

        return errorIndexes;
    },

    /**
     * Detect real word error.
     *
     * @param  {string}  gram      Word pair in a form of a certain gram
     * @param  {string}  gramClass The n class of the given gram
     * @return {boolean}           Validity of the given gram
     */
    detectRealWord: function (gram, gramClass) {
        return this.isValid(gram, gramClass);
    },

    /**
     * Create valid trigram alternatives from a list of words' similarity,
     * only allows 1 different word from the original trigram.
     *
     * @param  {array}  words     List of words (ordered) from a sentence
     * @param  {string} gramClass String representation of the n-gram
     * @return {object}           Valid n-grams with it's probability
     */
    createAlternativesRealWord: function (words, gramClass) {
        var self = this;

        var alternatives = new Object(),
            wordAlts    = new Array(),
            collections  = new Array();

        words.forEach(function (word) {
            wordAlts.push({
                [`${word}`]: self.data.unigrams[word]
            });
        });

        for (var i = 0; i < words.length; ++i) {
            var subAlternatives = new Array();

            for (var j = 0; j < words.length; ++j) {
                if (i == j) {
                    subAlternatives.push(self.getSuggestions(words[j]));
                } else {
                    subAlternatives.push(wordAlts[j]);
                }
            }
            collections.push(helper.createNgramCombination(subAlternatives));
        }

        collections.forEach(function (collection) {
            for (var combination in collection) {
                // Only accept valid word combination (exists in n-gram knowledge).
                if (self.isValid(combination, gramClass)) {
                    // Check if alternatives already exists.
                    if (!alternatives.hasOwnProperty(combination)) {
                        alternatives[combination] = self.ngramProbability(combination);
                    }
                }
            }
        });

        return alternatives;
    },

    /**
     * Create valid trigram alternatives from a list of words' similarity,
     * only allows 1 different word from the original trigram excluding the
     * word which is categorized as non-word error.
     *
     * @param  {array}  words        List of words (ordered) from a sentence
     * @param  {string} gramClass    String representation of the n-gram
     * @param  {object} errorIndexes Container for indexes of the error word
     * @return {object}              Valid trigrams with it's probability
     */
    createAlternativesNonWord: function (words, gramClass, errorIndexes) {
        var self = this;

        var wordAlts        = new Array(),
            alternatives    = new Object(),
            nonErrorIndexes = new Array();

        words.forEach(function (word, index) {
            if (errorIndexes.hasOwnProperty(index)) {
                // If the current index word is an error, just push
                // empty string.
                wordAlts.push('');
            } else {
                wordAlts.push({
                    [`${word}`]: self.data.unigrams[word]
                });

                nonErrorIndexes.push(index);
            }
        });

        var totalAlternates    = words.length - Object.keys(errorIndexes).length + 1,
            collections        = new Array(),
            nonErrorIndex      = 0,
            nonErrorIndexValue = nonErrorIndexes[nonErrorIndex];

        // Begin constructing alternatives.
        for (var i = 0; i < totalAlternates; ++i) {
            var subAlternatives     = new Array(),
                incrementCleanIndex = false;

            words.forEach(function (word, index) {
                if (errorIndexes.hasOwnProperty(index)) {
                    // Current index is an error, we need to get suggestion for it.
                    subAlternatives.push(self.getSuggestions(word));
                } else {
                    if (index == nonErrorIndexValue) {
                        subAlternatives.push(self.getSuggestions(word));
                        incrementCleanIndex = true;
                    } else {
                        subAlternatives.push(wordAlts[index]);
                    }
                }
            });

            if (incrementCleanIndex) {
                if (nonErrorIndex < nonErrorIndexes.length - 1) {
                    nonErrorIndexValue = nonErrorIndexes[++nonErrorIndex];
                } else {
                    nonErrorIndexValue = -1;
                }
                incrementCleanIndex = false;
            }

            collections.push(helper.createNgramCombination(subAlternatives));
        }

        collections.forEach(function (collection) {
            for (var combination in collection) {
                // Only accept valid word combination (exists in n-gram knowledge).
                if (self.isValid(combination, gramClass)) {
                    // Check if alternatives already exists.
                    if (!alternatives.hasOwnProperty(combination)) {
                        alternatives[combination] = self.ngramProbability(combination);
                    }
                }
            }
        });

        return alternatives;
    },

    /**
     * Compute the probability of a n-gram.
     * @see https://en.wikipedia.org/wiki/Bigram
     *
     * @param  {sentence} ngram Text in a form of n-gram
     * @return {float}          Probability of the n-gram (range 0-1)
     */
    ngramProbability: function (ngram) {
        var words       = ngramUtil.uniSplit(ngram),
            probability = 0,
            precedenceGram;

        switch (words.length) {
            case 1: // Unigram.
                probability = this.data.unigrams[ngram] / Object.keys(this.data.unigrams).length;
                break;
            case 2: // Bigram.
                precedenceGram = `${words[0]}`;
                probability    = this.data.bigrams[ngram] / this.data.unigrams[precedenceGram];
                break;
            case 3: // Trigram.
                precedenceGram = `${words[0]} ${words[1]}`;
                probability    = this.data.trigrams[ngram] / this.data.bigrams[precedenceGram];
                break;
        }

        return probability;
    }
};

module.exports = Corrector;
