/**
 * Extract list of Indonesian words from a webpage.
 *
 * @param {string} outputFile File output of the extracted words
 */

'use strict';

var _       = require('lodash'),
    request = require('request-promise'),
    cheerio = require('cheerio'),
    Promise = require('bluebird'),
    jsFile  = require('jsonfile'),
    assert  = require('assert');

const URL                 = 'http://kbbi.co.id/daftar-kata',
      PARAM_PAGE          = 'page',
      DEFAULT_OUTPUT_FILE = __dirname + '/../../res/vocabulary.json';

// Main.
main(process.argv.slice(2));

/**
 * Main logic container.
 *
 * @param {Array} args List of program's arguments
 */
function main(args) {
    var outputFile = _.isUndefined(args[0]) ? DEFAULT_OUTPUT_FILE : args[0],
        wordList   = new Array(),
        pageIndex  = 0;

    /**
     * Recursively scrap till empty data found.
     *
     * @param {Function} [callback] Callback function
     */
    function doScrap(callback) {
        scrap(++pageIndex).then(function (words) {
            console.log(`Scraped page: ${pageIndex}`);
            wordList = wordList.concat(words);

            if (_.isUndefined(words)) {
                if (_.isFunction(callback)) callback();
            } else {
                if (words.length > 0) {
                    doScrap(callback);
                } else {
                    if (_.isFunction(callback)) callback();
                }
            }
        });
    }

    doScrap(function () {
        outputToFile(outputFile, wordList, function () {
            console.log('Output file success');
        });
    });
}

/**
 * Scrape page from the defined URL and return the words list.
 *
 * @param  {number} pageIndex Current page of the URL
 * @return {Array}            Scrap result (words list)
 */
function scrap(pageIndex) {
    return Promise.resolve()
        .then(function () {
            return {
                uri: getCompleteURL(pageIndex),
                headers: { 'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/48.0.2564.97 Safari/537.36' },
                json: true
            };
        })
        .then(request)
        .then(getWordsList);
}

/**
 * Extract content (word) from a given page (HTML).
 *
 * @param  {string} htmlPage String scraped from the web page
 * @return {Array}           Words list
 */
function getWordsList(htmlPage) {
    var $     = cheerio.load(htmlPage),
        words = new Array();

    $('#main > .row ul > li').each(function (index, element) {
        var word = $(this).find('a').text();
        words.push(word);
    });

    return words;
}

/**
 * Get the complete URL of the web page along with the parameter: page's index.
 *
 * @param  {number} pageIndex Current page of the URL
 * @return {string}           Complete URL
 */
function getCompleteURL(pageIndex) {
    return `${URL}?${PARAM_PAGE}=${pageIndex}`;
}

/**
 * Output data to file.
 *
 * @param {string}   file       File name
 * @param {Array}    data       Data to be output to file
 * @param {Function} [callback] Callback function
 */
function outputToFile(file, data, callback) {
    jsFile.writeFile(file, data, {spaces: 4}, function (err) {
        assert.equal(err, null);

        if (_.isFunction(callback)) callback();
    });
}
