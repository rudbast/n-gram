'use strict';

var assert = require('assert');

var mongoClient   = require('mongodb').MongoClient,
    mongoObjectId = require('mongodb').ObjectId;

/**
 * Clean article content.
 *
 * @param  {string} content Content to be cleaned
 * @return {string}         Cleaned content
 */
function cleanInitial(content) {
    content = content.toLowerCase();
    content = content.replace(/([:;()!?<>\%\$\/\\"'\*\d{}\^=\|\~&\[\]]|\s\-\s)/g, ',');
    content = content.replace(/[@\+’]/g, '');
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
    content = content.replace(/\./g, ' ');
    content = content.replace(/\s+/g, ' ');
    return content;
}

/**
 * Split text into sentences.
 * (uses external tools by executing shell command)
 *
 * @param  {string} text Text to be split
 * @return {object}      Split sentences
 */
function splitToSentence(text) {
    require('shelljs/global');
    var scriptFullPath = __dirname + '/textment.php';
    var scriptProcess  = exec('php ' + scriptFullPath + ' "' + text + '"', {silent: true});
    var sentences      = Array.from(JSON.parse(scriptProcess.stdout));
    return sentences;
}

/**
 * Sort object by property name.
 *
 * @param  {object} o Object to be sorted
 * @return {object}   Sorted object
 */
function sortObject(o) {
    return Object.keys(o).sort().reduce((r, k) => (r[k] = o[k], r), {});
}

/**
 * Connect to database.
 *
 * @param  {function} callback Callback function
 * @return {void}
 */
function connectDatabase(hostname, port, database, callback) {
    var url = `mongodb://${hostname}:${port}/${database}`;
    mongoClient.connect(url, function (err, db) {
        assert.equal(null, err);

        if (callback) callback(db);
        else db.close();
    });
}

/**
 * Create a combination of words (as sentences) given a list of
 * words' with probability values in the corrections list.
 *
 * @param  {array}  corrections   Multiple words' parts container
 * @param  {string} rankOperation Type of operation to deal with ranks
 * @return {object}               Sentence made from words combination with it's probability
 */
function createCombination(corrections, rankOperation) {
    var combination = new Object();

    corrections.forEach(function (correction) {
        var newCombination    = new Object(),
            combinationLength = Object.keys(combination).length;

        for (var word in correction) {
            if (combinationLength == 0) {
                newCombination[word] = correction[word];
            } else {
                for (var sentence in combination) {
                    var newRank;
                    switch (rankOperation) {
                        case 'plus':
                            newRank = combination[sentence] + correction[word];
                            break;

                        case 'multiply':
                            newRank = combination[sentence] * correction[word];
                            break;

                        default:
                            newRank = combination[sentence] + correction[word];
                    }
                    newCombination[`${sentence} ${word}`] = newRank;
                }
            }
        }

        combination = newCombination;
    });

    return combination;
}

module.exports = {
    cleanExtra,
    cleanInitial,
    connectDatabase,
    createCombination,
    sortObject,
    splitToSentence
};
