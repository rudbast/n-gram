'use strict';

var jsFile = require('jsonfile');

/*
Illustration for a trie structure using javascript object.
Word: 'saya'
Trie = {
    s: {
        a: {
            y: {
                a: {
                    end: 1
                }
            }
        }
    }
}
*/

/**
 * Trie data structure object class.
 */
var Trie = function () {}

/**
 * Trie data structure container.
 *
 * @type {object}
 */
Trie.prototype.data = new Object();

/**
 * Insert word into existing data.
 *
 * @param  {string} word Word to be inserted
 * @return {void}
 */
Trie.prototype.insert = function (word, callback) {
    var currTrie = Trie.prototype.data;

    for(var i = 0; i < word.length; ++i) {
        var node = word.charAt(i);

        if (!(node in currTrie)) {
            currTrie[node] = new Object();
        }

        currTrie = currTrie[node];
    }

    currTrie.end = 1;
}

/**
 * Check whether current word exist in the data.
 *
 * @param  {string}  word Word to be checked
 * @return {boolean}      Word validity
 */
Trie.prototype.has = function (word) {
    var trail = Trie.prototype.data;

    for (var i = 0; i < word.length; i++) {
        var node = word.charAt(i);
        if (!(node in trail)) {
            return false;
        } else {
            trail = trail[node];
        }
    }

    return trail.end;
}

/**
 * Get trie's data container object.
 *
 * @return {object} Data container
 */
Trie.prototype.getData = function () {
    return Trie.prototype.data;
}

/**
 * Output trie's data to a file.
 *
 * @param  {string} file Output file path
 * @return {void}
 */
Trie.prototype.print = function (file) {
    jsFile.writeFile(file, Trie.prototype.data, {spaces: 4}, function (err) {
        if (err) console.error(err);
        console.log('Output file succeeded.');
    });
}

module.exports = Trie;
