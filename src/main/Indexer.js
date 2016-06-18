'use strict';

var _              = require('lodash'),
    fs             = require('fs'),
    jsFile         = require('jsonfile'),
    assert         = require('assert'),
    LanguageDetect = require('languagedetect'),
    ProgressBar    = require('progress');

var ngramUtil   = require(__dirname + '/../util/ngram.js'),
    helper      = require(__dirname + '/../util/helper.js'),
    Default     = require(__dirname + '/../util/Default.js'),
    levenshtein = require(__dirname + '/../util/levenshtein.js'),
    Trie        = require(__dirname + '/../util/Trie.js');

var languageDetector = new LanguageDetect();

/**
 * @class     Indexer
 * @classdesc Index builder class.
 *
 * @constructor
 * @param {Object} [options]                 Options to initialize the component with
 * @param {number} [options.distLimit=1]     Word's different (distance) limit
 * @param {string} [options.distMode=damlev] Word's different (distance) computation method
 *
 * @property {Object} data          N-grams words index container
 * @property {Object} size          Total unique gram/word pair of each N-gram
 * @property {Object} count         Total frequency count of all gram/word pair of each N-gram
 * @property {Object} similars      Words similarity pair container
 * @property {Trie}   vocabularies  Trie's structured vocabularies
 * @property {number} distanceLimit Words similarity distance limit
 */
var Indexer = function (options) {
    options = _.isUndefined(options) ? new Object() : options;

    this.data = {
        [`${ngramUtil.UNIGRAM}`]: new Object(),
        [`${ngramUtil.BIGRAM}`]: new Object(),
        [`${ngramUtil.TRIGRAM}`]: new Object()
    };
    this.size = {
        [`${ngramUtil.UNIGRAM}`]: 0,
        [`${ngramUtil.BIGRAM}`]: 0,
        [`${ngramUtil.TRIGRAM}`]: 0
    };
    this.count = {
        [`${ngramUtil.UNIGRAM}`]: 0,
        [`${ngramUtil.BIGRAM}`]: 0,
        [`${ngramUtil.TRIGRAM}`]: 0
    };
    this.similars      = new Object();
    this.vocabularies  = new Trie();
    this.distanceLimit = _.isUndefined(options.distLimit) ? Default.DISTANCE_LIMIT : options.distLimit;
    this.distanceMode  = _.isUndefined(options.distMode) ? Default.DISTANCE_MODE : options.distMode;
};

Indexer.prototype = {
    /**
     * All knowledge/informations built by Indexer from corpus.
     *
     * @typedef  {Object} Informations
     * @property {Object} data         N-grams words index container
     * @property {Object} size         Total unique gram/word pair of each N-gram
     * @property {Object} count        Total frequency count of all gram/word pair of each N-gram
     * @property {Object} similars     Words similarity pair container
     * @property {Trie}   vocabularies Trie's structured vocabularies
     */
    /**
     * Get all the available informations.
     *
     * @return {Informations} All informations
     */
    getInformations: function () {
        return {
            data: this.data,
            size: this.size,
            count: this.count,
            similars: this.similars,
            vocabularies: this.vocabularies
        };
    },

    /**
     * Build vocabularies (trie) information from words index.
     */
    buildTrie: function () {
        var progressBar  = new ProgressBar('    Constructing trie: [:bar] :percent :elapseds', {
            complete: '=',
            incomplete: ' ',
            total: this.size[ngramUtil.UNIGRAM]
        });

        for (let word in this.data[ngramUtil.UNIGRAM]) {
            if (word.indexOf(ngramUtil.NUMBER) == -1) {
                this.vocabularies.insert(word);
            }
            progressBar.tick();
        }
    },

    /**
     * Callback for when finished extracting index from an article.
     *
     * @callback extractIndexCb
     * @param {Object} ngrams Word index container for each gram
     */
    /**
     * Extract words index (words' couples, frequency) from article's content.
     *
     * @param {Object}         article    Word's index to be extracted from
     * @param {extractIndexCb} [callback] Callback function
     */
    extractIndex: function (article, callback) {
        var self = this;

        var ngrams = {
            [`${ngramUtil.UNIGRAM}`]: new Object(),
            [`${ngramUtil.BIGRAM}`]: new Object(),
            [`${ngramUtil.TRIGRAM}`]: new Object()
        };

        var content   = helper.cleanInitial(`${article.title}, ${article.content}`),
            sentences = helper.splitToSentence(content);

        const INVALID_BRACKET = 'INVALID';

        /**
         * Extract content inside a bracket.
         *
         * @param  {string} sentence Text sentence
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
                // // NOTE: The use of language detector is still in debatable, use it on
                // //      sentence level ? or on word level ? or 'part' level ?
                // // Detect current sentence's part's language.
                // var language = languageDetector.detect(part, 1);
                // // If it's not indonesian, we'll exempt it from being indexed.
                // if (!_.isUndefined(language[0])) {
                //     if (language[0][0] != 'indonesian') return;
                // }

                // Remove spaces at the start / end of text.
                part = part.replace(/^\s+|\s+$/g, '');

                // Filtering content.
                if (part != '') {
                    var newGrams = ngramUtil.tripleNSplit(part);

                    for (let gram in newGrams) {
                        newGrams[gram].forEach(function (word) {
                            if (!ngrams[gram][word]) {
                                ngrams[gram][word] = 1;
                            } else {
                                ++ngrams[gram][word];
                            }
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
     * @param {string}   file       File name (complete path)
     * @param {Function} [callback] Callback function
     */
    constructIndex: function (file, callback) {
        var self = this;

        jsFile.readFile(file, function (err, articles) {
            assert.equal(err, null);

            var articlesSize = articles.length,
                progressBar  = new ProgressBar('    Constructing words index: [:bar] :percent :elapseds', {
                    complete: '=',
                    incomplete: ' ',
                    total: articlesSize
                });

            articles.forEach(function (article) {
                self.extractIndex(article, function (indexResultData) {
                    progressBar.tick();

                    // Update n-gram information from newly acquired data.
                    for (let gram in indexResultData) {
                        for (let word in indexResultData[gram]) {
                            if (!self.data[gram][word]) {
                                self.data[gram][word] = indexResultData[gram][word];
                            } else {
                                self.data[gram][word] += indexResultData[gram][word];
                            }
                        }
                    }

                    // Finished processing all articles.
                    if (progressBar.complete) {
                        self.setIndexCountAndSize();
                        if (_.isFunction(callback)) callback();
                    }
                });
            });
        });
    },

    /**
     * Load words index information from a file.
     *
     * @param {string}   directory  Directory path containing ngram files
     * @param {Function} [callback] Callback function
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
                        self.setIndexCountAndSize();
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
        console.log(':: N-Gram Information ::');
        for (let gram in this.data) {
            console.log(`${gram}: ${this.size[gram]}`);
        }
    },

    /**
     * Save words index to file system.
     *
     * @param {string}   directory  Directory path (to be saved to)
     * @param {Function} [callback] Callback function
     */
    saveIndex: function (directory, callback) {
        var insertCount = Object.keys(this.data).length;

        for (let ngram in this.data) {
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
     * @param {Function} [callback] Callback function
     */
    constructSimilarities: function (callback) {
        var similarityIndex = 0,
            progressBar     = new ProgressBar('    Constructing similar words: [:bar] :percent :elapseds', {
                complete: '=',
                incomplete: ' ',
                total: this.size[ngramUtil.UNIGRAM]
            });

        for (let word in this.data[ngramUtil.UNIGRAM]) {
            if (word.indexOf(ngramUtil.NUMBER) == -1) {
                if (this.distanceMode == 'lev') {
                    // Levenshtein.
                    this.similars[word] = this.vocabularies.findWordsWithinLimit(word, this.distanceLimit);
                } else {
                    // Optimal damerau-levensthein.
                    this.similars[word] = this.vocabularies.findWordsWithinLimitDamLev(word, this.distanceLimit);
                }
            }
            progressBar.tick();
        }

        if (_.isFunction(callback)) callback();
    },

    /**
     * Load words similarities information from file.
     *
     * @param {string}   file       Complete file path to be loaded from
     * @param {Function} [callback] Callback function
     */
    loadSimilarities: function (file, callback) {
        var self = this;

        jsFile.readFile(file, function (err, data) {
            assert.equal(err, null);
            self.similars = data;
            if (_.isFunction(callback)) callback();
        });
    },

    /**
     * Save words similarities information to file.
     *
     * @param {string}   file       Complete file path to be saved to
     * @param {Function} [callback] Callback function
     */
    saveSimilarities: function (file, callback) {
        jsFile.writeFile(file, this.similars, {spaces: 4}, function (err) {
            assert.equal(err, null);
            if (_.isFunction(callback)) callback();
        });
    },

    /**
     * Set the ngram's index data count (total frequency) and set the
     * ngram's index size (unique count).
     */
    setIndexCountAndSize: function () {
        for (let gram in this.data) {
            this.size[gram] = Object.keys(this.data[gram]).length;

            for (let word in this.data[gram]) {
                this.count[gram] += this.data[gram][word];
            }
        }
    },

    /**
     * Load vocabularies (trie) information from file.
     *
     * @param {string}   file       File name
     * @param {Function} [callback] Callback function
     */
    loadTrie: function (file, callback) {
        this.vocabularies.load(file, callback);
    },

    /**
     * Save vocabularies (trie) information into file.
     *
     * @param {string}   file       File name
     * @param {Function} [callback] Callback function
     */
    saveTrie: function (file, callback) {
        this.vocabularies.save(file, callback);
    },

    /**
     * Load all informations (indexes, trie, word similarities).
     *
     * @param {string}   indexDir       Word indexes's directory path
     * @param {string}   trieFile       Trie's file path
     * @param {string}   similarityFile Word similarities' file path
     * @param {Function} [callback]     Callback function
     */
    loadInformations: function (indexDir, trieFile, similarityFile, callback) {
        var self = this;

        self.loadIndex(indexDir, function () {
            self.loadTrie(trieFile, function () {
                self.loadSimilarities(similarityFile, function () {
                    if (_.isFunction(callback)) callback();
                });
            });
        });
    },

    /**
     * Save all informations (indexes, trie, word similarities).
     *
     * @param {string}   indexDir       Word indexes's directory path
     * @param {string}   trieFile       Trie's file path
     * @param {string}   similarityFile Word similarities' file path
     * @param {Function} [callback]     Callback function
     */
    saveInformations: function (indexDir, trieFile, similarityFile, callback) {
        var self = this;

        self.saveIndex(indexDir, function () {
            self.saveTrie(trieFile, function () {
                self.saveSimilarities(similarityFile, function () {
                    if (_.isFunction(callback)) callback();
                });
            });
        });
    }
};

module.exports = Indexer;
