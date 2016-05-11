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
 * @property {integer} unigramSize   Size of the unigrams' object
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

    this.unigramSize   = Object.keys(this.data[this.NGRAM_UNIGRAM]).length;
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

        var skipCount     = 0,
            parseAsNumber = true,
            previousErrorIndexes, previousAlternatives;

        parts.forEach(function (part, partIndex) {
            var words        = ngramUtil.uniSplit(part),
                gramClass    = self.getGramClass(words.length),
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
                if (Object.keys(alternatives).length == 0 && gramClass != self.NGRAM_UNIGRAM) {
                    alternatives = self.createAlternateRealWordGramOfTrigram(words, gramClass);
                }
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
     * Create new combination of trigram by combining bigrams or unigrams.
     *
     * @param  {array}  words     List of words (ordered)
     * @param  {string} gramClass Current dealt gram's class
     * @return {object}           New combination of trigram
     */
    createAlternateRealWordGramOfTrigram: function (words, gramClass) {
        var self = this;

        var alternatives   = new Object(),
            collections    = new Array();

        if (gramClass == this.NGRAM_TRIGRAM) {
            collections.push(this.createAlternativesRealWord(words.slice(0, 2), this.NGRAM_BIGRAM));
            collections.push(this.createAlternativesRealWord(words.slice(1), this.NGRAM_BIGRAM));
        } else if (gramClass == this.NGRAM_BIGRAM) {
            words.forEach(function (word) {
                collections.push(self.createAlternativesRealWord([word], self.NGRAM_UNIGRAM));
            });
        }

        alternatives = helper.createNgramCombination(collections);
        var alternativeSize = Object.keys(alternatives).length;

        // NOTE: May need to consider another way of computing trigram probabilities.
        //      'compute trigram probabilities, given only known bigram'
        //      @see http://stackoverflow.com/a/20587491/3190026
        if (alternativeSize == 0 && gramClass == this.NGRAM_TRIGRAM) {
            alternatives = this.createAlternateRealWordGramOfTrigram(words, this.NGRAM_BIGRAM);
        }

        return alternatives;
    },

    /**
     * Create valid n-gram alternatives from a list of words' similarity,
     * only allows 1 different word from the original n-gram.
     *
     * @param  {array}  words     List of words (ordered) from a sentence
     * @param  {string} gramClass String representation of the n-gram
     * @return {object}           Valid n-grams with it's probability
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
     * @param  {array}   words        List of words (ordered)
     * @param  {string}  gramClass    String representation of the n-gram
     * @param  {array}   errorIndexes Indexes of previous word list that indicates an error
     * @param  {array}   prevAltWords Unique words of resulted trigram of previous correction
     * @param  {integer} skipCount    Current skip count
     * @return {object}               Alternatives gain by combining previous alternatives
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
     * @param  {array} words Collection of words (ordered)
     * @return {float}       Probability of the n-gram (range 0-1)
     */
    ngramProbability: function (words) {
        var gram, probability, precedenceGram;

        switch (this.getGramClass(words.length)) {
            case this.NGRAM_UNIGRAM:
                gram        = `${words[0]}`;
                probability = this.data.unigrams[gram] / this.unigramSize;
                break;

            case this.NGRAM_BIGRAM:
                gram           = `${words[0]} ${words[1]}`;
                precedenceGram = `${words[0]}`;
                probability    = this.data.bigrams[gram] / this.data.unigrams[precedenceGram];
                break;

            case this.NGRAM_TRIGRAM:
                gram           = `${words[0]} ${words[1]} ${words[2]}`;
                precedenceGram = `${words[0]} ${words[1]}`;
                probability    = this.data.trigrams[gram] / this.data.bigrams[precedenceGram];
                break;
        }

        return probability;
    }
};

module.exports = Corrector;
