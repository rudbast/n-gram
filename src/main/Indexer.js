'use strict';

var _              = require('lodash'),
    fs             = require('fs'),
    jsFile         = require('jsonfile'),
    assert         = require('assert'),
    LanguageDetect = require('languagedetect'),
    ProgressBar    = require('progress');

var ngramUtil   = require(__dirname + '/../util/ngram.js'),
    helper      = require(__dirname + '/../util/helper.js'),
    levenshtein = require(__dirname + '/../util/levenshtein.js'),
    Trie        = require(__dirname + '/../util/Trie.js');

var languageDetector = new LanguageDetect(),
    ngramConst       = new ngramUtil.NgramConstant();

/**
 * Index builder class.
 *
 * @param {Number} distanceLimit Words similarity distance limit
 *
 * @property {Object} data          N-grams words index container
 * @property {Object} similars      Words similarity pair container
 * @property {Number} distanceLimit Words similarity distance limit
 * @property {Trie}   vocabularies  Trie's structured vocabularies
 * @constructor
 */
var Indexer = function (distanceLimit) {
    this.data = {
        [`${ngramConst.UNIGRAM}`]: new Object(),
        [`${ngramConst.BIGRAM}`]: new Object(),
        [`${ngramConst.TRIGRAM}`]: new Object()
    };
    this.similars      = new Object();
    this.distanceLimit = !_.isUndefined(distanceLimit) ? distanceLimit : 2;
    this.vocabularies;
};

Indexer.prototype = {
    /**
     * Retrieve the words index data.
     *
     * @return {Object} Words index
     */
    getData: function () {
        return this.data;
    },

    /**
     * Retrieve the words similarities data.
     *
     * @return {Object} Words similarities
     */
    getSimilars: function () {
        return this.similars;
    },

    /**
     * Retrieve the vocabularies represented by a Trie's data.
     *
     * @return {Object} Vocabularies
     */
    getVocabularies: function () {
        return this.vocabularies;
    },

    /**
     * Build vocabularies information from words index.
     */
    buildVocabularies: function () {
        this.vocabularies = new Trie();

        for (var word in this.data[ngramConst.UNIGRAM]) {
            this.vocabularies.insert(word);
        }
    },

    /**
     * Extract words index (words' couples, frequency) from article's content.
     *
     * @param {Object}   article  Word's index to be extracted from
     * @param {Function} callback Callback function
     */
    extractIndex: function (article, callback) {
        var self = this;

        var ngrams = {
            [`${ngramConst.UNIGRAM}`]: new Object(),
            [`${ngramConst.BIGRAM}`]: new Object(),
            [`${ngramConst.TRIGRAM}`]: new Object()
        };

        var content   = helper.cleanInitial(`${article.title}, ${article.content}`),
            sentences = helper.splitToSentence(content);

        const INVALID_BRACKET = 'INVALID';

        /**
         * Extract content inside a bracket.
         *
         * @param  {String} sentence Text sentence
         * @return {Object}          Extracted text and the resulting sentence
         */
        var extractBracketContents = function (sentence) {
            var openBracketPos  = sentence.indexOf('('),
                closeBracketPos = sentence.indexOf(')'),
                bracketContent  = '';

            // Extract content in a bracket, remove the bracket if either the open
            // or close symbol is missing.
            if (openBracketPos != -1 && closeBracketPos != -1) {
                if (openBracketPos < closeBracketPos) {
                    bracketContent = sentence.substring(openBracketPos + 1, closeBracketPos);
                    sentence       = sentence.substring(0, openBracketPos) + ' ' + sentence.substring(closeBracketPos + 1);
                } else if (openBracketPos > closeBracketPos) {
                    bracketContent = INVALID_BRACKET;
                    sentence       = sentence.replace(/[)(]/, '');
                }
            } else if (openBracketPos == -1) {
                sentence = sentence.replace(/\)/, '');
            } else if (closeBracketPos == -1) {
                sentence = sentence.replace(/\(/, '');
            }

            return {
                sentence: sentence,
                bracketContent: bracketContent
            };
        };

        /**
         * Remove noise of the word 'Baca:' in a text as sometimes it's
         * not in a complete form (library failure).
         *
         * @param  {String} sentence Text sentence
         * @return {String}          Text sentence after noise removal
         */
        var removeBracketNoise = function (sentence, noise) {
            var noiseOpenPos = sentence.indexOf(noise);

            if (noiseOpenPos != -1) {
                var noiseOtherOpenPos  = -1,
                    noiseOtherClosePos = -1,
                    noiseLastClosePos;

                var totalOpenPos  = 1,  // noise counts as 1.
                    totalClosePos = 0;

                // Find total open bracket.
                while ((noiseOtherOpenPos = sentence.indexOf('(', noiseOtherOpenPos + 1)) != -1) {
                    totalOpenPos++;
                }

                // Find total close bracket.
                while ((noiseOtherClosePos = sentence.indexOf('(', noiseOtherClosePos + 1)) != -1) {
                    if (noiseOtherClosePos != -1) {
                        totalClosePos++;
                        noiseLastClosePos = noiseOtherClosePos;
                    }
                }

                // When bracket total doesn't match, simply replace the 'noise',
                // else get the substring content of the noise.
                if (totalOpenPos != totalClosePos) {
                    sentence = sentence.replace(noise, '');
                } else if (noiseOpenPos == 0) {
                    sentence = sentence.substring(noiseOpenPos + noise.length + 1, noiseLastClosePos);
                } else {
                    var front  = sentence.substring(0, noiseOpenPos),
                        middle = sentence.substring(noiseOpenPos + noise.length, noiseLastClosePos),
                        end    = sentence.substring(noiseLastClosePos + 1);

                    sentence = `${front} ${middle} ${end}`;
                }
            }

            return sentence;
        };

        sentences.forEach(function (sentence) {
            // Remove dot at the end tabof sentence.
            sentence = sentence.replace(/\.$/, '');

            sentence = removeBracketNoise(sentence, '(baca,');
            sentence = removeBracketNoise(sentence, '(baca juga,');
            sentence = removeBracketNoise(sentence, '(');

            var bracketContent,
                bracketResult;

            var bracketParts = new Array(),
                parts        = new Array();

            do {
                bracketResult  = extractBracketContents(sentence);
                sentence       = helper.cleanExtra(bracketResult.sentence);
                bracketContent = helper.cleanExtra(bracketResult.bracketContent);

                if (bracketContent != '' && bracketContent != INVALID_BRACKET) {
                    bracketParts = bracketParts.concat(bracketContent.split(','));
                }
            } while (bracketContent != '');

            parts = parts.concat(sentence.split(','));
            // Merge content if bracket content is not empty.
            if (bracketParts.length > 0) {
                parts = parts.concat(bracketParts);
            }

            parts.forEach(function (part) {
                // NOTE: The use of language detector is still in debatable, use it on
                //      sentence level ? or on word level ? or 'part' level ?
                // Detect current sentence's part's language.
                var language = languageDetector.detect(part, 1);
                // If it's not indonesian, we'll exempt it from being indexed.
                if (!_.isUndefined(language[0])) {
                    if (language[0][0] != 'indonesian') return;
                }

                // Remove spaces at the start / end of text.
                part = part.replace(/^\s+|\s+$/g, '');

                // var containsAlphabets = (part.search(/[a-z]{2,}/g) != -1),
                var isNotEmpty = (part != '');

                // Filtering content.
                // if (isNotEmpty && containsAlphabets) {
                if (isNotEmpty) {
                    var newGrams = ngramUtil.tripleNSplit(part);

                    for (var gram in newGrams) {
                        newGrams[gram].forEach(function (word) {
                            // NOTE: the 'if' below checks if the word contains a '-' character,
                            //      and bypass them, except for word repeat such as 'kata-kata',
                            //      but the solution below is considered a 'hack', as it might
                            //      fail in a 2/3-gram words couple, such as 'kata-kata u-'.
                            // var containsWordRepeat = word.match(/[a-z]+-[a-z]+/),
                                // containsDash       = word.match(/-/);

                            // if ((containsDash && containsWordRepeat) || !containsDash) {
                                if (!ngrams[gram][word]) {
                                    ngrams[gram][word] = 1;
                                } else {
                                    ++ngrams[gram][word];
                                }
                            // }
                        });
                    }
                }
            });
        });

        if (_.isFunction(callback)) callback(ngrams);
    },

    /**
     * Construct words index from articles content (text) of the given file.
     *
     * @param {String}   file     File name (complete path)
     * @param {Function} callback Callback function
     */
    constructIndex: function (file, callback) {
        var self = this;

        jsFile.readFile(file, function (err, data) {
            assert.equal(err, null);

            var articlesSize = Object.keys(data.articles).length,
                progressBar  = new ProgressBar('    Constructing words index: [:bar] :percent :elapseds', {
                    complete: '=',
                    incomplete: ' ',
                    total: articlesSize
                });

            data.articles.forEach(function (article) {
                self.extractIndex(article, function (indexResultData) {
                    progressBar.tick();

                    // Update n-gram information from newly acquired data.
                    for (var gram in indexResultData) {
                        for (var word in indexResultData[gram]) {
                            if (!self.data[gram][word]) {
                                self.data[gram][word] = 1;
                            } else {
                                self.data[gram][word] += indexResultData[gram][word];
                            }
                        }
                    }

                    // Finished processing all articles.
                    if (progressBar.complete) {
                        if (_.isFunction(callback)) callback();
                    }
                });
            });
        });
    },

    /**
     * Load words index information from a file.
     *
     * @param {String}   directory Directory path containing ngram files
     * @param {Function} callback  Callback function
     */
    loadIndex: function (directory, callback) {
        var self = this;

        fs.readdir(directory, function (err, files) {
            assert.equal(err, null);

            var loadCount = 0;

            files.forEach(function (file, index) {
                jsFile.readFile(`${directory}/${file}`, function (err, data) {
                    assert.equal(err, null);

                    var gramFileName = file.split('.')[0];
                    self.data[gramFileName] = data;

                    if ((++loadCount) == files.length) {
                        if (_.isFunction(callback)) callback();
                    }
                });
            });
        });
    },

    /**
     * Print current data's informations.
     */
    printDataInformation: function () {
        for (var gram in this.data) {
            console.log(`${gram}: ${Object.keys(this.data[gram]).length}`);
        }
    },

    /**
     * Save words index to file system.
     *
     * @param {String}   directory Directory path (to be saved to)
     * @param {Function} callback  Callback function
     */
    saveIndex: function (directory, callback) {
        var insertCount = Object.keys(this.data).length;

        for (var ngram in this.data) {
            // Save to file system.
            jsFile.writeFile(`${directory}/${ngram}.json`, this.data[ngram], {spaces: 4}, function (err) {
                assert.equal(err, null);

                if ((--insertCount) == 0) {
                    if (_.isFunction(callback)) callback();
                }
            });
        }
    },

    /**
     * Construct words similarity information.
     *
     * @param {Function} callback Callback function
     */
    constructSimilarities: function (callback) {
        var similarityIndex = 0,
            progressBar     = new ProgressBar('    Constructing similar words: [:bar] :percent :elapseds', {
                complete: '=',
                incomplete: ' ',
                total: Object.keys(this.data[ngramConst.UNIGRAM]).length
            });

        for (var word in this.data[ngramConst.UNIGRAM]) {
            this.similars[word] = this.vocabularies.findWordsWithinLimit(word, this.distanceLimit);
            progressBar.tick();
        }

        if (_.isFunction(callback)) callback();
    },

    /**
     * Load words similarities information from file.
     *
     * @param {String}   file     Complete file path to be loaded from
     * @param {Function} callback Callback function
     */
    loadSimilarities: function (file, callback) {
        var self = this;

        jsFile.readFile(`${file}`, function (err, data) {
            assert.equal(err, null);
            self.similars = data;
            if (_.isFunction(callback)) callback();
        });
    },

    /**
     * Save words similarities information to file.
     *
     * @param {String}   file     Complete file path to be saved to
     * @param {Function} callback Callback function
     */
    saveSimilarities: function (file, callback) {
        jsFile.writeFile(`${file}`, this.similars, {spaces: 4}, function (err) {
            assert.equal(err, null);
            if (_.isFunction(callback)) callback();
        });
    }
};

module.exports = Indexer;
