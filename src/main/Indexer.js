'use strict';

var fs     = require('fs'),
    jsFile = require('jsonfile'),
    assert = require('assert');

var ngramUtil   = require(__dirname + '/../util/NGram.js'),
    helper      = require(__dirname + '/../util/Helper.js'),

/**
 * Index builder class.
 *
 * @param {object} db Database connection object
 *
 * @property {object} db   Database connection object
 * @property {object} data N-grams words index container
 * @constructor
 */
var Indexer = function (db) {
    this.db   = db;
    this.data = {
        unigrams: new Object(),
        bigrams: new Object(),
        trigrams: new Object()
    };
};

var Indexer.prototype = {
    /**
     * Retrieve the words index data.
     *
     * @return {object} Words index
     */
    getData: function () {
        return this.ngrams;
    },

    /**
     * Extract words index (words' couples, frequency) from article's content.
     *
     * @param  {object}   article  Word's index to be extracted from
     * @param  {function} callback Callback function
     * @return {void}
     */
    extractIndex: function (article, callback) {
        var ngrams = {
            unigrams: new Object(),
            bigrams: new Object(),
            trigrams: new Object()
        };

        var content   = helper.cleanInitial(`${article.title}, ${article.content}`),
            sentences = helper.splitToSentence(content);

        sentences.forEach(function (sentence) {
            sentence = helper.cleanExtra(sentence);
            var parts = sentence.split(',');

            parts.forEach(function (part) {
                // Remove spaces at the start / end of text.
                part = part.replace(/^\s+|\s+$/g, '');

                var containsAlphabets = (part.search(/[a-z]{2,}/g) != -1),
                    isNotEmpty        = (part != '');

                // Filtering content.
                if (isNotEmpty && containsAlphabets) {
                    var newGrams = ngramUtil.tripleNSplit(part);

                    for (var gram in newGrams) {
                        if (newGrams.hasOwnProperty(gram)) {
                            newGrams[gram].forEach(function (word) {
                                // NOTE: the 'if' below checks if the word contains a '-' character,
                                //      and bypass them, except for word repeat such as 'kata-kata',
                                //      but the solution below is considered a 'hack', as it might
                                //      fail in a 2/3-gram words couple, such as 'kata-kata u-'.
                                var containsWordRepeat = word.match(/[a-z]+-[a-z]+/),
                                    containsDash       = word.match(/-/);

                                if ((containsDash && containsWordRepeat) || !containsDash) {
                                    if (!ngrams[gram][word]) {
                                        ngrams[gram][word] = 1;
                                    } else {
                                        ++ngrams[gram][word];
                                    }
                                }
                            });
                        }
                    }
                }
            });
        });

        if (callback && typeof callback == "function") callback(ngrams);
    },

    /**
     * Construct words index from articles content (text) in database.
     *
     * @param  {function} callback Callback function
     * @return {void}
     */
    constructIndex: function (callback) {
        var self = this;

        this.db.collection('articles').find({}).toArray(function (err, articles) {
            assert.equal(err, null);

            var articlesSize = Object.keys(articles).length,
                extractCount = 0;

            for (var index in articles) {
                if (articles.hasOwnProperty(index)) {
                    var article = articles[index];

                    self.extractIndex(article, function (indexResultData) {
                        console.log('Extract index count: ' + (++extractCount));

                        // Update n-gram information from newly acquired data.
                        for (var gram in indexResultData) {
                            if (indexResultData.hasOwnProperty(gram)) {
                                for (var word in indexResultData[gram]) {
                                    if (indexResultData[gram].hasOwnProperty(word)) {
                                        if (!self.data[gram][word]) {
                                            self.data[gram][word] = 1;
                                        } else {
                                            ++self.data[gram][word];
                                        }
                                    }
                                }
                            }
                        }

                        // Finished processing all articles.
                        if (extractCount == articlesSize) {
                            var unigramSize = Object.keys(self.data.unigrams).length;
                            var bigramSize = Object.keys(self.data.bigrams).length;
                            var trigramSize = Object.keys(self.data.trigrams).length;

                            console.log(`unigram: ${unigramSize}`);
                            console.log(`bigram: ${bigramSize}`);
                            console.log(`trigram: ${trigramSize}`);

                            if (callback && typeof callback == "function") callback();
                        }
                    });
                }
            }
        });
    },

    /**
     * Load words index information from a file.
     *
     * @param  {string}   directory Directory path containing ngram files
     * @param  {function} callback  Callback function
     * @return {void}
     */
    loadIndexFromFile: function (directory, callback) {
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
                        if (callback && typeof callback == "function") callback();
                    }
                });
            });
        });
    },

    /**
     * Migrate articles data from file to database.
     *
     * @param  {string}   file       File path
     * @param  {string}   collection Collection's name (to be migrated to)
     * @param  {function} callback   Callback function
     * @return {void}
     */
    migrateArticlesFileToDatabase: function (file, collection, callback) {
        var self = this;

        jsFile.readFile(file, function (err, data) {
            assert.equal(err, null);

            self.db.collection(collection).insert(data.articles, function (err, result) {
                assert.equal(err, null);
                console.log('Documents migrated.');

                if (callback && typeof callback == "function") callback();
            });
        });
    },

     /**
      * Save words index to dabatase.
      *
      * @param  {function} callback Callback function
      * @return {void}
      */
    saveIndexToDatabase: function (callback) {
        var insertCount = Object.keys(this.data).length;

        for (var ngram in this.data) {
            if (this.data.hasOwnProperty(ngram)) {
                var grams = this.data[ngram];
                var databaseGrams = new Array();

                for (var word in grams) {
                    if (grams.hasOwnProperty(word)) {
                        databaseGrams.push({
                            word: word,
                            freq: grams[word]
                        });
                    }
                }

                this.db.collection(ngram).insert(databaseGrams, function (err, result) {
                    assert.equal(err, null);

                    if ((--insertCount) == 0) {
                        if (callback && typeof callback == "function") callback();
                    }
                });
            }
        }
    },

    /**
     * Save words index to file system.
     *
     * @param  {string}   directory Directory path (to be saved to)
     * @param  {function} callback  Callback function
     * @return {void}
     */
    saveIndexToFile: function (directory, callback) {
        var insertCount = Object.keys(this.data).length;

        for (var ngram in this.data) {
            if (this.data.hasOwnProperty(ngram)) {
                // Save to file system.
                jsFile.writeFile(`${directory}/${ngram}.json`, this.data[ngram], {spaces: 4}, function (err) {
                    assert.equal(err, null);

                    if ((--insertCount) == 0) {
                        if (callback && typeof callback == "function") callback();
                    }
                });
            }
        }
    },
};
