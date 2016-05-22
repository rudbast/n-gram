'use strict';

var _ = require('lodash');

var levenshtein = require(__dirname + '/../util/levenshtein.js'),
    helper      = require(__dirname + '/../util/helper.js'),
    ngramUtil   = require(__dirname + '/../util/ngram.js');

var ngramConst  = new ngramUtil.NgramConstant();

/**
 * Spelling correction main class (custom).
 *
 * @constructor
 * @param {Object} informations  Words' informations (data, count, size, similars, vocabularies)
 * @param {number} [distanceLimit=2] Words distance limit
 *
 * @property {Object} data          N-grams words index container
 * @property {Object} size          Total unique gram/word pair of each N-gram
 * @property {Object} count         Total frequency count of all gram/word pair of each N-gram
 * @property {Object} similars      Words with it's similars pairs
 * @property {Trie}   vocabularies  Trie's structured vocabularies
 * @property {number} distanceLimit Words distance limit
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
     * Check the validity of given gram.
     *
     * @param  {string}  gram        Word pair in a form of certain n-gram
     * @param  {string}  [gramClass] String representation of the n-gram
     * @return {boolean}             Gram validity
     */
    isValid: function (gram, gramClass) {
        if (_.isUndefined(gramClass)) {
            gramClass = ngramUtil.getGramClass(ngramUtil.uniSplit(gram).length);
        }

        if (gramClass == ngramConst.UNIGRAM) {
            return this.vocabularies.has(gram);
        }
        return _.has(this.data[gramClass], gram);
    },

    /**
     * Get list of similar words suggestion given a word.
     *
     * @param  {string}  inputWord         Input word
     * @param  {boolean} [includeMainWord] Indicates whether the main input word should be included in result
     * @return {Object}                    Suggestion list of similar words
     */
    getSuggestions: function (inputWord, includeMainWord) {
        includeMainWord = _.isUndefined(includeMainWord) ? false : includeMainWord;
        var similarWords;

        if (this.isValid(inputWord, ngramConst.UNIGRAM)) {
            similarWords = this.similars[inputWord];
        } else {
            // Get suggestions by incorporating Levenshtein with Trie.
            similarWords = this.vocabularies.findWordsWithinLimit(inputWord, this.distanceLimit);
        }

        if (includeMainWord) similarWords[inputWord] = 0;

        return similarWords;

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
     * @param  {string} sentence Text input in a sentence form
     * @return {Object}          List of suggestions (if error exists)
     */
    tryCorrect: function (sentence) {
        var self      = this,
            result    = new Object(),
            subParts  = helper.cleanInitial(sentence).split(',');

        _.forEach(subParts, function (subPart) {
            subPart = helper.cleanExtra(subPart);
            subPart = ngramUtil.tripleNSplit(subPart);

            // If parts is empty, it means the word is lower than three.
            if (subPart[ngramConst.TRIGRAM].length == 0) {
                if (subPart[ngramConst.BIGRAM].length == 0) {
                    subPart = subPart[ngramConst.UNIGRAM];
                } else {
                    subPart = subPart[ngramConst.BIGRAM];
                }
            } else {
                subPart = subPart[ngramConst.TRIGRAM];
            }

            result = helper.createNgramCombination(
                [result, self.doCorrect(subPart)],
                'plus',
                'join'
            );
        });

        return result;
    },

    /**
     * Main correction's logic.
     *
     * @param  {Array}  parts Ngram split word
     * @return {Object}       Correction results in a form of hash/dictionary
     */
    doCorrect: function (parts) {
        var self          = this,
            skipCount     = 0,
            parseAsNumber = true,
            suggestions   = new Object(),
            previousErrorIndexes, previousAlternatives;

        _.forEach(parts, function (part, partIndex) {
            var words        = ngramUtil.uniSplit(part),
                gramClass    = ngramUtil.getGramClass(words.length),
                alternatives = new Object();

            // Skip checking current trigram and just combine result from previous correction
            // if previous ones contains non word error.
            if ((--skipCount) >= 0) {
                alternatives = self.createTrigramFrom(words,
                                                      gramClass,
                                                      previousErrorIndexes,
                                                      previousAlternatives,
                                                      skipCount);
            } else {
                var errorIndexes     = self.detectNonWord(words),
                    errorIndexLength = Object.keys(errorIndexes).length,
                    isValidGram      = self.detectRealWord(part, gramClass);

                if (errorIndexLength == 0 && isValidGram) {
                    // Contains no error.
                    alternatives[part] = self.ngramProbability(words);
                } else if (errorIndexLength != 0) {
                    // Contains non-word error.
                    alternatives = self.createNonWordGram(words, gramClass, errorIndexes);

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
                    alternatives = self.createRealWordGram(words, gramClass);

                    // In case of no alternative trigram available, we're going to create them by
                    // combining bigrams, or even unigrams.
                    if (Object.keys(alternatives).length == 0 && gramClass != ngramConst.UNIGRAM) {
                        alternatives = self.alternateNextGram(words, gramClass);
                    }
                }
            }

            suggestions = helper.createNgramCombination([suggestions, alternatives]);
        });

        return suggestions;
    },

    /**
     * Detect non word error if exists.
     *
     * @param  {Array}  words List of words (ordered) from a sentence
     * @return {Object}       Index of the word having an error (empty if no error found)
     */
    detectNonWord: function (words) {
        var self         = this,
            errorIndexes = new Object();

        _.forEach(words, function (word, index) {
            if (!self.isValid(word, ngramConst.UNIGRAM)) {
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
     * @param  {Array}  words     List of words (ordered)
     * @param  {string} gramClass Current dealt gram's class
     * @return {Object}           New combination of trigram
     */
    alternateNextGram: function (words, gramClass) {
        var self         = this,
            alternatives = new Object(),
            collections  = new Array();

        if (gramClass == ngramConst.TRIGRAM) {
            var subWords = [
                words.slice(0, 2),
                words.slice(1)
            ];

            _.forEach(subWords, function (subWord) {
                var tempResult = self.createRealWordGram(subWord, ngramConst.BIGRAM);

                if (Object.keys(tempResult).length > 0) {
                    collections.push(tempResult);
                } else {
                    var subCollections = new Array(),
                        subSubWords    = [
                            subWord.slice(0, 1),
                            subWord.slice(1)
                        ];

                    _.forEach(subSubWords, function (subSubWord) {
                        subCollections.push(self.createRealWordGram(subSubWord, ngramConst.UNIGRAM));
                    });

                    collections.push(helper.createNgramCombination(subCollections));
                }
            });
        } else if (gramClass == ngramConst.BIGRAM) {
            _.forEach(words, function (word) {
                collections.push(self.createRealWordGram([word], ngramConst.UNIGRAM));
            });
        }

        alternatives = helper.createNgramCombination(collections);
        var alternativeSize = Object.keys(alternatives).length;

        // NOTE: May need to consider another way of computing trigram probabilities.
        //      'compute trigram probabilities, given only known bigram'
        //      @see http://stackoverflow.com/a/20587491/3190026
        if (alternativeSize == 0 && gramClass == ngramConst.TRIGRAM) {
            alternatives = this.alternateNextGram(words, ngramConst.BIGRAM);
        }

        return alternatives;
    },

    /**
     * Create valid n-gram alternatives from a list of words' similarity,
     * only allows 1 different word from the original n-gram.
     *
     * @param  {Array}  words     List of words (ordered) from a sentence
     * @param  {string} gramClass String representation of the n-gram
     * @return {Object}           Valid n-grams with it's probability
     */
    createRealWordGram: function (words, gramClass) {
        var self        = this,
            wordAlts    = new Array(),
            collections = new Array();

        _.forEach(words, function (word) {
            wordAlts.push({
                [`${word}`]: self.data.unigrams[word]
            });
        });

        for (var i = 0; i < words.length; ++i) {
            var subAlternatives = new Array();

            for (var j = 0; j < words.length; ++j) {
                if (i == j) {
                    // Include the original word into the 'words similarity' list, as it
                    // might be a solution too.
                    subAlternatives.push(self.getSuggestions(words[j], true));
                } else {
                    subAlternatives.push(wordAlts[j]);
                }
            }
            collections.push(helper.createNgramCombination(subAlternatives));
        }

        return this.filterCollectionsResult(collections, gramClass);
    },

    /**
     * Create new combination of trigram, given that previous trigram contains a non
     * word error that is also in the current trigram.
     *
     * @param  {Array}  words        List of words (ordered)
     * @param  {string} gramClass    String representation of the n-gram
     * @param  {Array}  errorIndexes Indexes of previous word list that indicates an error
     * @param  {Array}  prevAltWords Unique words of resulted trigram of previous correction
     * @param  {number} skipCount    Current skip count
     * @return {Object}              Alternatives gain by combining previous alternatives
     */
    createTrigramFrom: function (words, gramClass, errorIndexes, prevAltWords, currentSkipCount) {
        const MAX_SKIP_COUNT = 2;

        var self            = this,
            subAlternatives = new Array(),
            prevAltIndex    = MAX_SKIP_COUNT - (currentSkipCount + 1);

        _.forEach(words, function (word, wordIndex) {
            var subWordAlts = new Object();
            subWordAlts[word] = 0;

            if (prevAltIndex++ < MAX_SKIP_COUNT) {
                for (var altWord in prevAltWords[prevAltIndex])
                    subWordAlts[altWord] = 0;
            }

            subAlternatives.push(subWordAlts);
        });

        return this.filterCollectionsResult(
            [helper.createNgramCombination(subAlternatives)],
            gramClass
        );
    },

    /**
     * Create valid n-gram alternatives from a list of words' similarity,
     * only allows 1 different word from the original n-gram excluding the
     * word which is categorized as non-word error.
     *
     * @param  {Array}  words        List of words (ordered) from a sentence
     * @param  {string} gramClass    String representation of the n-gram
     * @param  {Object} errorIndexes Container for indexes of the error word
     * @return {Object}              Valid trigrams with it's probability
     */
    createNonWordGram: function (words, gramClass, errorIndexes) {
        var self            = this,
            wordAlts        = new Array(),
            nonErrorIndexes = new Array();

        _.forEach(words, function (word, index) {
            if (_.has(errorIndexes, index)) {
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

            _.forEach(words, function (word, index) {
                if (_.has(errorIndexes, index)) {
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

        return this.filterCollectionsResult(collections, gramClass);
    },

    /**
     * Filter combinations result only for the valid ones.
     *
     * @param  {Array}  collections Array containing list of combinations
     * @param  {string} gramClass   Class of the gram being processed
     * @return {Object}             Valid gram combination
     */
    filterCollectionsResult: function (collections, gramClass) {
        var self         = this,
            alternatives = new Object();

        _.forEach(collections, function (collection) {
            for (var combination in collection) {
                // Only accept valid word combination (exists in n-gram knowledge).
                if (self.isValid(combination, gramClass)) {
                    // Check if alternatives already exists.
                    if (!_.has(alternatives, combination)) {
                        alternatives[combination] =
                            self.ngramProbability(ngramUtil.uniSplit(combination));
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
     * @return {number}       Probability of the n-gram (range 0-1)
     */
    ngramProbability: function (words) {
        // TODO: Add smoothing to unknown words.
        var gram, probability, precedenceGram;

        switch (ngramUtil.getGramClass(words.length)) {
            case ngramConst.UNIGRAM:
                gram        = `${words[0]}`;
                probability = this.data[ngramConst.UNIGRAM][gram] / this.count[ngramConst.UNIGRAM];
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

        return Math.log(probability);
    }
};

module.exports = Corrector;
