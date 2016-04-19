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
    content = content.replace(/([:;()!?<>\%\$\/\\"'\*\d{}^=|]|\s\-\s)/g, ',');
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
    content = content.replace(/\-/g, ' ');
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

module.exports = {
    cleanInitial,
    cleanExtra,
    splitToSentence,
    sortObject,
    connectDatabase
};
