'use strict';

var _ = require('lodash');

var levenshtein = require(__dirname + '/../util/levenshtein.js'),
    helper      = require(__dirname + '/../util/helper.js'),
    ngramUtil   = require(__dirname + '/../util/ngram.js');

var ngramConst  = new ngramUtil.NgramConstant();

/**
 * Spelling correction main class (custom).
 *
 * @param {Object} informations  Words' informations (data, count, size, similars, vocabularies)
 * @param {Number} distanceLimit Words distance limit
 *
 * @property {Object} data          N-grams words index container
 * @property {Object} size          Total unique gram/word pair of each N-gram
 * @property {Object} count         Total frequency count of all gram/word pair of each N-gram
 * @property {Object} similars      Words with it's similars pairs
 * @property {Trie}   vocabularies  Trie's structured vocabularies
 * @property {Number} distanceLimit Words distance limit
 * @constructor
 */
var Corrector = function (informations, distanceLimit) {
    this.data          = informations.data;
    this.size          = informations.size;
    this.count         = informations.count;
    this.similars      = informations.similars;
    this.vocabularies  = informations.vocabularies;
    this.distanceLimit = !_.isUndefined(distanceLimit) ? distanceLimit : 2;
};

Corrector.prototype = {
    /**
     * Re-set the words distance limit.
     *
     * @param {Number} distanceLimit Words distance limit
     */
    setDistanceLimit: function (distanceLimit) {
        this.distanceLimit = distanceLimit;
    },

    /**
     * Check the validity of given gram.
     *
     * @param  {String}  gram      Word pair in a form of certain n-gram
     * @param  {String}  gramClass String representation of the n-gram
     * @return {Boolean}           Gram validity
     */
    isValid: function (gram, gramClass) {
        if (gramClass === undefined) {
            gramClass = ngramUtil.getGramClass(ngramUtil.uniSplit(gram).length);
        }

        if (gramClass == ngramConst.UNIGRAM) {
            return this.vocabularies.has(gram);
        }
        return this.data[gramClass].hasOwnProperty(gram);
    },

    /**
     * Get list of similar words suggestion given a word.
     *
     * @param  {String} inputWord Input word
     * @return {Object}           Suggestion list of similar words
     */
    getSuggestions: function (inputWord) {
        if (this.isValid(inputWord, ngramConst.UNIGRAM)) {
            return this.similars[inputWord];
        }

        // Get suggestions by incorporating Levenshtein with Trie.
        return this.vocabularies.findWordsWithinLimit(inputWord, this.distanceLimit);

        // NOTE: Might need to consider whether to remove the code below a little later.
        // Get suggestions by computing Levenshtein naively.
        // var suggestions = new Object();

        // for (var dictWord in this.data[ngramConst.UNIGRAM]) {
        //     if (this.data[ngramConst.UNIGRAM].hasOwnProperty(dictWord)) {
        //         // var distance = levenshtein.distanceOnThreshold(inputWord, dictWord, this.distanceLimit);
        //         var distance = levenshtein.distance(inputWord, dictWord);

        //         if (distance <= this.distanceLimit ) {
        //             var rank = this.data[ngramConst.UNIGRAM][dictWord];
        //             suggestions[dictWord] = rank;
        //         }
        //     }
        // }

        // return suggestions;
    },

    /**
     * Try correcting the given sentence if there exists any error.
     *
     * @param  {String} sentence Text input in a sentence form
     * @return {Object}          List of suggestions (if error exists)
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

        var skipCount     = 0,
            parseAsNumber = true,
            previousErrorIndexes, previousAlternatives;

        parts.forEach(function (part, partIndex) {
            var words        = ngramUtil.uniSplit(part),
                gramClass    = ngramUtil.getGramClass(words.length),
                alternatives = new Object();

            // Skip checking current trigram and just combine result from previous correction
            // if previous ones contains non word error.
            if ((--skipCount) >= 0) {
                alternatives = self.createAlternateNonWordGramOfTrigram(words,
                                                                        gramClass,
                                                                        previousErrorIndexes,
                                                                        previousAlternatives,
                                                                        skipCount);
                corrections.push(alternatives);
                return;
            }

            var errorIndexes     = self.detectNonWord(words),
                errorIndexLength = Object.keys(errorIndexes).length,
                isValidGram      = self.detectRealWord(part, gramClass);

            if (errorIndexLength == 0 && isValidGram) {
                // Contains no error.
                alternatives[part] = self.ngramProbability(words);
            } else if (errorIndexLength != 0) {
                // Contains non-word error.
                alternatives = self.createAlternativesNonWord(words, gramClass, errorIndexes);

                // Skipping only applies if there's more part to be checked.
                if (partIndex < parts.length - 1) {
                    // Find the last occurred error's index, and we'll skip checking the next
                    // 'skipCount' part of trigram.
                    previousErrorIndexes = helper.convertSimpleObjToSortedArray(errorIndexes,
                                                                                parseAsNumber);
                    skipCount            = previousErrorIndexes[previousErrorIndexes.length - 1];
                    previousAlternatives = [
                        new Object(),
                        new Object(),
                        new Object()
                    ];

                    // Extract all unique word's of each index from the alternatives.
                    for (var alt in alternatives) {
                        ngramUtil.uniSplit(alt).forEach(function (altWord, altIndex) {
                            previousAlternatives[altIndex][altWord] = true;
                        });
                    }
                }
            } else if (!isValidGram) {
                // Contains real word error.
                // NOTE: Current real word error correction only allows 1 word from
                //      any word length (2/3) to be corrected. This means if the current
                //      gram has more than 2 real word error, only 1 will be corrected
                //      and not the other, so the correction will fail. Might need to
                //      reconsider this problem.
                alternatives = self.createAlternativesRealWord(words, gramClass);

                // In case of no alternative trigram available, we're going to create them by
                // combining bigrams, or even unigrams.
                if (Object.keys(alternatives).length == 0 && gramClass != ngramConst.UNIGRAM) {
                    alternatives = self.createAlternateRealWordGramOfTrigram(words, gramClass);
                }
            }

            corrections.push(alternatives);
        });

        var suggestions = helper.createNgramCombination(corrections, 'multiply');
        return suggestions;
    },

    /**
     * Detect non word error if exists.
     *
     * @param  {Array}  words List of words (ordered) from a sentence
     * @return {Object}       Index of the word having an error (empty if no error found)
     */
    detectNonWord: function (words) {
        var self = this;
        var errorIndexes = new Object();

        words.forEach(function (word, index) {
            if (!self.isValid(word, ngramConst.UNIGRAM)) {
                errorIndexes[index] = true;
            }
        });

        return errorIndexes;
    },

    /**
     * Detect real word error.
     *
     * @param  {String}  gram      Word pair in a form of a certain gram
     * @param  {String}  gramClass The n class of the given gram
     * @return {Boolean}           Validity of the given gram
     */
    detectRealWord: function (gram, gramClass) {
        return this.isValid(gram, gramClass);
    },

    /**
     * Create new combination of trigram by combining bigrams or unigrams.
     *
     * @param  {Array}  words     List of words (ordered)
     * @param  {String} gramClass Current dealt gram's class
     * @return {Object}           New combination of trigram
     */
    createAlternateRealWordGramOfTrigram: function (words, gramClass) {
        var self = this;

        var alternatives   = new Object(),
            collections    = new Array();

        if (gramClass == ngramConst.TRIGRAM) {
            collections.push(this.createAlternativesRealWord(words.slice(0, 2), ngramConst.BIGRAM));
            collections.push(this.createAlternativesRealWord(words.slice(1), ngramConst.BIGRAM));
        } else if (gramClass == ngramConst.BIGRAM) {
            words.forEach(function (word) {
                collections.push(self.createAlternativesRealWord([word], ngramConst.UNIGRAM));
            });
        }

        alternatives = helper.createNgramCombination(collections);
        var alternativeSize = Object.keys(alternatives).length;

        // NOTE: May need to consider another way of computing trigram probabilities.
        //      'compute trigram probabilities, given only known bigram'
        //      @see http://stackoverflow.com/a/20587491/3190026
        if (alternativeSize == 0 && gramClass == ngramConst.TRIGRAM) {
            alternatives = this.createAlternateRealWordGramOfTrigram(words, ngramConst.BIGRAM);
        }

        return alternatives;
    },

    /**
     * Create valid n-gram alternatives from a list of words' similarity,
     * only allows 1 different word from the original n-gram.
     *
     * @param  {Array}  words     List of words (ordered) from a sentence
     * @param  {String} gramClass String representation of the n-gram
     * @return {Object}           Valid n-grams with it's probability
     */
    createAlternativesRealWord: function (words, gramClass) {
        var self = this;

        var alternatives = new Object(),
            wordAlts     = new Array(),
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
                    var suggestions = self.getSuggestions(words[j]);
                    // Include the original word into the 'words similarity' list, as it
                    // might be a solution too.
                    suggestions[words[j]] = 0;

                    subAlternatives.push(suggestions);
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
                        alternatives[combination] = self.ngramProbability(ngramUtil.uniSplit(combination));
                    }
                }
            }
        });

        return alternatives;
    },

    /**
     * Create new combination of trigram, given that previous trigram contains a non
     * word error that is also in the current trigram.
     *
     * @param  {Array}  words        List of words (ordered)
     * @param  {String} gramClass    String representation of the n-gram
     * @param  {Array}  errorIndexes Indexes of previous word list that indicates an error
     * @param  {Array}  prevAltWords Unique words of resulted trigram of previous correction
     * @param  {Number} skipCount    Current skip count
     * @return {Object}              Alternatives gain by combining previous alternatives
     */
    createAlternateNonWordGramOfTrigram: function (words, gramClass, errorIndexes, prevAltWords, currentSkipCount) {
        var self = this;

        const MAX_SKIP_COUNT = 2;

        var alternatives    = new Object(),
            collections     = new Array(),
            subAlternatives = new Array(),
            prevAltIndex    = MAX_SKIP_COUNT - (currentSkipCount + 1);

        words.forEach(function (word, wordIndex) {
            var subWordAlts = new Object();
            subWordAlts[word] = 0;

            if (prevAltIndex++ < MAX_SKIP_COUNT) {
                for (var altWord in prevAltWords[prevAltIndex])
                    subWordAlts[altWord] = 0;
            }

            subAlternatives.push(subWordAlts);
        });

        collections.push(helper.createNgramCombination(subAlternatives));

        collections.forEach(function (collection) {
            for (var combination in collection) {
                // Only accept valid word combination (exists in n-gram knowledge).
                if (self.isValid(combination, gramClass)) {
                    // Check if alternatives already exists.
                    if (!alternatives.hasOwnProperty(combination)) {
                        alternatives[combination] = self.ngramProbability(ngramUtil.uniSplit(combination));
                    }
                }
            }
        });

        return alternatives;
    },

    /**
     * Create valid n-gram alternatives from a list of words' similarity,
     * only allows 1 different word from the original n-gram excluding the
     * word which is categorized as non-word error.
     *
     * @param  {Array}  words        List of words (ordered) from a sentence
     * @param  {String} gramClass    String representation of the n-gram
     * @param  {Object} errorIndexes Container for indexes of the error word
     * @return {Object}              Valid trigrams with it's probability
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
                        alternatives[combination] = self.ngramProbability(ngramUtil.uniSplit(combination));
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
     * @param  {Array}  words Collection of words (ordered)
     * @return {Number}       Probability of the n-gram (range 0-1)
     */
    ngramProbability: function (words) {
        var gram, probability, precedenceGram;

        switch (ngramUtil.getGramClass(words.length)) {
            case ngramConst.UNIGRAM:
                gram        = `${words[0]}`;
                probability = this.data[ngramConst.UNIGRAM][gram] / this.size[ngramConst.UNIGRAM];
                break;

            case ngramConst.BIGRAM:
                gram           = `${words[0]} ${words[1]}`;
                precedenceGram = `${words[0]}`;
                probability    = this.data[ngramConst.BIGRAM][gram] / this.data[ngramConst.UNIGRAM][precedenceGram];
                break;

            case ngramConst.TRIGRAM:
                gram           = `${words[0]} ${words[1]} ${words[2]}`;
                precedenceGram = `${words[0]} ${words[1]}`;
                probability    = this.data[ngramConst.TRIGRAM][gram] / this.data[ngramConst.BIGRAM][precedenceGram];
                break;
        }

        return probability;
    }
};

module.exports = Corrector;
