'use strict';

var fs     = require('fs'),
    jsFile = require('jsonfile'),
    assert = require('assert'),
    _      = require('lodash');

var ngramUtil   = require(__dirname + '/../util/ngram.js'),
    helper      = require(__dirname + '/../util/helper.js'),
    levenshtein = require(__dirname + '/../util/levenshtein.js'),
    Trie        = require(__dirname + '/../util/Trie.js');

/**
 * Index builder class.
 *
 * @param {integer} distanceLimit Words similarity distance limit
 *
 * @property {object}  data          N-grams words index container
 * @property {object}  similars      Words similarity pair container
 * @property {integer} distanceLimit Words similarity distance limit
 * @constructor
 */
var Indexer = function (distanceLimit) {
    this.data = {
        unigrams: new Object(),
        bigrams: new Object(),
        trigrams: new Object()
    };
    this.similars      = new Object();
    this.distanceLimit = !_.isUndefined(distanceLimit) ? distanceLimit : 2;
    this.vocabularies;
};

Indexer.prototype = {
    /**
     * Retrieve the words index data.
     *
     * @return {object} Words index
     */
    getData: function () {
        return this.data;
    },

    /**
     * Retrieve the words similarities data.
     *
     * @return {object} Words similarities
     */
    getSimilars: function () {
        return this.similars;
    },

    /**
     * Retrieve the vocabularies represented by a Trie's data.
     *
     * @return {object} Vocabularies
     */
    getVocabularies: function () {
        return this.vocabularies;
    },

    /**
     * Build vocabularies information from words index.
     *
     * @return {void}
     */
    buildVocabularies: function () {
        this.vocabularies = new Trie();

        for (var word in this.data.unigrams) {
            this.vocabularies.insert(word);
        }
    },

    /**
     * Extract words index (words' couples, frequency) from article's content.
     *
     * @param  {object}   article  Word's index to be extracted from
     * @param  {function} callback Callback function
     * @return {void}
     */
    extractIndex: function (article, callback) {
        var self = this;

        var ngrams = {
            unigrams: new Object(),
            bigrams: new Object(),
            trigrams: new Object()
        };

        var content   = helper.cleanInitial(`${article.title}, ${article.content}`),
            sentences = helper.splitToSentence(content);

        const INVALID_BRACKET = 'INVALID';

        /**
         * Extract content inside a bracket.
         *
         * @param  {string} sentence Text sentence
         * @return {object}          Extracted text and the resulting sentence
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
         * @param  {string} sentence Text sentence
         * @return {string}          Text sentence after noise removal
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
     * @param  {string}   file     File name (complete path)
     * @param  {function} callback Callback function
     * @return {void}
     */
    constructIndex: function (file, callback) {
        var self = this;

        jsFile.readFile(file, function (err, data) {
            assert.equal(err, null);

            var articlesSize = Object.keys(data.articles).length,
                extractCount = 0;

            data.articles.forEach(function (article) {
                self.extractIndex(article, function (indexResultData) {
                    console.log('Extract index count: ' + (++extractCount));

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
                    if (extractCount == articlesSize) {
                        if (_.isFunction(callback)) callback();
                    }
                });
            });
        });
    },

    /**
     * Load words index information from a file.
     *
     * @param  {string}   directory Directory path containing ngram files
     * @param  {function} callback  Callback function
     * @return {void}
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
                        if (_.isFunction(callback)) {
                            var dataLength = Object.keys(self.data.unigrams).length;
                            callback(dataLength);
                        }
                    }
                });
            });
        });
    },

    /**
     * Print current data's informations.
     *
     * @return {void}
     */
    printDataInformation: function () {
        for (var gram in this.data) {
            console.log(`${gram}: ${Object.keys(this.data[gram]).length}`);
        }
    },

    /**
     * Save words index to file system.
     *
     * @param  {string}   directory Directory path (to be saved to)
     * @param  {function} callback  Callback function
     * @return {void}
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
     * @param  {function} callback Callback function
     * @return {void}
     */
    constructSimilarities: function (callback) {
        var similarityIndex = 0;

        for (var word in this.data.unigrams) {
            this.similars[word] = this.vocabularies.findWordsWithinLimit(word, this.distanceLimit);
            console.log('Similarity index count: ' + (++similarityIndex));
        }

        if (_.isFunction(callback)) callback();
    },

    /**
     * Load words similarities information from file.
     *
     * @param  {string}   file     Complete file path to be loaded from
     * @param  {function} callback Callback function
     * @return {void}
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
     * @param  {string}   file     Complete file path to be saved to
     * @param  {function} callback Callback function
     * @return {void}
     */
    saveSimilarities: function (file, callback) {
        jsFile.writeFile(`${file}`, this.similars, {spaces: 4}, function (err) {
            assert.equal(err, null);
            if (_.isFunction(callback)) callback();
        });
    }
};

module.exports = Indexer;
