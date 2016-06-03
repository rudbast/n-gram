'use strict';

var _ = require('lodash');

var levenshtein = require(__dirname + '/../util/levenshtein.js'),
    helper      = require(__dirname + '/../util/helper.js'),
    Default     = require(__dirname + '/../util/Default.js'),
    ngramUtil   = require(__dirname + '/../util/ngram.js');

/**
 * @class     Corrector
 * @classdesc Spelling correction main class.
 *
 * @constructor
 * @param {Informations} informations                 Words' informations (data, count, size, similars, vocabularies)
 * @param {Object}       [options]                    Options to initialize the component with
 * @param {number}       [options.distLimit=1]        Word's different (distance) limit
 * @param {string}       [options.distMode=damlev]    Word's different (distance) computation method
 * @param {string}       [options.ngramMode=trigrams] Word's different (distance) computation method
 *
 * @property {Object} data          N-grams words index container
 * @property {Object} size          Total unique gram/word pair of each N-gram
 * @property {Object} count         Total frequency count of all gram/word pair of each N-gram
 * @property {Object} similars      Words with it's similars pairs
 * @property {Trie}   vocabularies  Trie's structured vocabularies
 * @property {number} distanceLimit Words distance limit
 * @property {string} distanceMode  Words distance computation version
 * @property {string} ngramMode     Version of n-gram to use as the base logic
 */
var Corrector = function (informations, options) {
    options = _.isUndefined(options) ? new Object() : options;

    this.data          = informations.data;
    this.size          = informations.size;
    this.count         = informations.count;
    this.similars      = informations.similars;
    this.vocabularies  = informations.vocabularies;
    this.distanceLimit = _.isUndefined(options.distLimit) ? Default.DISTANCE_LIMIT : options.distLimit;
    this.distanceMode  = _.isUndefined(options.distMode) ? Default.DISTANCE_MODE : options.distMode;
    this.ngramMode     = _.isUndefined(options.ngramMode) ? Default.NGRAM_MODE : options.ngramMode;
};

Corrector.prototype = {
    /**
     * Check the validity of given gram.
     *
     * @param  {string}  gram             Word pair in a form of certain n-gram
     * @param  {string}  [gramClass]      String representation of the n-gram
     * @param  {boolean} [checkLowerGram] Indicates whether to check lower gram (back-off) when validity fails
     * @return {boolean}                  Gram validity
     */
    isValid: function (gram, gramClass, checkLowerGram) {
        if (_.isUndefined(gramClass)) {
            gramClass = ngramUtil.getGramClass(ngramUtil.uniSplit(gram).length);
        }
        checkLowerGram = _.isUndefined(checkLowerGram) ? false : checkLowerGram;

        if (gramClass == ngramUtil.UNIGRAM) {
            return this.vocabularies.has(gram);
        }

        let isValidGram = _.has(this.data[gramClass], gram);

        if (isValidGram || !checkLowerGram || gramClass == ngramUtil.BIGRAM) {
            return isValidGram;
        } else {
            let newGrams = ngramUtil.biSplit(gram);

            return _.has(this.data[ngramUtil.BIGRAM], _.first(newGrams))
                && _.has(this.data[ngramUtil.BIGRAM], _.last(newGrams));
        }
    },

    /**
     * Get list of similar words suggestion given a word.
     *
     * @param  {string}  inputWord         Input word
     * @param  {boolean} [includeMainWord] Indicates whether the input word should be included in result
     * @return {Object}                    Suggestion list of similar words
     */
    getSuggestions: function (inputWord, includeMainWord) {
        includeMainWord = _.isUndefined(includeMainWord) ? false : includeMainWord;
        var similarWords;

        if (this.isValid(inputWord, ngramUtil.UNIGRAM)) {
            similarWords = this.similars[inputWord];
        } else if (this.distanceMode == 'lev') {
            // Get suggestions by incorporating Levenshtein with Trie.
            similarWords = this.vocabularies.findWordsWithinLimit(inputWord, this.distanceLimit);
        } else {
            // Get suggestions by incorporating Optimal Damerau-Levenshtein with Trie.
            similarWords = this.vocabularies.findWordsWithinLimitDamLev(inputWord, this.distanceLimit);
        }

        if (includeMainWord) similarWords[inputWord] = 0;
        return similarWords;
    },

    /**
     * Try correcting the given sentence if there exists any error.
     *
     * @param  {string} sentence Text input in a sentence form
     * @return {Object}          List of suggestions (if error exists)
     */
    tryCorrect: function (sentence) {
        var self        = this,
            suggestions = new Object(),
            subParts    = sentence.split(',');

        subParts.forEach(function (subPart) {
            subPart = helper.cleanExtra(subPart);
            subPart = ngramUtil.tripleNSplit(subPart);

            // Skip this gram if it's actually empty.
            if (subPart[ngramUtil.UNIGRAM].length == 0) return;
            else {
                let desiredIsTrigram = self.ngramMode == ngramUtil.TRIGRAM,
                    trigramIsEmpty   = subPart[ngramUtil.TRIGRAM].length == 0,
                    bigramIsEmpty    = subPart[ngramUtil.BIGRAM].length == 0;

                if (desiredIsTrigram && !trigramIsEmpty) {
                    subPart = _.concat(
                        _.first(subPart[ngramUtil.UNIGRAM]),
                        _.first(subPart[ngramUtil.BIGRAM]),
                        subPart[ngramUtil.TRIGRAM]
                    );
                } else if ((desiredIsTrigram || !desiredIsTrigram) && !bigramIsEmpty) {
                    subPart = _.concat(
                        _.first(subPart[ngramUtil.UNIGRAM]),
                        subPart[ngramUtil.BIGRAM]
                    );
                } else {
                    subPart = subPart[ngramUtil.UNIGRAM];
                }
            }

            suggestions = helper.createNgramCombination(
                [suggestions, self.doCorrect(subPart)],
                'plus',
                'join'
            );
        });

        return _.mapValues(suggestions, function (probability) {
            return Math.exp(probability);
        });
    },

    /**
     * Main correction's logic.
     *
     * @param  {Array}  parts Ngram split word
     * @return {Object}       Correction results in a form of hash/dictionary
     */
    doCorrect: function (parts) {
        var self        = this,
            skipCount   = 0,
            corrections = new Object(),
            previousErrorIndexes, previousGram;

        parts.forEach(function (part, partIndex) {
            var words        = ngramUtil.uniSplit(part),
                gramClass    = ngramUtil.getGramClass(words.length),
                alternatives = new Object();

            // Skip checking current trigram and just combine result from previous correction
            // if previous ones contains non word error.
            if ((--skipCount) >= 0) {
                alternatives = self.createGramFrom(words,
                                                   gramClass,
                                                   previousErrorIndexes,
                                                   previousGram,
                                                   skipCount);
            } else {
                let errorIndexes     = self.detectNonWord(words),
                    errorIndexLength = _.keys(errorIndexes).length,
                    isValidGram      = self.detectRealWord(part, gramClass),
                    correctionResult;

                if (errorIndexLength != 0) {
                    // Contains non-word error.
                    correctionResult = self.createNonWordGram(words, gramClass, errorIndexes);
                    alternatives     = correctionResult.alternatives;

                    // Skipping only applies if there's more part to be checked.
                    if (partIndex < parts.length - 1) {
                        previousErrorIndexes = errorIndexes;
                        // Find the last occurred error's index, and we'll skip checking the next
                        // 'skipCount' part of trigram.
                        _.forEach(errorIndexes, function (value, index) {
                            skipCount = Math.max(skipCount, index);
                        });
                        previousGram = correctionResult.distinctData;
                    }
                } else if (words.length > 1 || partIndex < parts.length - 1) {
                    // We'll generate alternatives for when it contains real word error,
                    // AND even if there's no error found (valid bigram)
                    // AND ONLY IF the words length is more than 1, else it's not eligible
                    // for real word correction.
                    alternatives = self.createRealWordGram(words, gramClass);
                }
            }

            // We'll push the original part (word) as one of the alternatives, whether
            // there's an error or not.
            alternatives[part] = self.ngramProbability(words);

            corrections = helper.createNgramCombination([corrections, alternatives]);
        });

        return corrections;
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

        words.forEach(function (word, index) {
            if (!self.isValid(word, ngramUtil.UNIGRAM)) {
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
     * Create valid n-gram alternatives from a list of words' similarity,
     * only allows 1 different word from the original n-gram.
     *
     * @param  {Array}  words     List of words (ordered) from a sentence
     * @param  {string} gramClass String representation of the n-gram
     * @return {Object}           Valid n-grams with it's probability
     */
    createRealWordGram: function (words, gramClass) {
        var self        = this,
            collections = new Array();

        words.forEach(function (word, mainIndex) {
            var subAlternatives = new Array();

            words.forEach(function (auxWord, auxIndex) {
                if (mainIndex == auxIndex && auxWord != ngramUtil.NUMBER) {
                    subAlternatives.push(self.getSuggestions(auxWord, true));
                } else {
                    subAlternatives.push({
                        [`${auxWord}`]: self.data[ngramUtil.UNIGRAM][auxWord]
                    });
                }
            });

            collections.push(helper.createNgramCombination(subAlternatives));
        });

        return self.filterCollectionsResult(
            collections,
            gramClass,
            { lax: (gramClass == ngramUtil.TRIGRAM) }
        );
    },

    /**
     * Create new combination of trigram, given that previous trigram contains a non
     * word error that is also in the current trigram.
     *
     * @param  {Array}  words        List of words (ordered)
     * @param  {string} gramClass    String representation of the n-gram
     * @param  {Object} errorIndexes Indexes of previous word list that indicates an error
     * @param  {Array}  prevAltWords Unique words of resulted trigram of previous correction
     * @param  {number} skipCount    Current skip count
     * @return {Object}              Alternatives gain by combining previous alternatives
     */
    createGramFrom: function (words, gramClass, errorIndexes, prevAltWords, currentSkipCount) {
        const MAX_SKIP_COUNT = ngramUtil.getGramClass(gramClass) - 1;

        var self            = this,
            subAlternatives = new Array(),
            prevAltIndex    = MAX_SKIP_COUNT - currentSkipCount;

        words.forEach(function (word, wordIndex) {
            var subWordAlts = new Object();

            if (_.has(errorIndexes, wordIndex + prevAltIndex)) {
                subWordAlts = prevAltWords[wordIndex + prevAltIndex - 1];
            } else if (word != ngramUtil.NUMBER) {
                if (gramClass == ngramUtil.TRIGRAM) {
                    subWordAlts = self.getSuggestions(word);
                }
            }

            subWordAlts[word] = 0;
            subAlternatives.push(subWordAlts);
        });

        return self.filterCollectionsResult(
            [helper.createNgramCombination(subAlternatives)],
            gramClass,
            {
                lax: (gramClass == ngramUtil.TRIGRAM),
                valid: (gramClass != ngramUtil.BIGRAM)
            }
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
            subAlternatives = new Array();

        words.forEach(function (word, index) {
            if (word == ngramUtil.NUMBER
                || (!_.has(errorIndexes, index) && gramClass == ngramUtil.BIGRAM)) {
                subAlternatives.push({ [`${word}`]: 0 });
            } else {
                subAlternatives.push(self.getSuggestions(word, true));
            }
        });

        return self.filterCollectionsResult(
            [helper.createNgramCombination(subAlternatives)],
            gramClass,
            {
                distinct: true,
                lax: (gramClass == ngramUtil.TRIGRAM),
                valid: (gramClass != ngramUtil.BIGRAM)
            }
        );
    },

    /**
     * Object containing the alternatives and the distinct word information.
     *
     * @typedef  {Object} FilterDistinct
     * @property {Object} alternatives Valid gram combination
     * @property {Array}  distinctData Distinct words taken from the gram combination
     */
    /**
     * Filter combinations result only for the valid ones.
     *
     * @param  {Array}   collections              Array containing list of combinations
     * @param  {string}  gramClass                Class of the gram being processed
     * @param  {Object}  [options]                Options to manipulate filtering
     * @param  {boolean} [options.distinct=false] Indicate needs to get valid gram's distinct word to avoid recomputation
     * @param  {boolean} [options.valid=true]     Indicate whether to check for gram's validity
     * @param  {boolean} [options.lax=false]      Indicate whether to check ngram's validity in lower order (if invalid)
     * @return {Object|FilterDistinct}            Valid gram combination and the distinct words (optional)
     */
    filterCollectionsResult: function (collections, gramClass, options) {
        options = _.isUndefined(options) ? new Object() : options;

        var self         = this,
            alternatives = new Object(),
            getDistinct  = _.isUndefined(options.distinct) ? false : options.distinct,
            onlyValid    = _.isUndefined(options.valid) ? true : options.valid,
            allowLax     = _.isUndefined(options.lax) ? false : options.lax,
            distinctData;

        if (getDistinct) {
            switch (gramClass) {
                case ngramUtil.BIGRAM: distinctData = [ new Object() ]; break;
                default: distinctData = [ new Object(), new Object() ];
            }
        }

        collections.forEach(function (collection) {
            for (let combination in collection) {
                let isValidGram;
                // Check if valid options is ON,
                // then only accept valid word combination (exists in n-gram knowledge).
                if (onlyValid) isValidGram = self.isValid(combination, gramClass, allowLax);
                else isValidGram = true;

                if (isValidGram) {
                    // Check if alternatives already exists.
                    if (!_.has(alternatives, combination)) {
                        alternatives[combination] = self.ngramProbability(ngramUtil.uniSplit(combination));

                        if (getDistinct) {
                            let words = _.tail(ngramUtil.uniSplit(combination));
                            words.forEach(function (word, index) {
                                distinctData[index][word] = true;
                            });
                        }
                    }
                }
            }
        });

        if (getDistinct) {
            return {
                alternatives: alternatives,
                distinctData: distinctData
            };
        } else return alternatives;
    },

    /**
     * Compute the probability of a n-gram.
     * @see https://en.wikipedia.org/wiki/Bigram
     *
     * @param  {Array}  words Collection of words (ordered)
     * @return {number}       Probability of the n-gram (range 0-1)
     */
    ngramProbability: function (words) {
        var self        = this,
            probability = 0,
            gram        = words.join(' '),
            gramClass   = ngramUtil.getGramClass(words.length),
            logResult   = true,
            validGram, precedenceGram;

        switch (gramClass) {
            case ngramUtil.UNIGRAM:
                let mainfreq =
                    !_.has(self.data[ngramUtil.UNIGRAM], gram) ? 0 : self.data[ngramUtil.UNIGRAM][gram];

                probability = (mainfreq + 1) / (self.count[ngramUtil.UNIGRAM] + self.size[ngramUtil.UNIGRAM]);
                break;

            case ngramUtil.BIGRAM:
                precedenceGram = `${words[0]}`;
                validGram      = _.has(self.data[ngramUtil.BIGRAM], gram);

                // Compute probability using Back-off model.
                if (!validGram) {
                    words.forEach(function (word) {
                        probability += self.ngramProbability([word]);
                    });
                    logResult = false;
                } else {
                    probability = self.data[ngramUtil.BIGRAM][gram] / self.data[ngramUtil.UNIGRAM][precedenceGram];
                }
                break;

            case ngramUtil.TRIGRAM:
                precedenceGram = `${words[0]} ${words[1]}`;
                validGram      = _.has(self.data[ngramUtil.TRIGRAM], gram);

                if (!validGram) {
                    let newGrams = [
                        _.slice(words, 0, 2),
                        _.slice(words, 1)
                    ];

                    // Compute probability using Back-off model.
                    newGrams.forEach(function (newGram) {
                        probability += self.ngramProbability(newGram);
                    });
                    logResult = false;
                } else {
                    probability = self.data[ngramUtil.TRIGRAM][gram] / self.data[ngramUtil.BIGRAM][precedenceGram];
                }
                break;
        }

        if (logResult)
            return Math.log(probability);
        else
            return probability;
    }
};

module.exports = Corrector;
