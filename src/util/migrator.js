'use strict';

var _      = require('lodash'),
    assert = require('assert');

var helper = require(__dirname + '/helper.js');

/**
 * Migrate words index information to database.
 *
 * @param {Object}   data       Words index information
 * @param {Function} [callback] Callback function
 */
function migrateIndex(data, callback) {
    var totalTask = Object.keys(data).length;

    var checkFinished = function (completedTask, db) {
        if (completedTask == totalTask) {
            db.close();
            if (_.isFunction(callback)) callback();
        }
    }

    helper.connectDB(function (db) {
        var currentTask = 0;

        for (var gram in data) {
            var wordIndexes = new Array();

            for (var index in data[gram]) {
                wordIndexes.push({
                    index: index,
                    frequency: data[gram][index]
                });
            }

            db.collection(gram).insert(
                wordIndexes,
                { ordered: false },
                function (err, result) {
                    assert.equal(err, null);
                    checkFinished(++currentTask, db);
                }
            );
        }
    });
}

/**
 * Migrate words similarities information to database.
 *
 * @param {Object}   similars   Word similarities information
 * @param {Function} [callback] Callback function
 */
function migrateSimilarities(similars, callback) {
    helper.connectDB(function (db) {
        var wordSimilars = new Array();

        for (var sourceWord in similars) {
            var resultWordList = new Array();

            for (var resultWord in similars[sourceWord]) {
                resultWordList.push({
                    word: resultWord,
                    distance: similars[sourceWord][resultWord]
                });
            }

            wordSimilars.push({
                word: sourceWord,
                similars: resultWordList
            });
        }

        db.collection('similars').insert(
            wordSimilars,
            { ordered: false },
            function (err, result) {
                assert.equal(err, null);
                db.close()
                if (_.isFunction(callback)) callback();
            }
        );
    });
}

module.exports = {
    migrateIndex,
    migrateSimilarities,
};
