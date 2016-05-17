'use strict';

var _      = require('lodash'),
    assert = require('assert'),
    jsFile = require('jsonfile'),
    Queue  = require(__dirname + '/../../lib/Queue.js');

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
 *
 * @constructor
 * @property {Object} data Trie structured (using Object) word vocabularies
 */
var Trie = function () {
    this.data = new Object();
}

Trie.prototype = {
    /**
     * Get trie's data container object.
     *
     * @return {Object} Data container
     */
    getData: function () {
        return this.data;
    },

    /**
     * Insert word into existing data.
     *
     * @param {string} word Word to be inserted
     */
    insert: function (word) {
        var currTrie = this.data;

        for(var i = 0; i < word.length; ++i) {
            var node = word.charAt(i);

            if (!(node in currTrie)) {
                currTrie[node] = new Object();
            }

            currTrie = currTrie[node];
        }

        currTrie.end = 1;
    },

    /**
     * Check whether current word exist in the data.
     *
     * @param  {string}  word Word to be checked
     * @return {boolean}      Word validity
     */
    has: function (word) {
        var trail = this.data;

        for (var i = 0; i < word.length; i++) {
            var node = word.charAt(i);
            if (!(node in trail)) {
                return false;
            } else {
                trail = trail[node];
            }
        }

        return trail.end;
    },

    /**
     * Output trie's data to a file.
     *
     * @param {string}   file     Output file path
     * @param {Function} callback Callback function
     */
    save: function (file, callback) {
        jsFile.writeFile(file, this.data, {spaces: 4}, function (err) {
            assert.equal(err, null);
            if (_.isFunction(callback)) callback();
        });
    },

    /**
     * Find all words in the dictionary whose distance is within the
     * distance limit of the given word.
     *
     * @param  {string} word  The given word
     * @param  {number} limit Distance limit
     * @return {Object}       List of words within the distance limit
     */
    findWordsWithinLimit: function (word, limit) {
        /**
         * Compute the sub distance of a given string against current
         * node (character).
         *
         * @param  {String} currentChar Currently processed char/node
         * @param  {Array}  prevDist    Previous/upper distance values
         * @param  {Array}  currDist    Current/middle distance values
         * @return {Array}              Computed current distance values
         */
        var computeSubDistance = function (currentChar, prevDist, currDist) {
            for (var i = 1; i <= word.length; ++i) {
                var substCost = currentChar == word.charAt(i-1) ? 0 : 1;
                currDist[i] = Math.min(prevDist[i] + 1,
                                       currDist[i-1] + 1,
                                       prevDist[i-1] + substCost);
            }
            return currDist;
        };

        var trailer     = this.data,
            startDist   = new Array(),
            suggestions = new Object(),
            queue       = new Queue();

        // Initialize default distance values.
        for (var i = 0; i <= word.length; ++i) startDist[i] = i;

        // Start searching for candidate words using breadth-first search
        // to search the trie data structure.
        for (var node in trailer) {
            var accumulatedWord = node;

            // Push initial value to queue.
            queue.enqueue([
                node,
                startDist,
                accumulatedWord,
                trailer[node]
            ]);

            while (!queue.isEmpty()) {
                // Retrieve values from queues.
                var current             = queue.dequeue(),
                    currNode            = current[0],
                    currDistance        = current[1],
                    currAccumulatedWord = current[2],
                    currTrailer         = current[3],
                    newDistance         = computeSubDistance(currNode, currDistance, [currDistance[0] + 1]);

                // Check if the new node is a valid word, and we need to add the
                // accumulated word + new node (char) to the suggestions IF the
                // distance limit is not exceeded.
                if (currTrailer.end) {
                    // Check if current accumulated word (including new node (char))
                    // is over the limit, we'll add them to result list if NOT over
                    // the limit.
                    if (newDistance[word.length] <= limit && currAccumulatedWord != word) {
                        // Add current word with it's distance value to result list.
                        suggestions[currAccumulatedWord] = newDistance[word.length];
                    }
                }

                // If current distance's smallest value is over the limit, we'll
                // not enqueue the child node since it's certain that the child
                // node will NOT have distance value lower than the current node.
                if (Math.min.apply(null, newDistance) <= limit) {
                    // Search each child node, add them into queue where possible.
                    for (var newNode in currTrailer) {
                        // Enqueue all child node except for the 'end' property identifier.
                        if (newNode != 'end') {
                            queue.enqueue([
                                newNode,
                                newDistance,
                                currAccumulatedWord + newNode,
                                currTrailer[newNode]
                            ]);
                        }
                    }
                }
            }
        }

        return suggestions;
    }
};

module.exports = Trie;
