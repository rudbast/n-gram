'use strict';

/**
 * Compute levenshtein distance of given strings.
 *
 * @param  {string}  source Source string
 * @param  {string}  target Target string
 * @return {integer}        Distance value
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

    // for (var j = 0; j <= n; j++) {
    //     for (var i = 0; i <= m; i++) {
    //         if (i > 0) process.stdout.write(' ');
    //         process.stdout.write('' + dist[i][j]);
    //     }
    //     console.log();
    // }

    return dist[m][n];
}

/**
 * Compute levenshtein distance of given strings with distance threshold.
 *
 * @param  {string}  source    Source string
 * @param  {string}  target    Target string
 * @param  {integer} threshold Distance threshold
 * @return {integer}           Distance value
 */
var distanceOnThreshold = function (source, target, threshold) {
    const INT_MAX = 9;

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
    for (var i = 0; i <= Math.max(m, n); i++) {
        if (i <= threshold) {
            prev[i] = [i];
        } else {
            prev[i] = INT_MAX;
        }

        curr[i] = INT_MAX;
    }

    for (var j = 1; j <= n; j++) {
        curr[0] = j;

        var lower = Math.max(1, j - threshold);
        var upper = Math.min(prev.length, j + threshold + 1);

        if (lower > 1)
            curr[lower - 1] = INT_MAX;

        for (var i = lower; i < upper; i++) {
            var substCost = source.charAt(j-1) == target.charAt(i-1) ? 0 : 1;
            curr[i] = Math.min(prev[i-1] + substCost,
                               prev[i] + 1,
                               curr[i-1] + 1);
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

    return (prev[prev.length-1] == INT_MAX ? -1 : prev[prev.length-1]);
}

module.exports = {
    distance,
    distanceOnThreshold
};
