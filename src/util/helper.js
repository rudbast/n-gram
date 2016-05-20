'use strict';

var _        = require('lodash'),
    notifier = require('node-notifier'),
    assert   = require('assert'),
    mongodb  = require('mongodb'),
    jsFile   = require('jsonfile');

var ngramUtil = require(__dirname + '/ngram.js');

var mongoClient   = mongodb.MongoClient,
    mongoObjectId = mongodb.ObjectId;

const DB_CONFIG_FILE = __dirname + '/../../res/database.json';

/**
 * Clean article content.
 *
 * @param  {string} content Content to be cleaned
 * @return {string}         Cleaned content
 */
function cleanInitial(content) {
    content = content.toLowerCase();

    // content = content.replace(/([:;()!?<>\%\$\/\\"“”‘’'\*\d{}\^=\|\~&]|\s\-\s)/g, ',');
    // content = content.replace(/[@\+’]/g, '');

    content = content.replace(/[‘’]/g, '\'');
    content = content.replace(/[“”]/g, '"');
    content = content.replace(/'+/g, '\'');
    content = content.replace(/"+/g, '"');
    content = content.replace(/\[/g, '(');
    content = content.replace(/\]/g, ')');

    // NOTE: Code below is to be run twice, in case a double 'single'
    //      apostrophe occurred but had a space in between.
    content = content.replace(/(\s'|'\s|")/g, ' ');
    content = content.replace(/(\s'|'\s|")/g, ' ');

    // NOTE: Code below is only needed to avoid error when splitting
    //      sentence.
    content = content.replace(/\\/g, '');

    content = content.replace(/[;!?|]|\s-\s|\.\.\.|:\s/g, ',');
    content = content.replace(/,+/g, ', ');
    content = content.replace(/\s+/g, ' ');
    return content;
}

/**
 * Extra step on cleaning content.
 *
 * @param  {string} content Content to be cleaned
 * @return {string}         Cleaned content
 */
function cleanExtra(content) {
    // content = content.replace(/\./g, ' ');
    content = content.replace(/\s+/g, ' ');
    return content;
}

/**
 * Split text into sentences.
 * (uses external tools by executing shell command)
 *
 * @param  {string} text Text to be split
 * @return {Object}      Split sentences
 */
function splitToSentence(text) {
    require('shelljs/global');
    var scriptFullPath = __dirname + '/textment.php';
    var scriptProcess  = exec('php ' + scriptFullPath + ' "' + text + '"', {silent: true});
    var sentences      = Array.from(JSON.parse(scriptProcess.stdout));
    return sentences;
}

/**
 * Create a combination of words (as sentences) given a list of
 * words' with probability values in the corrections list.
 *
 * @param  {Array}  corrections   Multiple words' parts container
 * @param  {string} rankOperation Type of operation to deal with ranks
 * @return {Object}               Sentence made from words combination with it's probability
 */
function createNgramCombination(corrections, rankOperation) {
    var combination = new Object();

    corrections.forEach(function (correction) {
        var newCombination    = new Object(),
            combinationLength = Object.keys(combination).length;

        for (var gram in correction) {
            if (combinationLength == 0) {
                newCombination[gram] = correction[gram];
            } else {
                for (var sentence in combination) {
                    var gramSubsetPos = subsetNgramOf(sentence, gram),
                        newRank, extraWord;

                    if (gramSubsetPos != -1) {
                        extraWord = gram.substring(gramSubsetPos);

                        switch (rankOperation) {
                            case 'plus':
                                newRank = combination[sentence] + correction[gram];
                                break;

                            case 'multiply':
                                newRank = combination[sentence] * correction[gram];
                                break;

                            default:
                                newRank = combination[sentence] + correction[gram];
                        }
                        newCombination[`${sentence} ${extraWord}`] = newRank;
                    }
                }
            }
        }

        combination = newCombination;
    });

    return combination;
}

/**
 * Check if given gram is a subset of given sentence, returns the
 * position of the last word if subset confirmed, returns -1 otherwise.
 *
 * @param  {string} sentence Sentence to be checked on
 * @param  {string} gram     Gram to be checked with
 * @return {number}          Position of the last word
 */
function subsetNgramOf(sentence, gram) {
    var gramLength   = ngramUtil.uniSplit(gram).length,
        lastSpacePos = -1;

    while ((--gramLength) != 0) {
        lastSpacePos = gram.indexOf(' ', lastSpacePos + 1);
    }

    var subsetGram        = gram.substring(0, lastSpacePos),
        sentenceSubsetPos = sentence.indexOf(subsetGram, sentence.length - subsetGram.length),
        isSubsetGram      = (sentenceSubsetPos != -1);

    return (isSubsetGram ? lastSpacePos + 1 : -1);
}

/**
 * Notify user.
 *
 * @param {string} title   Notification's title
 * @param {string} message Notification's message
 */
function notify(title, message) {
    notifier.notify({
        title: title,
        message: message,
        sound: true,
        wait: false
    });
}

/**
 * Convert object into a sorted array.
 *
 * @param  {Object}  obj           Object to be converted
 * @param  {boolean} parseAsNumber Indicates whether to parse object's property as number
 * @return {Array}                 Converted object
 */
function convertSimpleObjToSortedArray(obj, parseAsNumber) {
    parseAsNumber = _.isUndefined(parseAsNumber) ? false : true;

    var arr = new Array(),
        newVal;

    for (var key in obj) {
        if (parseAsNumber) newVal = Number(key);
        else newVal = key;

        arr.push(newVal);
    }
    arr.sort(function (a, b) { return a - b });

    return arr;
}

/**
 * Clear screen (console) by printing bunch of newlines.
 */
function clearScreen() {
    var i = 0;
    while (i++ < 60) { console.log() };
}

/**
 * Callback for when connected to database.
 *
 * @callback databaseCallback
 * @param {Object} db Database connection's object
 */

/**
 * Connect to database.
 *
 * @param {databaseCallback} callback Callback function
 */
function connectDB(callback) {
    jsFile.readFile(DB_CONFIG_FILE, function (err, database) {
        assert.equal(err, null);

        const URL = `mongodb://${database.host}:${database.port}/${database.name}`;
        mongoClient.connect(URL, function (err, db) {
            assert.equal(null, err);
            if (_.isFunction(callback)) callback(db);
        });
    });
}

module.exports = {
    cleanExtra,
    cleanInitial,
    clearScreen,
    convertSimpleObjToSortedArray,
    createNgramCombination,
    notify,
    subsetNgramOf,
    splitToSentence,
    connectDB
};
