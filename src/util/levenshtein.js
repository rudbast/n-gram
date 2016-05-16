'use strict';

/**
 * Compute levenshtein distance of given strings.
 * @see https://en.wikipedia.org/wiki/Levenshtein_distance#Iterative_with_full_matrix
 *
 * @param  {String}  source Source string
 * @param  {String}  target Target string
 * @return {Integer}        Distance value
 */
var distance = function (source, target) {
    var m = source.length,
        n = target.length;

    var dist = [];

    for (var i = 0; i <= m; i++) dist[i] = [i];
    for (var j = 0; j <= n; j++) dist[0][j] = j;

    for (var j = 1; j <= n; j++) {
        for (var i = 1; i <= m; i++) {
            var substCost = source.charAt(i-1) == target.charAt(j-1) ? 0 : 1;
            dist[i][j] = Math.min(dist[i-1][j] + 1,
                                  dist[i][j-1] + 1,
                                  dist[i-1][j-1] + substCost);
        }
    }

    return dist[m][n];
}

/**
 * Compute levenshtein distance of given strings with distance threshold.
 * @see http://stackoverflow.com/a/5138114/3190026
 *
 * @param  {String}  source    Source string
 * @param  {String}  target    Target string
 * @param  {Integer} threshold Distance threshold
 * @return {Integer}           Distance value
 */
var distanceOnThreshold = function (source, target, threshold) {
    const INT_MAX = 2123123123;

    var m = source.length,
        n = target.length;

    if (n > m) {
        var temp = source;
        source = target;
        target = temp;

        var ltemp = m;
        m = n;
        n = ltemp;
    }

    var prev = [],
        curr = [],
        temp = [];

    // Pre-fill array.
    for (var i = 0; i <= n; i++) {
        if (i <= threshold) {
            prev[i] = [i];
        } else {
            prev[i] = INT_MAX;
        }

        curr[i] = INT_MAX;
    }

    for (var j = 1; j <= m; j++) {
        curr[0] = j;

        var lower = Math.max(1, j - threshold);
        var upper = Math.min(prev.length, j + threshold + 1);

        if (lower > 1)
            curr[lower - 1] = INT_MAX;

        for (var i = lower; i < upper; i++) {
            if (source.charAt(j-1) == target.charAt(i-1)) {
                curr[i] = prev[i-1];
            } else {
                curr[i] = Math.min(prev[i-1],
                                   prev[i],
                                   curr[i-1]) + 1;
            }
        }

        // for (var check = 0; check < curr.length; check++) {
        //     if (check > 0) process.stdout.write(' ');
        //     process.stdout.write(curr[check] + '');
        // }
        // console.log();

        temp = prev;
        prev = curr;
        curr = temp;
    }

    return (prev[n] == INT_MAX ? -1 : prev[n]);
}

/**
 * Compute optimal damerau-levenshtein distance of given strings.
 * @see https://en.wikipedia.org/wiki/Damerau%E2%80%93Levenshtein_distance#Optimal_string_alignment_distance
 *
 * @param  {String}  source Source string
 * @param  {String}  target Target string
 * @return {Integer}        Distance value
 */
var optimalDamerauDistance = function (source, target) {
    var m = source.length,
        n = target.length;

    var dist = [];

    for (var i = 0; i <= m; i++) dist[i] = [i];
    for (var j = 0; j <= n; j++) dist[0][j] = j;

    for (var j = 1; j <= n; j++) {
        for (var i = 1; i <= m; i++) {
            var substCost = source.charAt(i-1) == target.charAt(j-1) ? 0 : 1;
            dist[i][j] = Math.min(dist[i-1][j] + 1,
                                  dist[i][j-1] + 1,
                                  dist[i-1][j-1] + substCost);

            // Transposition between two successive symbols.
            if (i > 1 && j > 1
                    && source.charAt(i-1) == target.charAt(j-2)
                    && source.charAt(i-2) == target.charAt(j-1)) {
                dist[i][j] = Math.min(dist[i][j],
                                      dist[i-2][j-2] + 1);
            }
        }
    }

    return dist[m][n];
}

/**
 * Compute damerau-levenshtein distance of given strings.
 * @see https://en.wikipedia.org/wiki/Damerau%E2%80%93Levenshtein_distance#Distance_with_adjacent_transpositions
 *
 * @param  {String}  source Source string
 * @param  {String}  target Target string
 * @return {Integer}        Distance value
 */
function damerauDistance(source, target) {
    var dist = new Array(),
        da   = new Array();

    var m = source.length,
        n = target.length;

    for (var i = 0; i < 26; i++) da[i] = 0;
    // Initialize 2d array.
    for (var i = 0; i <= Math.max(m, n) + 1; i++) dist[i] = [];

    var maxDist = m + n;
    dist[0][0] = maxDist;
    for (var i = 0; i <= m; i++) {
        dist[i+1][0] = maxDist;
        dist[i+1][1] = i;
    }
    for (var j = 0; j <= n; j++) {
        dist[0][j+1] = maxDist;
        dist[1][j+1] = j;
    }

    for (var i = 1; i <= m; i++) {
        var db = 0;
        for (var j = 1; j <= n; j++) {
            var k = da[target.charCodeAt(j-1) - 97],
                l = db;

            var substCost;
            if (source.charAt(i-1) == target.charAt(j-1)) {
                substCost = 0;
                db        = j;
            } else {
                substCost = 1;
            }

            dist[i+1][j+1] = Math.min(dist[i][j] + substCost,
                                      dist[i+1][j] + 1,
                                      dist[i][j+1] + 1,
                                      dist[k][l] + (i - k - 1) + 1 + (j - l - 1));
        }
        da[source.charCodeAt(i-1) - 97] = i;
    }

    return dist[m+1][n+1];
}

module.exports = {
    distance,
    distanceOnThreshold,
    damerauDistance,
    optimalDamerauDistance
};
