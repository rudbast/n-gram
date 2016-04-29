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
function createUnigramCombination(corrections, rankOperation) {
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

/**
 * Create a combination of words (as sentences) given a list of
 * words' with probability values in the corrections list.
 *
 * @param  {array}  corrections   Multiple words' parts container
 * @param  {string} rankOperation Type of operation to deal with ranks
 * @return {object}               Sentence made from words combination with it's probability
 */
function createTrigramCombination(corrections, rankOperation) {
    var combination = new Object();

    corrections.forEach(function (correction) {
        var newCombination    = new Object(),
            combinationLength = Object.keys(combination).length;

        for (var trigram in correction) {
            if (combinationLength == 0) {
                newCombination[trigram] = correction[trigram];
            } else {
                for (var sentence in combination) {
                    var newRank, extraWord,
                        trigramSubsetPos = subsetTrigramOf(sentence, trigram);

                    // FIXME: Data in the correction might not always be in a
                    //      trigram form, need extra check to make sure it's
                    //      trigram.
                    if (trigramSubsetPos != -1) {
                        console.log(sentence);
                        extraWord = trigram.substring(trigramSubsetPos);

                        switch (rankOperation) {
                            case 'plus':
                                newRank = combination[sentence] + correction[trigram];
                                break;

                            case 'multiply':
                                newRank = combination[sentence] * correction[trigram];
                                break;

                            default:
                                newRank = combination[sentence] + correction[trigram];
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
 * Check if trigram is a subset of the given sentence, returns the
 * position of the third word if subset confirmed, returns -1 otherwise.
 *
 * @param  {string}  sentence Sentence to be checked on
 * @param  {string}  trigram  Trigram to be checked with
 * @return {integer}          Position of the third word (trigram)
 */
function subsetTrigramOf(sentence, trigram) {
    var firstSpacePos  = trigram.indexOf(' '),
        secondSpacePos = trigram.indexOf(' ', firstSpacePos + 1);

    var subsetTrigram     = trigram.substring(0, secondSpacePos),
        sentenceSubsetPos = sentence.indexOf(subsetTrigram, sentence.length - subsetTrigram.length),
        isSubsetTrigram   = (sentenceSubsetPos != -1);

    return (isSubsetTrigram ? secondSpacePos + 1 : -1);
}

module.exports = {
    cleanExtra,
    cleanInitial,
    connectDatabase,
    createUnigramCombination,
    createTrigramCombination,
    subsetTrigramOf,
    splitToSentence
};
