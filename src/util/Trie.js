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
 * @class     Trie
 * @classdesc Trie data structure object class.
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
     * Load trie's data from a file.
     *
     * @param {string}   file       File name
     * @param {Function} [callback] Callback function
     */
    load: function (file, callback) {
        var self = this;

        jsFile.readFile(file, function (err, data) {
            assert.equal(err, null);
            self.data = data;
            if (_.isFunction(callback)) callback();
        });
    },

    /**
     * Output trie's data to a file.
     *
     * @param {string}   file       Output file path
     * @param {Function} [callback] Callback function
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
     * @see http://stevehanov.ca/blog/index.php?id=114
     *
     * @param  {string} word  The given word
     * @param  {number} limit Distance limit
     * @return {Object}       List of words within the distance limit
     */
    findWordsWithinLimit: function (word, limit) {
        /**
         * Compute the sub distance of a given string against current
         * node (character) using levenshtein distance.
         *
         * @param  {string} currentChar Currently processed char/node
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
    },

    /**
     * Find all words in the dictionary whose distance is within the
     * distance limit of the given word using optimal damerau-levenshtein
     * distance.
     *
     * @param  {string} word  The given word
     * @param  {number} limit Distance limit
     * @return {Object}       List of words within the distance limit
     */
    findWordsWithinLimitDamLev: function (word, limit) {
        /**
         * Compute the sub distance of a given string against current
         * node (character) using optimal damerau-levenshtein distance.
         *
         * @param  {string} prevChar  Previous character
         * @param  {Array}  prevDist  Previous/upper distance values
         * @param  {Array}  currDist  Current/middle distance values
         * @param  {string} upperChar Previous 2 character
         * @param  {Array}  upperDist Previous 2 distance values
         * @param  {number} j         Current processed word's length
         * @return {Array}            Computed current distance values
         */
        var computeSubDistance = function (prevChar, prevDist, currDist, upperChar, upperDist, j) {
            for (var i = 1; i <= word.length; ++i) {
                var substCost = prevChar == word.charAt(i-1) ? 0 : 1;
                currDist[i] = Math.min(prevDist[i] + 1,
                                       currDist[i-1] + 1,
                                       prevDist[i-1] + substCost);

                // Transposition between two successive symbols.
                if (i > 1 && j > 1
                        && prevChar == word.charAt(i-2)
                        && upperChar == word.charAt(i-1)) {
                    currDist[i] = Math.min(currDist[i],
                                           upperDist[i-2] + 1);
                }
            }
            return currDist;
        };

        var trailer     = this.data,
            startDist   = new Array(),
            upperDist   = new Array(),
            suggestions = new Object(),
            queue       = new Queue();

        // Initialize default distance values.
        for (var i = 0; i <= word.length; ++i) startDist[i] = i;
        upperDist = startDist;

        // Start searching for candidate words using breadth-first search
        // to search the trie data structure.
        for (var node in trailer) {
            var accumulatedWord = node;

            // Push initial value to queue.
            queue.enqueue({
                current: {
                    char: node,
                    distance: startDist
                },
                previous: {
                    char: '',
                    distance: upperDist
                },
                accumulated: accumulatedWord,
                pointer: trailer[node],
                length: 1,
            });

            while (!queue.isEmpty()) {
                // Retrieve values from queues.
                var data        = queue.dequeue(),
                    newDistance = computeSubDistance(
                        data.current.char,
                        data.current.distance,
                        [data.current.distance[0] + 1],
                        data.previous.char,
                        data.previous.distance,
                        data.length
                    );

                // Check if the new node is a valid word, and we need to add the
                // accumulated word + new node (char) to the suggestions IF the
                // distance limit is not exceeded.
                if (data.pointer.end) {
                    // Check if current accumulated word (including new node (char))
                    // is over the limit, we'll add them to result list if NOT over
                    // the limit.
                    if (newDistance[word.length] <= limit && data.accumulated != word) {
                        // Add current word with it's distance value to result list.
                        suggestions[data.accumulated] = newDistance[word.length];
                    }
                }

                // If current distance's smallest value is over the limit, we'll
                // not enqueue the child node since it's certain that the child
                // node will NOT have distance value lower than the current node.
                if (Math.min.apply(null, newDistance) <= limit) {
                    // Search each child node, add them into queue where possible.
                    for (let newNode in data.pointer) {
                        // Enqueue all child node except for the 'end' property identifier.
                        if (newNode != 'end') {
                            queue.enqueue({
                                current: {
                                    char: newNode,
                                    distance: newDistance
                                },
                                previous: {
                                    char: data.current.char,
                                    distance: data.current.distance
                                },
                                accumulated: data.accumulated + newNode,
                                pointer: data.pointer[newNode],
                                length: data.length + 1,
                            });
                        }
                    }
                }
            }
        }

        return suggestions;
    }
};

module.exports = Trie;
